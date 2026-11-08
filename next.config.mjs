import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  webpack: (config) => {
    config.resolve.alias["@"] = path.join(root, "src");
    return config;
  },
  outputFileTracingIncludes: {
    "/*": ["./seeds/**/*"],
    "/games/*": ["./seeds/**/*"],
    "/api/games": ["./seeds/**/*"],
    "/api/games/*/play": ["./seeds/**/*"],
  },
};

export default nextConfig;
