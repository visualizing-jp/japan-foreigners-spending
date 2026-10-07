/**
 * 観光庁「インバウンド消費動向調査」（2024年1-3月期までは「訪日外国人消費動向調査」）の
 * 年間値・四半期値の公表資料。国籍・地域別の消費額は PDF にしかない。
 *
 * 2019年・2022年以降は観光庁の現行ページ、それ以外は国立国会図書館 WARP に保存された旧ページから取る。
 * 表の位置（見出し）と列は資料ごとに違うので、ここに明示する。
 * 列番号は、行の中の桁区切り整数（伸び率・構成比・小数を除く）だけを数えた位置。
 */

export const PAGE_URL = "https://www.mlit.go.jp/kankocho/tokei_hakusyo/gaikokujinshohidoko.html";
export const ARCHIVE_URL =
  "https://warp.ndl.go.jp/20240302/20240301044436/www.mlit.go.jp/kankocho/siryou/toukei/syouhityousa.html";

const CURRENT = "https://www.mlit.go.jp/kankocho/content";
const WARP = "https://warp.ndl.go.jp/20240302/20240301044436/http://www.mlit.go.jp";

/** 年間値は確報、2020–2022年は試算値、当年の四半期は2次速報。 */
export type Status = "annual" | "estimate" | "preliminary";

export interface PerCapitaTable {
  anchor: RegExp;
  perCapita: number;
  visitors?: number;
  total?: number;
}

export interface SourceDoc {
  /** "2025" または "2026Q1"。data/raw のファイル名にもなる。 */
  period: string;
  year: number;
  quarter: number | null;
  status: Status;
  url: string;
  /** 国籍・地域別の費目別旅行消費額（億円）。総額と6費目の7列。 */
  byCategory?: RegExp;
  /** 国籍・地域別の1人当たり旅行支出（円）。費目別の表がない年は、ここの消費額を使う。 */
  perCapita?: PerCapitaTable;
  /** 国籍・地域別の表がない、または全体の行が別にある年の総額（億円）。最初の数値を取る。 */
  overall?: RegExp;
  /** 1人当たり旅行支出が全国籍の1行しかない年の、その値（円）。 */
  overallPerCapita?: RegExp;
  /** pdftotext が字間に空白を挟んで崩した数字。崩れた文字列 → 元の数字。 */
  repairs?: [string, string][];
}

const PER_CAPITA_2018 = { perCapita: 0, visitors: 1, total: 2 };

