import { readFileSync } from "node:fs";
import { checkLocality, readLocalities } from "./localities.mjs";

const example = new URL("../skills/ozimek-dashboard/assets/szczedrzyk.example.yaml", import.meta.url);
checkLocality(readFileSync(example, "utf8"), "szczedrzyk.yaml");
console.log(`Zweryfikowano przykład i ${readLocalities().length} konfiguracji miejscowości.`);
