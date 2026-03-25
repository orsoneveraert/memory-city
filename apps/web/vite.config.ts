import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function normalizeBase(basePath: string): string {
  if (basePath === "/" || basePath === "") {
    return "/";
  }

  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function resolvePagesBase(): string {
  const explicitBase = process.env.PUBLIC_BASE_PATH ?? process.env.VITE_BASE_PATH;
  if (explicitBase) {
    return normalizeBase(explicitBase);
  }

  const repositorySlug = process.env.GITHUB_REPOSITORY;
  if (!repositorySlug) {
    return "/";
  }

  const repositoryName = repositorySlug.split("/")[1];
  if (!repositoryName || repositoryName.endsWith(".github.io")) {
    return "/";
  }

  return normalizeBase(repositoryName);
}

export default defineConfig({
  plugins: [react()],
  base: resolvePagesBase(),
  server: {
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          three: ["three", "@react-three/fiber", "@react-three/drei"]
        }
      }
    }
  }
});
