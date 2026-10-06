export function createHookHarness() {
  const slots = [];
  let cursor = 0,
    effects = [],
    writes = 0;
  const React = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        slots[index],
        (value) => {
          writes++;
          slots[index] = typeof value === "function" ? value(slots[index]) : value;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(fn, deps) {
      const index = cursor++;
      const old = slots[index];
      if (!old || deps.some((value, key) => !Object.is(value, old.deps[key]))) {
        effects.push(() => {
          old?.cleanup?.();
          slots[index] = { deps, cleanup: fn() };
        });
      }
    },
    useMemo(fn, deps) {
      const index = cursor++;
      const old = slots[index];
      if (!old || deps.some((value, key) => !Object.is(value, old.deps[key])))
        slots[index] = { deps, value: fn() };
      return slots[index].value;
    },
    useCallback(fn) {
      cursor++;
      return fn;
    },
  };
  return {
    React,
    get writes() {
      return writes;
    },
    render(fn, ...args) {
      cursor = 0;
      effects = [];
      const result = fn(...args);
      for (const effect of effects) effect();
      return result;
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.();
    },
  };
}
