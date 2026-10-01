/**
 * 国・地域ビュー。年を選ぶと消費額の順位、時系列では上位の構成、下に選んだ国の1人当たり旅行支出。
 *
 * 割合の分母は国籍・地域の行の和。2020年は国籍・地域の行が一般客だけなので、全体の総額より小さい。
 * 「その他」の行は順位に入れず、一覧の末尾に置く。
 */

import { use, useMemo } from "react";
import type { SpendingJson } from "../../lib/data/cube.ts";
import { loadSpending } from "../data/load.ts";
import { PER_CAPITA_COLOR, PICK_COLOR, RANK_COLORS, REST_COLOR } from "../data/colors.ts";
import { STATUS_LABEL, oku, pct, tickYenMan, yen, yenMan, yearLabel } from "../data/format.ts";
import { RankList, type RankRow } from "../components/RankList.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { StackedYears, type Column, type Measure } from "../components/StackedYears.tsx";
import { CHARTS, Streamgraph, type Chart } from "../components/Streamgraph.tsx";
import { YearLine } from "../components/YearLine.tsx";
import { YearSelect } from "../components/YearSelect.tsx";
import { Preliminary } from "../components/Preliminary.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

const MEASURES = [
  { value: "count", label: "金額" },
  { value: "share", label: "構成比" },
] as const;

const TOP = RANK_COLORS.length;
const OTHER = "その他";
const REST = "そのほか";

/** その年に値のある国籍・地域を多い順に。「その他」は末尾。 */
function ranking(d: SpendingJson, yi: number): { name: string; value: number }[] {
  const rows = d.names.flatMap((name, n) => {
    const v = d.total[n]![yi];
    return n === 0 || v == null ? [] : [{ name, value: v }];
  });
  return [
    ...rows.filter((r) => r.name !== OTHER).sort((a, b) => b.value - a.value),
    ...rows.filter((r) => r.name === OTHER),
  ];
}

