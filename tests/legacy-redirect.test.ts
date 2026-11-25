import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the legacy Szczedrzyk address redirects to the official locality dashboard", () => {
  const target = "https://strzelcu.github.io/gmina-ozimek/szczedrzyk/";
  const html = readFileSync(new URL("../redirect/index.html", import.meta.url), "utf8");

  assert.ok(html.includes(`<meta http-equiv="refresh" content="0; url=${target}"`));
  assert.ok(html.includes(`<link rel="canonical" href="${target}"`));
  assert.ok(html.includes(`<a href="${target}">`));
});
