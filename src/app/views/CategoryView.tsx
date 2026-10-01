/**
 * 費目ビュー。国籍・地域を選ぶと、その旅行消費額の費目の構成を年ごとに積み上げる。
 * 一覧の右端は、その年の買物代の割合。
 */

import { use, useMemo } from "react";
import { loadSpending } from "../data/load.ts";
import { CATEGORY_COLORS } from "../data/colors.ts";
import { STATUS_LABEL, oku, pct, yearLabel } from "../data/format.ts";
import { RankList, type RankRow } from "../components/RankList.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { StackedYears, type Column, type Measure } from "../components/StackedYears.tsx";
import { CHARTS, Streamgraph, type Chart } from "../components/Streamgraph.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { Preliminary } from "../components/Preliminary.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

const MEASURES = [
  { value: "count", label: "金額" },
  { value: "share", label: "構成比" },
] as const;

const SHOPPING = "買物代";
const OTHER = "その他";

export function CategoryView() {
  const d = use(loadSpending());
  const shopping = d.categories.indexOf(SHOPPING);
  const years = d.years.filter((_, k) => d.byCategory[0]![0]![k] != null);
  const lastAnnual = d.years[d.status.lastIndexOf("annual")]!;

  const [yearParam, setYearParam] = useUrlState<string>("y", String(lastAnnual), (v) => years.includes(Number(v)));
  const year = Number(yearParam);
  const yi = d.years.indexOf(year);
  const [measure, setMeasure] = useUrlState<Measure>("measure", "share", (v) => v === "count" || v === "share");
  const [chart, setChart] = useUrlState<Chart>("chart", "bars", (v) => CHARTS.some((c) => c.value === v));
  const [selected, setPicked] = useUrlState<string>("m", "", (v) => d.names.includes(v) && v !== d.names[0]);
  const Years = chart === "stream" ? Streamgraph : StackedYears;
  const node = Math.max(0, d.names.indexOf(selected));
  const name = d.names[node]!;

  const valuesAt = (n: number, k: number) => d.categories.map((_, c) => d.byCategory[c]![n]![k] ?? null);
  const sumOf = (vs: (number | null)[]) => vs.reduce<number>((a, v) => a + (v ?? 0), 0);

  const rows = useMemo((): RankRow[] => {
    const list = d.names.flatMap((nm, n) => {
      const vs = valuesAt(n, yi);
      if (n === 0 || vs[shopping] === null) return [];
      return [{ name: nm, total: sumOf(vs), share: vs[shopping]! / sumOf(vs) }];
    });
    return [
      ...list.filter((r) => r.name !== OTHER).sort((a, b) => b.total - a.total),
      ...list.filter((r) => r.name === OTHER),
    ].map((r) => ({ name: r.name, value: r.share, label: `${SHOPPING} ${pct(r.share)}`, indent: 0 }));
  }, [d, yi, shopping]);

  const columns = useMemo((): Column[] => {
    return d.years.flatMap((yr, k) => {
      const vs = valuesAt(node, k);
      if (d.months[k] !== 12 || vs.some((v) => v === null)) return [];
      return [
        {
          year: yr,
          total: sumOf(vs),
          segments: d.categories.map((c, ci) => ({ key: c, value: vs[ci]!, color: CATEGORY_COLORS[c]! })),
        },
      ];
    });
  }, [d, node]);

  const current = valuesAt(node, yi);
  const currentTotal = sumOf(current);
  const status = STATUS_LABEL[d.status[yi]!];

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:self-start">
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <YearSelect years={years} value={year} onChange={(y) => setYearParam(String(y))} />
          <span className="text-[11px] text-faint">消費額の多い順</span>
        </div>
        <RankList
          rows={rows}
          selected={selected}
          onSelect={(nm) => setPicked(nm === selected ? "" : nm)}
          noneLabel={d.names[0]}
          noneValue={`${SHOPPING} ${pct(valuesAt(0, yi)[shopping]! / sumOf(valuesAt(0, yi)))}`}
        />
        <p className="mt-2 border-t border-rule px-2 pt-2 text-[10.5px] leading-relaxed text-faint">
          国・地域を選ぶと、その費目の構成をグラフに出す。右端の棒は買物代の割合。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <h1 className="text-[19px] font-semibold tracking-tight">{name}の費目別旅行消費額</h1>
          <div className="flex gap-2">
            <Segmented label="グラフ" options={CHARTS} value={chart} onChange={setChart} />
            <Segmented label="尺度" options={MEASURES} value={measure} onChange={setMeasure} />
          </div>
        </header>

        <p className="tnum min-h-9 pb-3 text-[12.5px]">
          <span className="font-semibold">{yearLabel(year, d.months[yi]!)}</span>
          {status !== null && <Preliminary label={status} />}
          {current.every((v) => v !== null) ? (
            <span className="text-muted">{` · ${name} ${oku(d.total[node]![yi]!)}`}</span>
          ) : (
            <span className="text-muted">{` · ${name}はこの年の表に行がない`}</span>
          )}
        </p>

        <Years
          columns={columns}
          measure={measure}
          highlighted=""
          focused={year}
          onFocus={(y) => setYearParam(String(y))}
          label={`${name}の費目別旅行消費額の${measure === "share" ? "構成比" : "金額"}`}
        />

        <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-4 gap-y-1 pl-[46px] text-[11.5px]">
          {d.categories.map((c, ci) => (
            <li key={c} className="tnum inline-flex items-center gap-1.5">
              <span aria-hidden className="size-[9px] rounded-[2px]" style={{ backgroundColor: CATEGORY_COLORS[c] }} />
              <span className="text-muted">{c}</span>
              {current[ci] != null && <span className="font-semibold">{pct(current[ci]! / currentTotal)}</span>}
            </li>
          ))}
        </ul>

        <ul className="mt-5 flex flex-col gap-1 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          <li>
            費目別の表は{years[0]}年から。2020・2021年は費目別の値がない。積み上げは年間値のある年だけで、{d.years.at(-1)}年の速報は一覧と割合にだけ出す。
          </li>
          <li>2015・2016年の表では、宿泊費は「宿泊料金」、娯楽等サービス費は「娯楽サービス費」という名前。</li>
          <li>2018年以降の費目別の表は、クルーズ客を含む全体の値。</li>
          <li>旅行消費額は、パッケージツアー料金のうち日本国内分を含み、日本との往復の国際運賃を含まない。</li>
        </ul>
      </main>
    </div>
  );
}
