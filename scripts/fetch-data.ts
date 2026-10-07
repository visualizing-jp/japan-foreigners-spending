/**
 * sources.ts の公表資料を data/raw/{period}.pdf と都道府県の表へ落とす。
 * 既にあるファイルは取り直さない。資料の差し替えを取り込むときは --force。
 *
 *   npm run fetch
 *   npm run fetch -- --force
 */

import { mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DOCS, PLACE_DOCS, type PlaceDoc } from "../src/lib/data/sources.ts";

const RAW_DIR = resolve(import.meta.dirname, "../data/raw");

export function rawPath(doc: { period: string }): string {
  return resolve(RAW_DIR, `${doc.period}.pdf`);
}

export function placePath(doc: PlaceDoc): string {
  return resolve(RAW_DIR, `${doc.period}-pref.xlsx`);
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function download(url: string, where: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${where}: ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  await mkdir(RAW_DIR, { recursive: true });
  for (const doc of DOCS) {
    const path = rawPath(doc);
    if (!force && (await exists(path))) continue;
    const body = await download(doc.url, doc.period);
    if (body.subarray(0, 5).toString() !== "%PDF-") throw new Error(`${doc.period}: PDF でない応答 ${doc.url}`);
    await writeFile(path, body);
    console.log(`  ${doc.period}.pdf  ${doc.url}`);
  }
  for (const doc of PLACE_DOCS) {
    const path = placePath(doc);
    if (!force && (await exists(path))) continue;
    const body = await download(doc.url, doc.period);
    if (body.subarray(0, 4).toString() !== "PK\u0003\u0004") throw new Error(`${doc.period}: Excel でない応答 ${doc.url}`);
    await writeFile(path, body);
    console.log(`  ${doc.period}-pref.xlsx  ${doc.url}`);
  }
}

if (import.meta.main) await main();
