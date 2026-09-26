import js from "@eslint/js";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["node_modules", "coverage", "generated"]),
  {
    files: ["**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
]);
