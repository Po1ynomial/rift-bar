import { readFile } from "node:fs/promises";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import { parse, VisitorKeys } from "espree";

export const root = fileURLToPath(new URL("../../", import.meta.url));

// Link real JSX modules without a renderer. Only JSX expressions become null;
// all imports, exports, module initialization, and command functions stay intact.
function stripJSX(source) {
  const ast = parse(source, {
    ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true },
  });
  const replacements = [];
  function visit(node) {
    if (node.type === "JSXElement" || node.type === "JSXFragment") {
      replacements.push([node.start, node.end]);
      return;
    }
    for (const key of VisitorKeys[node.type] || []) {
      const children = Array.isArray(node[key]) ? node[key] : [node[key]];
      for (const child of children) if (child) visit(child);
    }
  }
  visit(ast);
  for (const [start, end] of replacements.reverse()) {
    source = source.slice(0, start) + "null" + source.slice(end);
  }
  return source;
}

export const React = {
  memo: (component) => component,
  lazy: () => () => {},
  createContext: () => ({ Provider: () => {} }),
};

// A small JSX transform for element-tree assertions. This does not simulate a DOM.
function elementJSX(source) {
  const ast = parse(source, { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } });
  function js(node) {
    const replacements = [];
    function visit(child) {
      if (child.type === "JSXElement" || child.type === "JSXFragment") {
        replacements.push([child.start, child.end, element(child)]);
        return;
      }
      for (const key of VisitorKeys[child.type] || []) {
        const children = Array.isArray(child[key]) ? child[key] : [child[key]];
        for (const value of children) if (value) visit(value);
      }
    }
    visit(node);
    let result = source.slice(node.start, node.end);
    for (const [start, end, value] of replacements.reverse()) {
      result = result.slice(0, start - node.start) + value + result.slice(end - node.start);
    }
    return result;
  }
  function element(node) {
    const opening = node.openingElement;
    const name = opening ? source.slice(opening.name.start, opening.name.end) : "React.Fragment";
    const tag = /^[a-z]/.test(name) ? JSON.stringify(name) : name;
    const attributes = (opening?.attributes || []).map((attribute) => {
      if (attribute.type === "JSXSpreadAttribute") return `...${js(attribute.argument)}`;
      const value = !attribute.value ? "true" : attribute.value.type === "Literal"
        ? JSON.stringify(attribute.value.value) : js(attribute.value.expression);
      return `${JSON.stringify(attribute.name.name)}: ${value}`;
    });
    const children = node.children.flatMap((child) => {
      if (child.type === "JSXText") {
        const text = child.value.replace(/\s+/g, " ").trim();
        return text ? [JSON.stringify(text)] : [];
      }
      if (child.type === "JSXExpressionContainer") return child.expression.type === "JSXEmptyExpression" ? [] : [js(child.expression)];
      return [element(child)];
    });
    return `React.createElement(${tag}, {${attributes.join(",")}}${children.length ? `,${children.join(",")}` : ""})`;
  }
  return js(ast);
}

export async function loadModule(path, { globals = {}, mocks = {}, evaluate = true, jsx = false } = {}) {
  const context = createContext({ console, ...globals });
  const modules = new Map();
  async function load(filename) {
    if (!modules.has(filename)) {
      modules.set(filename, (async () => {
        let source = await readFile(filename, "utf8");
        if (filename.endsWith(".jsx")) source = jsx ? elementJSX(source) : stripJSX(source);
        return new SourceTextModule(source, { context, identifier: filename });
      })());
    }
    return modules.get(filename);
  }
  async function linker(specifier, referencingModule) {
    const absolute = specifier.startsWith(".")
      ? resolve(dirname(referencingModule.identifier), specifier)
      : specifier;
    const mock = mocks[absolute] ?? mocks[specifier];
    if (mock) {
      if (!modules.has(absolute)) {
        modules.set(absolute, new SyntheticModule(Object.keys(mock), function () {
          for (const [name, value] of Object.entries(mock)) this.setExport(name, value);
        }, { context, identifier: absolute }));
      }
      return modules.get(absolute);
    }
    if (!specifier.startsWith(".")) throw new Error(`Unmocked dependency: ${specifier}`);
    return load(extname(absolute) ? absolute : `${absolute}.js`);
  }
  const module = await load(resolve(root, path));
  await module.link(linker);
  if (evaluate) await module.evaluate();
  return { module, namespace: evaluate ? module.namespace : undefined, context };
}
