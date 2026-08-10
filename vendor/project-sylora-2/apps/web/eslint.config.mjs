import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    rules: {
      // Client panels intentionally load API state on mount via BFF.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
