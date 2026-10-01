/**
 * 年ごとの総額の棒。試算値の年は薄く、年の途中までの値（当年の速報）は輪郭だけで描く。
 * 年は帯（scaleBand）に置き、下に並べる YearLine と同じ位置にする。
 */

import { scaleBand, scaleLinear } from "d3-scale";
import type { Status } from "../../lib/data/sources.ts";
import { useWidth } from "../hooks/useWidth.ts";

export const YEAR_MARGIN = { left: 46, right: 6, top: 18, bottom: 28 };

export function yearBand(years: number[], width: number) {
  return scaleBand<number>()
    .domain(years)
    .range([YEAR_MARGIN.left, Math.max(YEAR_MARGIN.left + 1, width - YEAR_MARGIN.right)])
    .paddingInner(0.25)
    .paddingOuter(0.1);
}

export function YearBars({
  years,
  values,
  status,
  months,
  focused,
  onFocus,
  color,
  tick,
  short,
  format,
  height = 300,
  label,
}: {
  years: number[];
  values: (number | null)[];
  status: Status[];
  months: number[];
  focused: number;
  onFocus: (year: number) => void;
  color: string;
  tick: (v: number) => string;
  /** 選んだ年の棒の上に出す表記。 */
  short: (v: number) => string;
  format: (v: number) => string;
  height?: number;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const M = YEAR_MARGIN;
  const x = yearBand(years, width);
  const y = scaleLinear()
    .domain([0, Math.max(...values.map((v) => v ?? 0), 1)])
    .nice(4)
    .range([height - M.bottom, M.top]);
  const every = x.step() < 22 ? 5 : x.step() < 34 ? 2 : 1;
  const bw = x.bandwidth();

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} className="block">
          {y.ticks(4).map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x1={M.left} x2={width - M.right} className="stroke-rule" />
              <text x={M.left - 6} dy="0.32em" textAnchor="end" className="tnum fill-faint text-[10px]">
                {tick(t)}
              </text>
            </g>
          ))}

          {years.map((yr, i) => {
            const v = values[i] ?? null;
            const x0 = x(yr)!;
            const cx = x0 + bw / 2;
            const isFocused = yr === focused;
            const partial = months[i]! < 12;
            const hit = Math.max(x.step(), 18);
            return (
              <g
                key={yr}
                role="button"
                tabIndex={0}
                aria-pressed={isFocused}
                aria-label={`${yr}年`}
                onClick={() => onFocus(yr)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    onFocus(yr);
                  }
                }}
                className="group cursor-pointer outline-none"
              >
                <rect
                  x={cx - hit / 2}
                  width={hit}
                  y={M.top - 16}
                  height={height - M.top + 16 - M.bottom + 2}
                  rx={3}
                  className={`group-focus-visible:stroke-ink group-focus-visible:stroke-2 ${
                    isFocused ? "fill-ink/[0.045]" : "fill-transparent hover:fill-ink/[0.025]"
                  }`}
                />
                {v !== null && (
                  <rect
                    x={partial ? x0 + 0.75 : x0}
                    width={partial ? Math.max(0, bw - 1.5) : bw}
                    y={y(v)}
                    height={Math.max(0, y(0) - y(v) - (partial ? 0.75 : 0))}
                    fill={partial ? "none" : color}
                    stroke={partial ? color : "none"}
                    strokeWidth={1.5}
                    opacity={status[i] === "estimate" ? 0.45 : 1}
                  >
                    <title>{`${yr}年 ${format(v)}`}</title>
                  </rect>
                )}
                {v !== null && isFocused && (
                  <text x={cx} y={y(v) - 5} textAnchor="middle" className="tnum fill-ink text-[10px] font-semibold">
                    {short(v)}
                  </text>
                )}
                {(yr % every === 0 || isFocused) && (
                  <text
                    x={cx}
                    y={height - M.bottom + 16}
                    textAnchor="middle"
                    className={`tnum text-[10.5px] ${isFocused ? "fill-ink font-semibold" : "fill-muted"}`}
                  >
                    {yr}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
