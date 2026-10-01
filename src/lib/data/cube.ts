import type { Status } from "./sources.ts";

/**
 * 配信データ。行は国籍・地域（0 行目は全国籍・地域）、列は年。値がない年は null。
 *
 * 国籍・地域別の消費額は、費目別の表がある年はその表（クルーズ客を含む全体）、
 * ない年は1人当たりの表の消費額（2020年は一般客だけ）。0 行目はどの年も全体の総額。
 */
export interface SpendingJson {
  years: number[];
  status: Status[];
  /** 何か月分の値か。当年は公表済みの四半期の和。 */
  months: number[];
  names: string[];
  /** 旅行消費額（億円）。 */
  total: (number | null)[][];
  /** 1人当たり旅行支出（円）。2018年以降は一般客。 */
  perCapita: (number | null)[][];
  categories: string[];
  /** 費目別の旅行消費額（億円）。[費目][国籍・地域][年]。 */
  byCategory: (number | null)[][][];
}
