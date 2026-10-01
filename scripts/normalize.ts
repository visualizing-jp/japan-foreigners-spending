/**
 * data/raw の PDF を読み、資料ごとの表を data/normalized/docs.json に書き出す。
 *
 *   npm run normalize
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DOCS } from "../src/lib/data/sources.ts";
import { parseDoc } from "../src/lib/parse/report.ts";
import { rawPath } from "./fetch-data.ts";

const OUT_DIR = resolve(import.meta.dirname, "../data/normalized");

const docs = DOCS.map((doc) => parseDoc(doc, rawPath(doc)));
for (const d of docs) {
  console.log(
    `  ${d.period.padEnd(7)} 総額 ${String(d.overall).padStart(6)}億円` +
      `  費目別 ${String(d.byCategory?.length ?? "-").padStart(2)}行` +
      `  1人当たり ${String(d.perCapita?.length ?? "-").padStart(2)}行`,
  );
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(resolve(OUT_DIR, "docs.json"), `${JSON.stringify(docs, null, 1)}\n`);
