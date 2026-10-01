/**
 * 公表資料の PDF を `pdftotext -layout` で読み、国籍・地域別の表を取り出す。
 *
 * 表は見出し（sources.ts の anchor）の後で最初に現れる「全国籍」の行から「その他」の行まで。
 * 各行は国名と数値の並び。桁区切り整数だけを数え、伸び率（%）・構成比・小数（万人）は除く。
 * 2020年・2025年の表は左端に縦書きの「一般客」が1字ずつ入るので、国名の前の1字は捨てる。
 */

import { execFileSync } from "node:child_process";
import { CATEGORIES, TOTAL, type PerCapitaTable, type SourceDoc } from "../data/sources.ts";
import type { CategoryRow, PerCapitaRow, SpendingDoc } from "./types.ts";

const INT = /^\d{1,3}(?:,\d{3})*$/;
const int = (s: string) => Number(s.replace(/,/g, ""));
const VERTICAL = new Set(["一", "般", "客"]);

export function pdfText(path: string, repairs: [string, string][] = []): string {
  let text = execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8", maxBuffer: 64 << 20 });
  for (const [broken, fixed] of repairs) {
    if (!text.includes(broken)) throw new Error(`補正の対象「${broken}」が見つからない: ${path}`);
    text = text.replace(broken, fixed);
  }
  return text;
}

function cleanName(name: string): string {
  const n = name.replace(/･/g, "・");
  return n === "全国籍" || n.startsWith("全国籍・地域") ? TOTAL : n;
}

interface Row {
  name: string;
  ints: number[];
}

function parseLine(line: string): Row | null {
  const tokens = line.trim().split(/\s+/);
  while (tokens.length > 1 && VERTICAL.has(tokens[0]!)) tokens.shift();
  const [name, ...rest] = tokens;
  if (name === undefined || INT.test(name)) return null;
  const ints = rest.filter((t) => INT.test(t)).map(int);
  return ints.length === 0 ? null : { name: cleanName(name), ints };
}

/** 見出しの後の「全国籍」から「その他」までの行。 */
function tableRows(text: string, anchor: RegExp, where: string): Row[] {
  const m = anchor.exec(text);
  if (m === null) throw new Error(`${where}: 見出し ${anchor} がない`);
  const lines = text.slice(m.index).split("\n");
  const start = lines.findIndex((l) => parseLine(l)?.name === TOTAL);
  if (start < 0) throw new Error(`${where}: 見出しの後に「${TOTAL}」の行がない`);
  const rows: Row[] = [];
  for (const line of lines.slice(start)) {
    const row = parseLine(line);
    if (row === null) continue;
    rows.push(row);
    if (row.name === "その他") return rows;
  }
  throw new Error(`${where}: 「その他」の行で表が終わらない`);
}

const HEADER_LABELS = ["宿泊", "飲食", "交通", "娯楽", "買物", "その他"];

/**
 * 費目の並びが CATEGORIES と同じであることを見出しで確かめる。
 * 見出しは複数行に折り返すので、行の中の位置（左から何文字目か）で並びを見る。
 */
function checkCategoryHeader(text: string, anchor: RegExp, where: string): void {
  const m = anchor.exec(text)!;
  const head = text.slice(m.index, text.indexOf(TOTAL.slice(0, 3), m.index)).split("\n");
  const columns = HEADER_LABELS.map((label) => {
    const line = head.find((l) => l.includes(label));
    if (line === undefined) throw new Error(`${where}: 費目の見出しに「${label}」がない`);
    return line.indexOf(label);
  });
  if (columns.some((c, i) => i > 0 && c <= columns[i - 1]!)) {
    throw new Error(`${where}: 費目の見出しが ${HEADER_LABELS.join("・")} の順に並んでいない`);
  }
}

function parseByCategory(text: string, anchor: RegExp, where: string): CategoryRow[] {
  checkCategoryHeader(text, anchor, where);
  return tableRows(text, anchor, where).map(({ name, ints }) => {
    if (ints.length !== CATEGORIES.length + 1) {
      throw new Error(`${where} ${name}: 費目別の数値が ${ints.length} 個（総額＋6費目の7個のはず）`);
    }
    const [total, ...values] = ints;
    return { name, total: total!, values };
  });
}

function parsePerCapita(text: string, table: PerCapitaTable, where: string): PerCapitaRow[] {
  const need = Math.max(table.perCapita, table.visitors ?? 0, table.total ?? 0) + 1;
  return tableRows(text, table.anchor, where).map(({ name, ints }) => {
    if (ints.length < need) throw new Error(`${where} ${name}: 1人当たりの表の数値が ${ints.length} 個`);
    return {
      name,
      perCapita: ints[table.perCapita]!,
      visitors: table.visitors === undefined ? null : ints[table.visitors]!,
      total: table.total === undefined ? null : ints[table.total]!,
    };
  });
}

export function parseDoc(doc: SourceDoc, path: string): SpendingDoc {
  const where = doc.period;
  const text = pdfText(path, doc.repairs);
  const byCategory = doc.byCategory === undefined ? null : parseByCategory(text, doc.byCategory, where);
  const perCapita = doc.perCapita === undefined ? null : parsePerCapita(text, doc.perCapita, where);

  const match = (pattern: RegExp, label: string) => {
    const m = pattern.exec(text);
    if (m === null) throw new Error(`${where}: ${label} ${pattern} が本文にない`);
    return int(m[1]!);
  };
  const categoryTotal = byCategory?.find((r) => r.name === TOTAL);
  const perCapitaTotal = perCapita?.find((r) => r.name === TOTAL);

  const overall =
    doc.overall === undefined ? (categoryTotal?.total ?? perCapitaTotal?.total) : match(doc.overall, "総額");
  if (overall == null) throw new Error(`${where}: 総額を決められない`);
  const overallPerCapita =
    doc.overallPerCapita === undefined
      ? (perCapitaTotal?.perCapita ?? null)
      : match(doc.overallPerCapita, "1人当たり旅行支出");

  return {
    period: doc.period,
    year: doc.year,
    quarter: doc.quarter,
    status: doc.status,
    overall,
    overallPerCapita,
    byCategory,
    perCapita,
  };
}
