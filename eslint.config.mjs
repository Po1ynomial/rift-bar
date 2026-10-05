// Lint the widget, bundled-runtime scripts, and regression tests.
import js from "@eslint/js";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      // Base ESLint recommended rules
      ...js.configs.recommended.rules,

      // React recommended rules
      ...reactPlugin.configs.recommended.rules,

      // React hooks recommended rules
      ...reactHooks.configs.recommended.rules,

      // Your custom rules
      "no-console": "warn",
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/immutability": "off",
      "react/no-unescaped-entities": "off",
    },
    settings: {
      react: {
        version: "18.0",
      },
    },
  },
  {
    files: ["tests/**/*.mjs", "lib/scripts/**/*.mjs", "eslint.config.mjs"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "no-console": "off",
    },
  },
];
