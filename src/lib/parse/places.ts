/**
 * 都道府県別集計表（xlsx）と、年間 PDF の【参考2】。
 *
 * xlsx の表1-1が訪問者数と消費単価、表1-3が旅行消費額と費目。全目的・47都道府県。
 * 三大都市圏・地方部の行は使わない。
 */

import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { PREFECTURES } from "../data/labels.ts";
import { PLACE_CATEGORIES, type PlaceDoc } from "../data/sources.ts";
import { pdfText } from "./report.ts";
import type { PlacePeriod, PlaceRow } from "./types.ts";

type Cell = string | number | boolean | null | undefined;

function clean(value: Cell): string {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s/g, "");
}

function placeOf(raw: Cell): string | null {
  const name = clean(raw);
  if (name === "") return null;
  return PREFECTURES.find((p) => name === p || name.startsWith(p)) ?? null;
}

function num(value: Cell, where: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const s = clean(value).replace(/,/g, "");
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`${where}: 数でない「${value}」`);
  return n;
}

function sheetOf(book: XLSX.WorkBook, mark: string): Cell[][] {
  const name = book.SheetNames.find((n) => n.replace(/\s/g, "") === mark);
  const sheet = name === undefined ? undefined : book.Sheets[name];
  if (sheet === undefined) throw new Error(`シートがない: ${mark}`);
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
}

function periodOf(rows: Cell[][], doc: PlaceDoc): void {
  const text = rows
    .slice(0, 8)
    .flat()
    .map((c) => clean(c))
    .join("");
  const heisei = text.match(/平成(\d+)年/);
  const reiwa = text.match(/令和(?:元年|(\d+)年)/);
  const year = heisei !== null ? 1988 + Number(heisei[1]) : reiwa !== null ? 2018 + Number(reiwa[1] ?? 1) : null;
  if (year !== doc.year) throw new Error(`${doc.period}: 表が ${year}年`);
  const q = text.includes("1-3月期") || text.includes("1〜3月期") ? 1 : text.includes("4-6月期") || text.includes("4〜6月期") ? 2 : null;
  if (q !== doc.quarter) throw new Error(`${doc.period}: 表の期が ${q}`);
}

function colOf(header: string[], pred: (label: string) => boolean, where: string): number {
  const c = header.findIndex(pred);
  if (c < 0) throw new Error(`${where}: 列がない`);
  return c;
}

function headerOf(rows: Cell[][], pred: (labels: string[]) => boolean): string[] {
  const row = rows.find((r) => pred(r.map((c) => clean(c))));
  if (row === undefined) throw new Error("見出し行がない");
  return row.map((c) => clean(c));
}

function readVisitors(rows: Cell[][], where: string): Map<string, { visitors: number; unit: number }> {
  const header = headerOf(rows, (labels) => labels.some((l) => l.startsWith("訪問者数")) && labels.some((l) => l.startsWith("消費単価")));
  const cVisit = colOf(header, (l) => l.startsWith("訪問者数"), `${where} 訪問者数`);
  const cUnit = colOf(header, (l) => l.startsWith("消費単価"), `${where} 消費単価`);
  const out = new Map<string, { visitors: number; unit: number }>();
  for (const r of rows) {
    const name = r.map((c) => placeOf(c)).find((p) => p !== null);
    if (name === undefined || name === null || out.has(name)) continue;
    out.set(name, { visitors: num(r[cVisit], `${where} ${name} 訪問者数`), unit: num(r[cUnit], `${where} ${name} 消費単価`) });
  }
  return out;
}

function readSpending(rows: Cell[][], where: string): Map<string, { total: number; values: number[] }> {
  const header = headerOf(rows, (labels) => labels.some((l) => l.startsWith("宿泊")) && labels.some((l) => l.startsWith("飲食")));
  const cPack = colOf(header, (l) => l.includes("団体") || l.includes("パック"), `${where} 団体・パック`);
  const cStay = colOf(header, (l) => l.startsWith("宿泊"), `${where} 宿泊費`);
  const cFood = colOf(header, (l) => l.startsWith("飲食"), `${where} 飲食費`);
  const cMove = colOf(header, (l) => l.startsWith("交通"), `${where} 交通費`);
  const cPlay = colOf(header, (l) => l.startsWith("娯楽"), `${where} 娯楽`);
  const cShop = colOf(header, (l) => l.startsWith("買物"), `${where} 買物代`);
  const cOther = colOf(header, (l) => l === "その他", `${where} その他`);
  const cols = [cPack, cStay, cFood, cMove, cPlay, cShop, cOther];
  const out = new Map<string, { total: number; values: number[] }>();
  for (const r of rows) {
    const name = r.map((c) => placeOf(c)).find((p) => p !== null);
    if (name === undefined || name === null || out.has(name)) continue;
    const values = cols.map((c, i) => num(r[c], `${where} ${name} ${PLACE_CATEGORIES[i]}`));
    const totalCol = r.findIndex((c, i) => i > 0 && i < Math.min(...cols) && typeof c === "number");
    const total = totalCol >= 0 ? num(r[totalCol], `${where} ${name} 総額`) : values.reduce((a, b) => a + b, 0);
    out.set(name, { total, values });
  }
  return out;
}

export function readPlacePeriod(doc: PlaceDoc, path: string): PlacePeriod {
  const book = XLSX.read(readFileSync(path));
  const visitorsSheet = sheetOf(book, "表1-1");
  const spendingSheet = sheetOf(book, "表1-3");
  periodOf(visitorsSheet, doc);
  periodOf(spendingSheet, doc);
  const visitors = readVisitors(visitorsSheet, doc.period);
  const spending = readSpending(spendingSheet, doc.period);
  const rows: PlaceRow[] = PREFECTURES.map((name) => {
    const v = visitors.get(name);
    const s = spending.get(name);
    if (v === undefined || s === undefined) throw new Error(`${doc.period}: ${name} がない`);
    return { name, visitors: v.visitors, unit: v.unit, total: s.total, values: s.values };
  });
  return { period: doc.period, year: doc.year, quarter: doc.quarter, status: doc.status, rows };
}

const NUM = /\d{1,3}(?:,\d{3})*(?:\.\d+)?/g;

/** 年間 PDF の【参考2】。xlsx の四捨五入と照合する。 */
export function readReference2(path: string): Map<string, { visitors: number; unit: number; total: number }> {
  const text = pdfText(path);
  const start = text.search(/【参考2】\s*都道府県別/);
  if (start < 0) throw new Error(`${path}: 【参考2】がない`);
  const end = text.indexOf("注1", start);
  const block = text.slice(start, end < 0 ? undefined : end);
  const out = new Map<string, { visitors: number; unit: number; total: number }>();
  for (const line of block.split("\n")) {
    let i = 0;
    while (i < line.length) {
      const slice = line.slice(i);
      const name = PREFECTURES.filter((p) => slice.includes(p)).sort((a, b) => slice.indexOf(a) - slice.indexOf(b))[0];
      if (name === undefined) break;
      const at = i + slice.indexOf(name);
      const after = line.slice(at + name.length);
      const matches = [...after.matchAll(NUM)].slice(0, 4);
      if (matches.length < 3) break;
      const nums = matches.map((m) => Number(m[0].replace(/,/g, "")));
      out.set(name, { visitors: nums[0]!, unit: nums[1]!, total: nums[2]! });
      const last = matches.at(-1)!;
      i = at + name.length + (last.index ?? 0) + last[0].length;
    }
  }
  for (const name of PREFECTURES) {
    if (!out.has(name)) throw new Error(`${path}: 参考2に ${name} がない`);
  }
  return out;
}
