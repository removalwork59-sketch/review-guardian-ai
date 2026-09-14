// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }: { mode: string }) => {
  // Server routes need non-VITE_ env vars (e.g. LOVABLE_API_KEY, service keys).
  // Load them into process.env for server-side code only — never into envDefine.
  const serverEnv = loadEnv(mode, rootDir, "");
  Object.assign(process.env, serverEnv);

  return {
    tanstackStart: {
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      // nitro/vite builds from this
      server: { entry: "server" },
    },
    vite: {
      resolve: {
        alias: {
          // React Email's htmlparser2 path needs entities v4.5.0; force the
          // hoisted copy so nested v7 copies never resolve.
          "entities/lib/decode.js": path.resolve(rootDir, "node_modules/entities/lib/decode.js"),
          "entities/lib/encode.js": path.resolve(rootDir, "node_modules/entities/lib/encode.js"),
          entities: path.resolve(rootDir, "node_modules/entities"),
        },
      },
    },
  };
});
