import { readFileSync } from "node:fs";
import { checkLocality, readLocalities, readPszok } from "./localities.mjs";

const example = new URL("../skills/ozimek-dashboard/assets/szczedrzyk.example.yaml", import.meta.url);
checkLocality(readFileSync(example, "utf8"), "szczedrzyk.yaml");
const points = readPszok();
console.log(`Zweryfikowano przykład, ${readLocalities().length} konfiguracji miejscowości i dane PSZOK (${points.size}).`);
