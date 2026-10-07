import type { Status } from "../data/sources.ts";

/** 国籍・地域別の費目別旅行消費額（億円）。values は CATEGORIES の順。 */
export interface CategoryRow {
  name: string;
  total: number;
  values: number[];
}

/** 国籍・地域別の1人当たり旅行支出（円）と、旅行者数（人）・消費額（億円）。 */
export interface PerCapitaRow {
  name: string;
  perCapita: number;
  visitors: number | null;
  total: number | null;
}

export interface SpendingDoc {
  period: string;
  year: number;
  quarter: number | null;
  status: Status;
  /** 全体の旅行消費額（億円）。 */
  overall: number;
  /** 全国籍の1人当たり旅行支出（円）。2018年以降は一般客。 */
  overallPerCapita: number | null;
  byCategory: CategoryRow[] | null;
  perCapita: PerCapitaRow[] | null;
}

/** 都道府県別の旅行消費額（億円）。values は PLACE_CATEGORIES の順。 */
export interface PlaceRow {
  name: string;
  /** 訪問者数（万人）。 */
  visitors: number;
  /** 消費単価（万円／人）。 */
  unit: number;
  total: number;
  values: number[];
}

export interface PlacePeriod {
  period: string;
  year: number;
  quarter: number | null;
  status: Status;
  rows: PlaceRow[];
}
