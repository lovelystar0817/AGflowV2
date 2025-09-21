import path from "node:path";
import { pathToFileURL } from "node:url";

const baseDir = path.resolve(new URL(".", import.meta.url).pathname, "modules");

const stubMap = {
  "chrono-node": pathToFileURL(path.join(baseDir, "chrono-node/index.js")).href,
  "libphonenumber-js": pathToFileURL(path.join(baseDir, "libphonenumber-js/index.js")).href,
  "email-validator": pathToFileURL(path.join(baseDir, "email-validator/index.js")).href,
};

export async function resolve(specifier, context, defaultResolve) {
  if (specifier in stubMap) {
    return {
      url: stubMap[specifier],
      shortCircuit: true,
    };
  }

  return defaultResolve(specifier, context, defaultResolve);
}
