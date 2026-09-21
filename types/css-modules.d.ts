/**
 * Ambient module declaration for `*.module.css` imports. Without this, the
 * TypeScript compiler resolves `styles.foo` as `string | undefined` because
 * of `noUncheckedIndexedAccess: true`. The declaration here treats CSS
 * Modules as `Record<string, string>` — runtime access returns `undefined`
 * for missing classes, but TS callers don't need to narrow on every use.
 */

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "*.module.scss" {
  const classes: Record<string, string>;
  export default classes;
}
