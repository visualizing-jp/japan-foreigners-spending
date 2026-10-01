/**
 * 時代ビュー。年ごとの旅行消費額の総額と、1人当たり旅行支出。
 */

import { use } from "react";
import { loadSpending } from "../data/load.ts";
import { PER_CAPITA_COLOR, SPEND_COLOR } from "../data/colors.ts";
import { STATUS_LABEL, oku, pct, shortOku, tickOku, tickYenMan, yen, yenMan, yearLabel } from "../data/format.ts";
import { YearBars } from "../components/YearBars.tsx";
import { YearLine } from "../components/YearLine.tsx";
import { Preliminary } from "../components/Preliminary.tsx";
import { useUrlState } from "../hooks/useUrlState.ts";

export function EraView() {
  const d = use(loadSpending());
  const lastAnnual = d.years[d.status.lastIndexOf("annual")]!;
  const [yearParam, setYearParam] = useUrlState<string>("y", String(lastAnnual), (v) => d.years.includes(Number(v)));
  const year = Number(yearParam);
  const setYear = (y: number) => setYearParam(String(y));
  const i = d.years.indexOf(year);
  const total = d.total[0]!;
  const perCapita = d.perCapita[0]!;
  const status = STATUS_LABEL[d.status[i]!];
  const prev = total[i - 1] ?? null;
  const change = d.months[i] === 12 && d.months[i - 1] === 12 && prev !== null ? total[i]! / prev - 1 : null;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 py-6">
      <header className="pb-4">
        <h1 className="text-[19px] font-semibold tracking-tight">訪日外国人の旅行消費額</h1>
      </header>

      <p className="tnum min-h-9 pb-3 text-[12.5px]">
        <span className="font-semibold">{yearLabel(year, d.months[i]!)}</span>
        {status !== null && <Preliminary label={status} />}
        <span className="text-muted"> · </span>
        <Swatch color={SPEND_COLOR} />
        <span className="font-semibold">総額</span>
        <span className="text-muted">{` ${oku(total[i]!)}`}</span>
        {change !== null && <span className="text-muted">{`（前年比 ${change >= 0 ? "+" : ""}${pct(change)}）`}</span>}
        {perCapita[i] != null && (
          <>
            <span className="text-muted"> · </span>
            <Swatch color={PER_CAPITA_COLOR} />
            <span>1人当たり</span>
            <span className="text-muted">{` ${yen(perCapita[i]!)}`}</span>
          </>
        )}
      </p>

      <YearBars
        years={d.years}
        values={total}
        status={d.status}
        months={d.months}
        focused={year}
        onFocus={setYear}
        color={SPEND_COLOR}
        tick={tickOku}
        short={shortOku}
        format={oku}
        label="訪日外国人の旅行消費額の推移"
      />

      <section className="mt-8">
        <h2 className="pb-2 text-[13px] font-semibold">1人当たり旅行支出</h2>
        <YearLine
          years={d.years}
          values={perCapita}
          focused={year}
          onFocus={setYear}
          color={PER_CAPITA_COLOR}
          tick={tickYenMan}
          short={yenMan}
          format={yen}
          label="訪日外国人1人当たり旅行支出の推移"
        />
      </section>

      <ul className="mt-5 flex flex-col gap-1 border-t border-rule pt-3 text-[11px] leading-relaxed text-muted">
        <li>
          各年の値は、その年の年間値を公表した観光庁の資料による。2012年は当時の資料で10,861億円、後の資料では確定した訪日外客数で計算し直した10,846億円になっている。
        </li>
        <li>2010年は4–12月の調査結果に1–3月の推計を足した年間値。1人当たりは4–12月の平均。</li>
        <li>2020–2022年は試算値で、棒を薄くしている。2021年は総額だけが公表されていて、1人当たりはない。</li>
        <li>
          {d.years.at(-1)}年は公表済みの四半期（2次速報）の和で、棒は輪郭だけにしている。四半期ごとの1人当たりは足し合わせられないので出していない。
        </li>
        <li>2018年以降の1人当たりは一般客（クルーズ客を除く）の値。総額はクルーズ客を含む。</li>
        <li>2024年4–6月期から調査名が「インバウンド消費動向調査」に変わった。推計方法は変わっておらず、観光庁はそれ以前と比べられるとしている。</li>
      </ul>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="mr-1 inline-block size-[9px] rounded-[2px] align-baseline" style={{ backgroundColor: color }} />;
}
