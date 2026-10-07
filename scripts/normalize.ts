/**
 * data/raw の PDF を読み、資料ごとの表を data/normalized/docs.json に書き出す。
 *
 *   npm run normalize
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DOCS, PLACE_DOCS } from "../src/lib/data/sources.ts";
import { readPlacePeriod } from "../src/lib/parse/places.ts";
import { parseDoc } from "../src/lib/parse/report.ts";
import { placePath, rawPath } from "./fetch-data.ts";

const OUT_DIR = resolve(import.meta.dirname, "../data/normalized");

const docs = DOCS.map((doc) => parseDoc(doc, rawPath(doc)));
for (const d of docs) {
  console.log(
    `  ${d.period.padEnd(7)} 総額 ${String(d.overall).padStart(6)}億円` +
      `  費目別 ${String(d.byCategory?.length ?? "-").padStart(2)}行` +
      `  1人当たり ${String(d.perCapita?.length ?? "-").padStart(2)}行`,
  );
}

const places = PLACE_DOCS.map((doc) => readPlacePeriod(doc, placePath(doc)));
for (const p of places) {
  const total = p.rows.reduce((a, r) => a + r.total, 0);
  console.log(`  ${p.period.padEnd(7)} 都道府県 ${total.toFixed(0).padStart(6)}億円`);
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(resolve(OUT_DIR, "docs.json"), `${JSON.stringify(docs, null, 1)}\n`);
await writeFile(resolve(OUT_DIR, "places.json"), `${JSON.stringify(places, null, 1)}\n`);