export const DOCS: SourceDoc[] = [
  {
    period: "2010",
    year: 2010,
    quarter: null,
    status: "annual",
    url: `${WARP}/common/000139531.pdf`,
    // 4–12月の調査の1人当たり支出（パック内訳含む）に、暦年の訪日外客数を掛けた暦年値。
    perCapita: { anchor: /図表 2-6/, perCapita: 2, visitors: 4, total: 8 },
  },
  {
    period: "2011",
    year: 2011,
    quarter: null,
    status: "annual",
    url: `${WARP}/common/000206546.pdf`,
    perCapita: { anchor: /図表 2-6/, perCapita: 2, visitors: 3, total: 4 },
  },
  {
    period: "2012",
    year: 2012,
    quarter: null,
    status: "annual",
    url: `${WARP}/common/000992929.pdf`,
    perCapita: { anchor: /図表 2-6/, perCapita: 2, visitors: 3, total: 4 },
    repairs: [
      ["11 1,98 3", "111,983"],
      ["1 7,81 6", "17,816"],
      ["1 29,7 98", "129,798"],
    ],
  },
  {
    period: "2013",
    year: 2013,
    quarter: null,
    status: "annual",
    url: `${WARP}/common/001032143.pdf`,
    perCapita: { anchor: /図表 2-6/, perCapita: 2, visitors: 3, total: 4 },
  },
  {
    period: "2014",
    year: 2014,
    quarter: null,
    status: "annual",
    url: `${WARP}/common/001107177.pdf`,
    perCapita: { anchor: /【図表１ 国籍/, ...PER_CAPITA_2018 },
  },
  {
    period: "2015",
    year: 2015,
    quarter: null,
    status: "annual",
    url: `${WARP}/common/001126525.pdf`,
    byCategory: /【図表４】\s*国籍/,
    // 旅行者数は万人（小数）なので列に数えない。
    perCapita: { anchor: /【図表６】\s*主な国籍/, perCapita: 0, total: 1 },
  },
  {
    period: "2016",
    year: 2016,
    quarter: null,
    status: "annual",
    url: `${WARP}/common/001179539.pdf`,
    byCategory: /【図表４】\s*国籍/,
    perCapita: { anchor: /【図表６】\s*国籍/, perCapita: 0, total: 1 },
    repairs: [["3 7 ,4 7 6", "37,476"]],
  },
  {
    period: "2017",
    year: 2017,
    quarter: null,
    status: "annual",
    url: `${WARP}/common/001226297.pdf`,
    byCategory: /【図表４】\s*国籍/,
    perCapita: { anchor: /【図表７】\s*国籍/, ...PER_CAPITA_2018 },
  },
  {
    period: "2018",
    year: 2018,
    quarter: null,
    status: "annual",
    url: `${WARP}/common/001283138.pdf`,
    byCategory: /【図表３】\s*国籍/,
    perCapita: { anchor: /【図表５】\s*国籍/, ...PER_CAPITA_2018 },
  },
  {
    period: "2019",
    year: 2019,
    quarter: null,
    status: "annual",
    url: `${CURRENT}/002020396.pdf`,
    byCategory: /【図表３】\s*国籍/,
    perCapita: { anchor: /【図表４】\s*国籍/, ...PER_CAPITA_2018 },
  },
  {
    period: "2020",
    year: 2020,
    quarter: null,
    status: "estimate",
    url: `${WARP}/kankocho/siryou/toukei/content/001396416.pdf`,
    // 1–3月期の1人当たり支出で試算。国籍・地域の値は一般客、総額はクルーズ客を加えた「全体」。
    perCapita: { anchor: /【図表２】\s*国籍/, ...PER_CAPITA_2018 },
    overall: /^\s*全体\s+[\d,]+\s+\S+\s+([\d,]+)/m,
  },
  {
    period: "2021",
    year: 2021,
    quarter: null,
    status: "estimate",
    url: `${WARP}/kankocho/siryou/toukei/content/001474345.pdf`,
    // 10–12月期の1人当たり支出で試算。総額だけが公表されている。
    overall: /暦年の訪日外国人旅行消費額は([\d,]+)億円/,
  },
  {
    period: "2022",
    year: 2022,
    quarter: null,
    status: "estimate",
    url: `${CURRENT}/002020310.pdf`,
    byCategory: /【図表３】\s*国籍/,
    overallPerCapita: /^全国籍・地域（一般客）\s+([\d,]+)/m,
  },
  {
    period: "2023",
    year: 2023,
    quarter: null,
    status: "annual",
    url: `${CURRENT}/002020295.pdf`,
    byCategory: /【図表３】\s*国籍/,
    perCapita: { anchor: /【図表４】\s*国籍/, ...PER_CAPITA_2018 },
  },
  {
    period: "2024",
    year: 2024,
    quarter: null,
    status: "annual",
    url: `${CURRENT}/002020210.pdf`,
    byCategory: /【図表３】\s*国籍/,
    perCapita: { anchor: /【図表４】\s*国籍/, ...PER_CAPITA_2018 },
  },
  {
    period: "2025",
    year: 2025,
    quarter: null,
    status: "annual",
    url: `${CURRENT}/002020046.pdf`,
    byCategory: /【図表３】\s*国籍/,
    perCapita: { anchor: /【図表４】\s*国籍/, ...PER_CAPITA_2018 },
  },
  {
    period: "2026Q1",
    year: 2026,
    quarter: 1,
    status: "preliminary",
    url: `${CURRENT}/002024442.pdf`,
    byCategory: /【図表３】\s*国籍/,
  },
  {
    period: "2026Q2",
    year: 2026,
    quarter: 2,
    status: "preliminary",
    url: `${CURRENT}/002024946.pdf`,
    byCategory: /【図表３】\s*国籍/,
  },
];

/** 費目の並びは全資料で同じ。2015–2016年の表は「宿泊料金」「娯楽サービス費」と書く。 */
export const CATEGORIES = ["宿泊費", "飲食費", "交通費", "娯楽等サービス費", "買物代", "その他"] as const;

export const TOTAL = "全国籍・地域";

/**
 * 都道府県別集計表（B1地域調査、一般客）。2018・2019年と2024年以降。
 * 2020–2022年は調査中止。2023年は4–12月の参考値しかなく、年間値がない。
 * 県の和は全国の旅行消費額と一致しない（都道府県間交通費と訪問地不明を含まない）。
 */
export interface PlaceDoc {
  period: string;
  year: number;
  quarter: number | null;
  status: Status;
  url: string;
}

export const PLACE_DOCS: PlaceDoc[] = [
  {
    period: "2018",
    year: 2018,
    quarter: null,
    status: "annual",
    url: `${WARP}/kankocho/siryou/toukei/content/001345788.xlsx`,
  },
  {
    period: "2019",
    year: 2019,
    quarter: null,
    status: "annual",
    url: `${CURRENT}/002020406.xlsx`,
  },
  {
    period: "2024",
    year: 2024,
    quarter: null,
    status: "annual",
    url: `${CURRENT}/002020222.xlsx`,
  },
  {
    period: "2025",
    year: 2025,
    quarter: null,
    status: "annual",
    url: `${CURRENT}/002020056.xlsx`,
  },
  {
    period: "2026Q1",
    year: 2026,
    quarter: 1,
    status: "preliminary",
    url: `${CURRENT}/002024447.xlsx`,
  },
  {
    period: "2026Q2",
    year: 2026,
    quarter: 2,
    status: "preliminary",
    url: `${CURRENT}/002024948.xlsx`,
  },
];

/** 都道府県表の費目。全国の6費目に、団体・パック参加費の訪問地収入分が先頭に付く。 */
export const PLACE_CATEGORIES = [
  "団体・パック参加費",
  "宿泊費",
  "飲食費",
  "交通費",
  "娯楽等サービス費",
  "買物代",
  "その他",
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];
