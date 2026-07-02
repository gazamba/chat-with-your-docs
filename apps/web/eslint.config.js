import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    rules: {
      // Types already enforce component props in this TS project.
      "react/prop-types": "off",
    },
  },
];
