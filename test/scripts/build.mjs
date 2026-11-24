import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { readLocalities } from "./localities.mjs";

const configFile = fileURLToPath(new URL("../vite.config.ts", import.meta.url));
const output = new URL("../dist/", import.meta.url);
const localities = readLocalities();
await build({ configFile });

const template = await readFile(new URL("index.html", output), "utf8");
const escapeHtml = value => value.replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

await Promise.all(localities.map(async ({ name, slug }) => {
  const directory = new URL(`${slug}/`, output);
  const title = escapeHtml(`${name} · Dashboard miejscowości`);
  const description = escapeHtml(`Pogoda, powietrze, stany wód i terminy odbioru odpadów. ${name}, gmina Ozimek.`);
  const html = template.replace(/<title>.*?<\/title>/, () => `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, (_, start) => start + description);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("index.html", directory), html);
}));
console.log(`Zbudowano katalog i ${localities.length} stron miejscowości.`);
