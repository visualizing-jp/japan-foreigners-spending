/**
 * sources.ts の公表資料を data/raw/{period}.pdf に落とす。
 * 既にあるファイルは取り直さない。資料の差し替えを取り込むときは --force。
 *
 *   npm run fetch
 *   npm run fetch -- --force
 */

import { mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DOCS, type SourceDoc } from "../src/lib/data/sources.ts";

const RAW_DIR = resolve(import.meta.dirname, "../data/raw");

export function rawPath(doc: SourceDoc): string {
  return resolve(RAW_DIR, `${doc.period}.pdf`);
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  await mkdir(RAW_DIR, { recursive: true });
  for (const doc of DOCS) {
    const path = rawPath(doc);
    if (!force && (await exists(path))) continue;
    const res = await fetch(doc.url);
    if (!res.ok) throw new Error(`${doc.period}: ${res.status} ${doc.url}`);
    const body = Buffer.from(await res.arrayBuffer());
    if (body.subarray(0, 5).toString() !== "%PDF-") throw new Error(`${doc.period}: PDF でない応答 ${doc.url}`);
    await writeFile(path, body);
    console.log(`  ${doc.period}.pdf  ${doc.url}`);
  }
}

if (import.meta.main) await main();
