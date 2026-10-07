import type { Status } from "../../lib/data/sources.ts";

const int = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 億円の値。1兆以上は「9兆4,549億円」。 */
export function oku(n: number): string {
  if (n < 10_000) return `${int.format(n)}億円`;
  const cho = Math.floor(n / 10_000);
  const rest = n % 10_000;
  return rest === 0 ? `${cho}兆円` : `${cho}兆${int.format(rest)}億円`;
}

export function yen(n: number): string {
  return `${int.format(n)}円`;
}

/** 1人当たり支出の短い表記。「22.9万円」。 */
export function yenMan(n: number): string {
  return `${one.format(n / 10_000)}万円`;
}

/** 万円の値。「15.1万円」。 */
export function manYen(n: number): string {
  return `${one.format(n)}万円`;
}

/** 万人の値。「236.3万人」。 */
export function mannin(n: number): string {
  return `${one.format(n)}万人`;
}

export function pct(share: number): string {
  return `${one.format(share * 100)}%`;
}

/** 億円の軸の目盛り。1兆以上は兆で。 */
export function tickOku(v: number): string {
  if (v === 0) return "0";
  return v >= 10_000 ? `${v / 10_000}兆` : `${int.format(v)}億`;
}

/** 億円の値の短い表記。1兆以上は「9.5兆」。 */
export function shortOku(n: number): string {
  return n >= 10_000 ? `${one.format(n / 10_000)}兆` : `${int.format(n)}億`;
}

/** 円の軸の目盛り。万円で。 */
export function tickYenMan(v: number): string {
  return v === 0 ? "0" : `${int.format(v / 10_000)}万`;
}

/** 年の途中なら「1–6月」を添える。 */
export function yearLabel(year: number, months: number): string {
  return months === 12 ? `${year}年` : `${year}年 1–${months}月`;
}

export const STATUS_LABEL: Record<Status, string | null> = {
  annual: null,
  estimate: "試算値",
  preliminary: "2次速報",
};
