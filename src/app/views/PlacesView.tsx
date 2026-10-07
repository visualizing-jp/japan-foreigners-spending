/**
 * 都道府県ビュー。年の順位と、上位の推移、選んだ県の費目。
 * 県の和は全国の旅行消費額と一致しない。
 */

import { use, useMemo } from "react";
import { loadSpending } from "../data/load.ts";
import { CATEGORY_COLORS, PICK_COLOR, RANK_COLORS, REST_COLOR } from "../data/colors.ts";
import { STATUS_LABEL, manYen, mannin, oku, pct, yearLabel } from "../data/format.ts";
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

const TOP = RANK_COLORS.length;
const REST = "そのほか";

export function PlacesView() {
  const d = use(loadSpending());
  const lastAnnual = d.prefYears.filter((y) => d.status[d.years.indexOf(y)] === "annual").at(-1) ?? d.prefYears.at(-1)!;
  const [yearParam, setYearParam] = useUrlState<string>("y", String(lastAnnual), (v) => d.prefYears.includes(Number(v)));
  const year = Number(yearParam);
  const py = d.prefYears.indexOf(year);
  const yi = d.years.indexOf(year);
  const [measure, setMeasure] = useUrlState<Measure>("measure", "count", (v) => v === "count" || v === "share");
  const [chart, setChart] = useUrlState<Chart>("chart", "bars", (v) => CHARTS.some((c) => c.value === v));
  const [selected, setPicked] = useUrlState<string>("p", "", (v) => d.prefectures.includes(v));
  const Years = chart === "stream" ? Streamgraph : StackedYears;

  const top = useMemo(
    () =>
      d.prefectures
        .map((name, i) => ({ name, v: d.byPrefecture[i]![d.prefYears.length - 1]! }))
        .sort((a, b) => b.v - a.v)
        .slice(0, TOP)
        .map((r) => r.name),
    [d],
  );
  const colorOf = (name: string) => {
    const k = top.indexOf(name);
    return k < 0 ? undefined : RANK_COLORS[k];
  };

  const all = d.prefectures.reduce((a, _, i) => a + d.byPrefecture[i]![py]!, 0);
  const rows: RankRow[] = d.prefectures
    .map((name, i) => ({ name, value: d.byPrefecture[i]![py]! }))
    .sort((a, b) => b.value - a.value)
    .map((r) => ({
      name: r.name,
      value: r.value,
      label: pct(r.value / all),
      indent: 0,
      color: colorOf(r.name),
    }));

  const pick = d.prefectures.indexOf(selected);
  const extra = pick >= 0 && !top.includes(selected) ? selected : null;
  const columns = useMemo((): Column[] => {
    const shownNames = extra === null ? top : [...top, extra];
    return d.prefYears.map((yr, k) => {
      const t = d.prefectures.reduce((a, _, i) => a + d.byPrefecture[i]![k]!, 0);
      const shown = shownNames.map((name) => ({
        key: name,
        value: d.byPrefecture[d.prefectures.indexOf(name)]![k]!,
        color: colorOf(name) ?? PICK_COLOR,
      }));
      const rest = t - shown.reduce((a, s) => a + s.value, 0);
      return { year: yr, total: t, segments: [...shown, { key: REST, value: rest, color: REST_COLOR }] };
    });
  }, [d, top, extra]);

  const groupColumns = useMemo((): Column[] => {
    if (pick < 0) return [];
    return d.prefYears.map((yr, k) => {
      const t = d.byPrefecture[pick]![k]!;
      return {
        year: yr,
        total: t,
        segments: d.placeCategories.map((c, ci) => ({
          key: c,
          value: d.placeCategory[ci]![pick]![k]!,
          color: CATEGORY_COLORS[c]!,
        })),
      };
    });
  }, [d, pick]);

  const pickedValue = pick < 0 ? null : d.byPrefecture[pick]![py]!;
  const pickedVisitors = pick < 0 ? null : d.placeVisitors[pick]![py]!;
  const status = STATUS_LABEL[d.status[yi]!];

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:self-start">
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <YearSelect years={d.prefYears} value={year} onChange={(y) => setYearParam(String(y))} />
          <span className="text-[11px] text-faint">47都道府県の和に占める割合</span>
        </div>
        <RankList
          rows={rows}
          selected={selected}
          onSelect={(name) => setPicked(name === selected ? "" : name)}
          noneLabel="47都道府県の和"
          noneValue={oku(all)}
        />
        <p className="mt-2 border-t border-rule px-2 pt-2 text-[10.5px] leading-relaxed text-faint">
          都道府県を選ぶとグラフでその県だけを濃くし、下にその県の費目を出す。同じ県をもう一度押すか「47都道府県の和」で解除。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <h1 className="text-[19px] font-semibold tracking-tight">都道府県別の旅行消費額</h1>
          <div className="flex gap-2">
            <Segmented label="グラフ" options={CHARTS} value={chart} onChange={setChart} />
            <Segmented label="尺度" options={MEASURES} value={measure} onChange={setMeasure} />
          </div>
        </header>

        <p className="tnum min-h-9 pb-3 text-[12.5px]">
          <span className="font-semibold">{yearLabel(year, d.months[yi]!)}</span>
          {status !== null && <Preliminary label={status} />}
          <span className="text-muted">{` · 47都道府県の和 ${oku(all)}`}</span>
          {pickedValue !== null && (
            <>
              <span className="text-muted"> · </span>
              <span
                aria-hidden
                className="mr-1 inline-block size-[9px] rounded-[2px] align-baseline"
                style={{ backgroundColor: colorOf(selected) ?? PICK_COLOR }}
              />
              <span className="font-semibold">{selected}</span>
              <span className="text-muted">{` ${oku(pickedValue)}（${pct(pickedValue / all)}）`}</span>
              {pickedVisitors !== null && (
                <span className="text-muted">{` · 訪問者 ${mannin(pickedVisitors)} · 単価 ${manYen(pickedValue / pickedVisitors)}`}</span>
              )}
            </>
          )}
          {selected !== "" && (
            <button
              type="button"
              onClick={() => setPicked("")}
              className="ml-2 cursor-pointer rounded border border-rule px-1.5 py-px text-[11px] text-muted transition-[color,border-color,transform] duration-150 ease-out hover:border-rule-strong hover:text-ink active:scale-[0.97]"
            >
              解除
            </button>
          )}
        </p>

        <Years
          columns={columns}
          measure={measure}
          highlighted={top.includes(selected) ? selected : (extra ?? "")}
          focused={year}
          onFocus={(y) => setYearParam(String(y))}
          label={`都道府県別の旅行消費額の${measure === "share" ? "構成比" : "金額"}`}
        />
        <Legend
          items={[
            ...top.map((name, k) => ({ name, color: RANK_COLORS[k]! })),
            ...(extra === null ? [] : [{ name: extra, color: PICK_COLOR }]),
            { name: REST, color: REST_COLOR },
          ]}
        />

        {pick >= 0 && (
          <section className="mt-8">
            <h2 className="pb-2 text-[13px] font-semibold">{selected}の費目の構成</h2>
            <Years
              columns={groupColumns}
              measure="share"
              highlighted=""
              focused={year}
              onFocus={(y) => setYearParam(String(y))}
              height={240}
              label={`${selected}の費目別の構成比`}
            />
            <Legend items={d.placeCategories.map((c) => ({ name: c, color: CATEGORY_COLORS[c]! }))} />
          </section>
        )}

        <ul className="mt-5 flex flex-col gap-1 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          <li>
            色のついた{TOP}都道府県は{d.prefYears.at(-1)}年の上位。「{REST}」は47都道府県からそれらを引いた残り。都道府県の表は2018・2019年と2024年から。
          </li>
          <li>
            県の和は全国の旅行消費額と一致しない。都道府県間交通費と訪問地不明の支出を含まない。対象は一般客（クルーズ客以外）。
          </li>
          <li>
            B1地域調査は2018年から。2020年4–6月期から2023年1–3月期は中止し、2023年は4–12月の参考値だけなので年間値はない。
          </li>
        </ul>
      </main>
    </div>
  );
}

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-[46px] text-[11px] text-muted">
      {items.map((it) => (
        <li key={it.name} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-[9px] rounded-[2px]" style={{ backgroundColor: it.color }} />
          {it.name}
        </li>
      ))}
    </ul>
  );
}
