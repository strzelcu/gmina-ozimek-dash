import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/postcss";
import { readLocalities, localityDirectory } from "./scripts/localities.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const repositoryBase = (process.env.PAGES_BASE_PATH ?? "/szczedrzyk/").replace(/\/+$/, "");
const localitiesModule = "virtual:ozimek-localities";

export default defineConfig({
  root,
  base: `${repositoryBase}/test/`,
  plugins: [
    react(),
    {
      name: "ozimek-localities",
      resolveId(id) {
        if (id === localitiesModule) return `\0${id}`;
      },
      load(id) {
        if (id !== `\0${localitiesModule}`) return;
        this.addWatchFile(localityDirectory);
        return `export default ${JSON.stringify(readLocalities())};`;
      },
    },
  ],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
});
