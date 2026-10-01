/**
 * 配信データの取得。1ファイルだけなので、一度だけ取りに行く。
 */

import type { SpendingJson } from "../../lib/data/cube.ts";

let cache: Promise<SpendingJson> | null = null;

export function loadSpending(): Promise<SpendingJson> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/spending.json`).then((r) => {
    if (!r.ok) throw new Error(`spending.json の取得に失敗しました (${r.status})`);
    return r.json() as Promise<SpendingJson>;
  });
  return cache;
}
