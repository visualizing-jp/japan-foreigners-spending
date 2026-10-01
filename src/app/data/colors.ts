/**
 * 系列の色。訪日外客数のサイトと同じ8色を、上位国の並びに固定して使う。
 * 費目は6色。買物代は上位国の1色目と同じ赤にして、目を引く費目であることを揃える。
 */

export const RANK_COLORS = [
  "#b0392a",
  "#2f5d8a",
  "#c9893a",
  "#4f7d5c",
  "#7a5a8c",
  "#3f8f8f",
  "#a0606a",
  "#7b7a3a",
];

/** 上位に入らない国と、表の「その他」をまとめた残り。 */
export const REST_COLOR = "#d9d4ca";

/** 一覧から選んだ、上位に入らない国。 */
export const PICK_COLOR = "#16140f";

export const CATEGORY_COLORS: Record<string, string> = {
  宿泊費: "#2f5d8a",
  飲食費: "#c9893a",
  交通費: "#4f7d5c",
  娯楽等サービス費: "#7a5a8c",
  買物代: "#b0392a",
  その他: "#a8a299",
};

export const SPEND_COLOR = "#b0392a";
export const PER_CAPITA_COLOR = "#2f5d8a";
