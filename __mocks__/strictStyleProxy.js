// CSS Modules in Jest. identity-obj-proxy returns any key it is asked for, so
// `styles.buton` renders class "buton" and every test still passes. This proxy
// returns the key too, but throws on anything that cannot be a class name, and
// is the hook a future registry check can extend. Architecture spec §8.1.
module.exports = new Proxy(
  {},
  {
    get(_target, key) {
      if (typeof key === "symbol" || key === "default" || key === "__esModule") return undefined;
      if (!/^[a-zA-Z][\w-]*$/.test(String(key))) {
        throw new Error(`Invalid CSS Module key: ${String(key)}`);
      }
      return String(key);
    },
  },
);
