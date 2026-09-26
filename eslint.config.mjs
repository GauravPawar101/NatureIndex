import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// eslint-config-next v16 ships a native flat config, so it is imported
// directly. Wrapping it in FlatCompat (as this file used to) made the eslintrc
// compat layer try to validate the plugin objects, which contain circular
// references — every lint run died with "Converting circular structure to JSON".
const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [".next/**", "node_modules/**"],
  },
];

export default eslintConfig;
