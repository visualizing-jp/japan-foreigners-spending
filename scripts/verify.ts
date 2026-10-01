/**
 * 正規化 JSON の内部整合を確かめる。食い違いが1つでもあれば終了コード 1。
 *
 * - 費目別: 6費目の和 = 総額、国籍・地域の和 = 全国籍（総額・費目ごと）
 * - 1人当たり: 1人当たり支出 × 旅行者数 = 消費額、国籍・地域の和 = 全国籍
 * - 2017年以前は2表の国籍・地域別の消費額が一致する（2018年以降、1人当たりの表は一般客だけ）
 *
 * 表の値は億円・円に四捨五入されているので、足し合わせる項目の数の半分まで差を許す。
 *
 *   npm run verify
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CATEGORIES, TOTAL } from "../src/lib/data/sources.ts";
import type { SpendingDoc } from "../src/lib/parse/types.ts";

const docs = JSON.parse(
  await readFile(resolve(import.meta.dirname, "../data/normalized/docs.json"), "utf8"),
) as SpendingDoc[];

let checks = 0;
const failures: string[] = [];
function expect(ok: boolean, message: string): void {
  checks++;
  if (!ok) failures.push(message);
}
const near = (a: number, b: number, terms: number) => Math.abs(a - b) <= Math.ceil(terms / 2);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function checkRows(where: string, names: string[]): void {
  expect(names[0] === TOTAL, `${where}: 先頭が ${TOTAL} でない`);
  expect(names.at(-1) === "その他", `${where}: 末尾が その他 でない`);
  expect(new Set(names).size === names.length, `${where}: 国籍・地域の名前が重複する`);
}

for (const d of docs) {
  if (d.byCategory !== null) {
    const where = `${d.period} 費目別`;
    const [total, ...rows] = d.byCategory;
    checkRows(where, d.byCategory.map((r) => r.name));
    for (const r of d.byCategory) {
      expect(near(sum(r.values), r.total, CATEGORIES.length), `${where} ${r.name}: 費目の和 ${sum(r.values)} ≠ 総額 ${r.total}`);
    }
    const s = sum(rows.map((r) => r.total));
    expect(near(s, total!.total, rows.length), `${where}: 国籍・地域の和 ${s} ≠ 全国籍 ${total!.total}`);
    CATEGORIES.forEach((c, ci) => {
      const sc = sum(rows.map((r) => r.values[ci]!));
      expect(near(sc, total!.values[ci]!, rows.length), `${where} ${c}: 国籍・地域の和 ${sc} ≠ 全国籍 ${total!.values[ci]}`);
    });
  }

  if (d.perCapita !== null) {
    const where = `${d.period} 1人当たり`;
    const [total, ...rows] = d.perCapita;
    checkRows(where, d.perCapita.map((r) => r.name));
    for (const r of d.perCapita) {
      if (r.visitors === null || r.total === null) continue;
      // 2010年の全国籍は 4–12月の平均支出で、暦年の消費額は国籍・地域別に1–3月を補って合算した値。
      if (d.year === 2010 && r.name === TOTAL) continue;
      const product = (r.perCapita * r.visitors) / 1e8;
      expect(Math.abs(product - r.total) <= 1, `${where} ${r.name}: ${r.perCapita}円 × ${r.visitors}人 = ${product.toFixed(1)}億円 ≠ ${r.total}`);
    }
    if (total!.total !== null) {
      const s = sum(rows.map((r) => r.total!));
      expect(near(s, total!.total, rows.length), `${where}: 国籍・地域の和 ${s} ≠ 全国籍 ${total!.total}`);
    }
  }

  if (d.byCategory !== null && d.perCapita !== null && d.year <= 2017) {
    for (const r of d.perCapita) {
      const c = d.byCategory.find((x) => x.name === r.name);
      expect(c !== undefined && c.total === r.total, `${d.period} ${r.name}: 2表の消費額が違う（費目別 ${c?.total} / 1人当たり ${r.total}）`);
    }
  }

  expect(d.overall > 0, `${d.period}: 総額がない`);
}

const years = [...new Set(docs.map((d) => d.year))];
expect(
  years.every((y, i) => i === 0 || y === years[i - 1]! + 1),
  `年が連続しない: ${years.join(",")}`,
);

if (failures.length > 0) {
  console.error(failures.map((f) => `  ✗ ${f}`).join("\n"));
  console.error(`${failures.length} / ${checks} 件が食い違い`);
  process.exit(1);
}
console.log(`  ✓ ${checks} 件の検算がすべて一致`);
