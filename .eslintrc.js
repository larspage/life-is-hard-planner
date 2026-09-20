/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["next/core-web-vitals"],
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "dist/",
    "coverage/",
    "next-env.d.ts",
  ],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
  },
};
