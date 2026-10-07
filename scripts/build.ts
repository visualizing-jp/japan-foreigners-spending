/**
 * 正規化 JSON（data/normalized/docs.json）だけを入力に、配信データを public/data/ に書き出す。
 * 当年の四半期は足し合わせて1列にする（消費額は足せるが、1人当たり支出は足せないので出さない）。
 *
 *   npm run data
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { SpendingJson } from "../src/lib/data/cube.ts";
import { PREFECTURES } from "../src/lib/data/labels.ts";
import { CATEGORIES, PLACE_CATEGORIES, TOTAL } from "../src/lib/data/sources.ts";
import type { PlacePeriod, SpendingDoc } from "../src/lib/parse/types.ts";

const IN_PATH = resolve(import.meta.dirname, "../data/normalized/docs.json");
const PLACES_PATH = resolve(import.meta.dirname, "../data/normalized/places.json");
const OUT_DIR = resolve(import.meta.dirname, "../public/data");

const docs = JSON.parse(await readFile(IN_PATH, "utf8")) as SpendingDoc[];
const places = JSON.parse(await readFile(PLACES_PATH, "utf8")) as PlacePeriod[];
const years = [...new Set(docs.map((d) => d.year))];
const docsOf = (year: number) => docs.filter((d) => d.year === year);

/** 最新の資料の並びを基本に、古い資料にしかない名前をその位置の近くに差し込む。 */
function nameOrder(): string[] {
  const order: string[] = [];
  for (const d of [...docs].reverse()) {
    const rows = (d.byCategory ?? d.perCapita ?? []).map((r) => r.name);
    rows.forEach((name, i) => {
      if (order.includes(name)) return;
      const prev = rows.slice(0, i).reverse().find((p) => order.includes(p));
      order.splice(prev === undefined ? 0 : order.indexOf(prev) + 1, 0, name);
    });
  }
  return order;
}

/** 四半期の値を足す。1つでも欠ければ null。 */
function sumAll(values: (number | undefined)[]): number | null {
  return values.length === 0 || values.some((v) => v === undefined) ? null : values.reduce((a, b) => a! + b!, 0)!;
}

const names = nameOrder();
if (names[0] !== TOTAL) throw new Error(`先頭が ${TOTAL} でない: ${names[0]}`);

function totalOf(name: string, year: number): number | null {
  const ds = docsOf(year);
  if (name === TOTAL) return sumAll(ds.map((d) => d.overall));
  return sumAll(
    ds.map((d) => (d.byCategory ?? d.perCapita ?? []).find((r) => r.name === name)?.total ?? undefined),
  );
}

function perCapitaOf(name: string, year: number): number | null {
  const ds = docsOf(year);
  if (ds.length !== 1) return null;
  const d = ds[0]!;
  return name === TOTAL ? d.overallPerCapita : (d.perCapita?.find((r) => r.name === name)?.perCapita ?? null);
}

function categoryOf(ci: number, name: string, year: number): number | null {
  const ds = docsOf(year);
  if (ds.some((d) => d.byCategory === null)) return null;
  return sumAll(ds.map((d) => d.byCategory!.find((r) => r.name === name)?.values[ci]));
}

const prefYears = [...new Set(places.map((p) => p.year))];
const placesOf = (year: number) => places.filter((p) => p.year === year);

function placeTotal(pref: string, year: number): number {
  return sumAll(placesOf(year).map((p) => p.rows.find((r) => r.name === pref)?.total))!;
}

function placeVisitorsOf(pref: string, year: number): number {
  return sumAll(placesOf(year).map((p) => p.rows.find((r) => r.name === pref)?.visitors))!;
}

function placeCategoryOf(ci: number, pref: string, year: number): number {
  return sumAll(placesOf(year).map((p) => p.rows.find((r) => r.name === pref)?.values[ci]))!;
}

const json: SpendingJson = {
  years,
  status: years.map((y) => docsOf(y)[0]!.status),
  months: years.map((y) => {
    const ds = docsOf(y);
    return ds[0]!.quarter === null ? 12 : ds.length * 3;
  }),
  names,
  total: names.map((n) => years.map((y) => totalOf(n, y))),
  perCapita: names.map((n) => years.map((y) => perCapitaOf(n, y))),
  categories: [...CATEGORIES],
  byCategory: CATEGORIES.map((_, ci) => names.map((n) => years.map((y) => categoryOf(ci, n, y)))),
  prefYears,
  prefectures: [...PREFECTURES],
  placeCategories: [...PLACE_CATEGORIES],
  byPrefecture: PREFECTURES.map((pref) => prefYears.map((y) => placeTotal(pref, y))),
  placeCategory: PLACE_CATEGORIES.map((_, ci) => PREFECTURES.map((pref) => prefYears.map((y) => placeCategoryOf(ci, pref, y)))),
  placeVisitors: PREFECTURES.map((pref) => prefYears.map((y) => placeVisitorsOf(pref, y))),
};

await mkdir(OUT_DIR, { recursive: true });
const text = JSON.stringify(json);
await writeFile(resolve(OUT_DIR, "spending.json"), text);
console.log(`  spending.json  ${(Buffer.byteLength(text) / 1024).toFixed(1)} KB  ${years[0]}–${years.at(-1)}  ${names.length}行`);
