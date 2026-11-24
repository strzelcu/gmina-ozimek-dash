import { mkdir, writeFile } from "node:fs/promises";
import { readLocalities } from "./localities.mjs";
import { fetchJSON } from "./lib/environment-data.ts";
import { dataSources, loadSource } from "./lib/sources.ts";

const requests = new Map();
function sharedJSON(url) {
  if (!requests.has(url)) requests.set(url, fetchJSON(url));
  return requests.get(url);
}

const localities = readLocalities();
const totals = await Promise.all(localities.map(async locality => {
  const output = new URL(`../public/data/${locality.slug}/`, import.meta.url);
  await mkdir(output, { recursive: true });
  const results = await Promise.all(dataSources.map(async source => {
    try {
      const data = await loadSource(locality, source, sharedJSON);
      await writeFile(new URL(`${source}.json`, output), JSON.stringify(data));
      return 1;
    } catch (error) {
      console.warn(`${locality.slug}/${source} — ${error.message}`);
      return 0;
    }
  }));
  return results.reduce((sum, successful) => sum + successful, 0);
}));
console.log(`Zapisano ${totals.reduce((sum, count) => sum + count, 0)} zestawów danych startowych dla ${localities.length} miejscowości.`);