export function MarketsView() {
  const d = use(loadSpending());
  const years = d.years.filter((_, k) => d.total.some((row, n) => n > 0 && row[k] != null));
  const lastAnnual = d.years[d.status.lastIndexOf("annual")]!;

  const [yearParam, setYearParam] = useUrlState<string>("y", String(lastAnnual), (v) => years.includes(Number(v)));
  const year = Number(yearParam);
  const yi = d.years.indexOf(year);
  const [measure, setMeasure] = useUrlState<Measure>("measure", "count", (v) => v === "count" || v === "share");
  const [chart, setChart] = useUrlState<Chart>("chart", "bars", (v) => CHARTS.some((c) => c.value === v));
  const [selected, setPicked] = useUrlState<string>("m", "", (v) => d.names.includes(v) && v !== d.names[0]);
  const Years = chart === "stream" ? Streamgraph : StackedYears;

  const top = useMemo(
    () => ranking(d, d.years.indexOf(lastAnnual)).filter((r) => r.name !== OTHER).slice(0, TOP).map((r) => r.name),
    [d, lastAnnual],
  );
  const colorOf = (name: string) => {
    const k = top.indexOf(name);
    return k < 0 ? undefined : RANK_COLORS[k];
  };

  const ranked = useMemo(() => ranking(d, yi), [d, yi]);
  const sum = ranked.reduce((a, r) => a + r.value, 0);
  const rows: RankRow[] = ranked.map((r) => ({
    name: r.name,
    value: r.value,
    label: pct(r.value / sum),
    indent: 0,
    color: colorOf(r.name),
  }));

  const pickIndex = d.names.indexOf(selected);

  const columns = useMemo((): Column[] => {
    return d.years.flatMap((yr, k) => {
      if (d.months[k] !== 12 || !years.includes(yr)) return [];
      const r = ranking(d, k);
      const t = r.reduce((a, x) => a + x.value, 0);
      const value = (name: string) => r.find((x) => x.name === name)?.value ?? 0;
      const shown = [...top, ...(selected !== "" && !top.includes(selected) ? [selected] : [])].map((name) => ({
        key: name,
        value: value(name),
        color: colorOf(name) ?? PICK_COLOR,
      }));
      const rest = t - shown.reduce((a, s) => a + s.value, 0);
      return [{ year: yr, total: t, segments: [...shown, { key: REST, value: rest, color: REST_COLOR }] }];
    });
  }, [d, years, top, selected]);
  const stacked = columns.map((c) => c.year);

  const status = STATUS_LABEL[d.status[yi]!];
  const pickedValue = pickIndex < 0 ? null : (d.total[pickIndex]![yi] ?? null);
  const focusName = pickIndex < 0 ? d.names[0]! : selected;
  const firstYears = useMemo(() => sinceYears(d), [d]);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] gap-8 px-6 py-6 max-lg:flex-col-reverse">
      <aside className="w-[300px] shrink-0 max-lg:w-full lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col lg:self-start">
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <YearSelect years={years} value={year} onChange={(y) => setYearParam(String(y))} />
          <span className="text-[11px] text-faint">国籍・地域の和に占める割合</span>
        </div>
        <RankList
          rows={rows}
          selected={selected}
          onSelect={(name) => setPicked(name === selected ? "" : name)}
          noneLabel={d.names[0]}
          noneValue={oku(d.total[0]![yi]!)}
        />
        <p className="mt-2 border-t border-rule px-2 pt-2 text-[10.5px] leading-relaxed text-faint">
          国・地域を選ぶとグラフでその国だけを濃くし、下にその国の1人当たり旅行支出を出す。同じ国をもう一度押すか「{d.names[0]}」で解除。
        </p>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <h1 className="text-[19px] font-semibold tracking-tight">国籍・地域別の旅行消費額</h1>
          <div className="flex gap-2">
            <Segmented label="グラフ" options={CHARTS} value={chart} onChange={setChart} />
            <Segmented label="尺度" options={MEASURES} value={measure} onChange={setMeasure} />
          </div>
        </header>

        <p className="tnum min-h-9 pb-3 text-[12.5px]">
          <span className="font-semibold">{yearLabel(year, d.months[yi]!)}</span>
          {status !== null && <Preliminary label={status} />}
          <span className="text-muted">{` · ${d.names[0]} ${oku(d.total[0]![yi]!)}`}</span>
          {pickedValue !== null && (
            <>
              <span className="text-muted"> · </span>
              <span
                aria-hidden
                className="mr-1 inline-block size-[9px] rounded-[2px] align-baseline"
                style={{ backgroundColor: colorOf(selected) ?? PICK_COLOR }}
              />
              <span className="font-semibold">{selected}</span>
              <span className="text-muted">{` ${oku(pickedValue)}（${pct(pickedValue / sum)}）`}</span>
            </>
          )}
          {selected !== "" && pickedValue === null && (
            <span className="text-muted">{` · ${selected}はこの年の表に行がない`}</span>
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
          highlighted={selected}
          focused={year}
          onFocus={(y) => setYearParam(String(y))}
          label={`国籍・地域別の旅行消費額の${measure === "share" ? "構成比" : "金額"}`}
        />
        <Legend top={top} extra={selected !== "" && !top.includes(selected) ? selected : null} />

        <section className="mt-8">
          <h2 className="pb-2 text-[13px] font-semibold">{focusName}の1人当たり旅行支出</h2>
          <YearLine
            years={d.years}
            values={d.perCapita[pickIndex < 0 ? 0 : pickIndex]!}
            focused={year}
            onFocus={(y) => years.includes(y) && setYearParam(String(y))}
            color={colorOf(selected) ?? (pickIndex < 0 ? PER_CAPITA_COLOR : PICK_COLOR)}
            tick={tickYenMan}
            short={yenMan}
            format={yen}
            label={`${focusName}の1人当たり旅行支出の推移`}
          />
        </section>

        <ul className="mt-5 flex flex-col gap-1 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
          <li>
            色のついた{TOP}か国・地域は{lastAnnual}年の上位（「{OTHER}」を除く）。「{REST}」は国籍・地域の行の和からそれらを引いた残り。積み上げは年間値のある{stacked[0]}–{stacked.at(-1)}年。
          </li>
          <li>
            2021年は総額だけが公表されていて、国籍・地域別の値がない。2020年の国籍・地域別は一般客だけの値で、和は全体の総額より小さい。
          </li>
          <li>
            表に載る国籍・地域は年によって違う。
            {firstYears.map((g) => `${g.names.join("・")}は${g.since}年から`).join("、")}行がある。ない年はその国が「{OTHER}」に含まれる。
          </li>
          <li>
            国籍・地域別の金額は、費目別の表がある年はその表、ない年は1人当たりの表の値。費目別の表は2018年以降クルーズ客を含む。1人当たりは2018年以降、一般客の値。
          </li>
        </ul>
      </main>
    </div>
  );
}

/** 最初の年より後に表に現れた国籍・地域を、現れた年ごとにまとめる。 */
function sinceYears(d: SpendingJson): { since: number; names: string[] }[] {
  const groups = new Map<number, string[]>();
  d.names.forEach((name, n) => {
    const k = d.total[n]!.findIndex((v) => v !== null);
    if (k <= 0) return;
    groups.set(d.years[k]!, [...(groups.get(d.years[k]!) ?? []), name]);
  });
  return [...groups].map(([since, names]) => ({ since, names }));
}

function Legend({ top, extra }: { top: string[]; extra: string | null }) {
  const items = [
    ...top.map((name, k) => ({ name, color: RANK_COLORS[k]! })),
    ...(extra === null ? [] : [{ name: extra, color: PICK_COLOR }]),
    { name: REST, color: REST_COLOR },
  ];
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
