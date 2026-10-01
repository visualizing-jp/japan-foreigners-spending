/**
 * 年ごとの値の線。値のない年で線を切る。年の位置は YearBars と同じ帯の中央。
 */

import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { useWidth } from "../hooks/useWidth.ts";
import { YEAR_MARGIN, yearBand } from "./YearBars.tsx";

export function YearLine({
  years,
  values,
  focused,
  onFocus,
  color,
  tick,
  short,
  format,
  height = 200,
  label,
}: {
  years: number[];
  values: (number | null)[];
  focused: number;
  onFocus: (year: number) => void;
  color: string;
  tick: (v: number) => string;
  /** 選んだ年の点の上に出す表記。 */
  short: (v: number) => string;
  format: (v: number) => string;
  height?: number;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const M = YEAR_MARGIN;
  const x = yearBand(years, width);
  const cx = (yr: number) => x(yr)! + x.bandwidth() / 2;
  const y = scaleLinear()
    .domain([0, Math.max(...values.map((v) => v ?? 0), 1)])
    .nice(4)
    .range([height - M.bottom, M.top]);
  const path =
    line<number | null>()
      .defined((v) => v !== null)
      .x((_, i) => cx(years[i]!))
      .y((v) => y(v!))(values) ?? "";
  const every = x.step() < 22 ? 5 : x.step() < 34 ? 2 : 1;
  const fi = years.indexOf(focused);
  const fv = fi < 0 ? null : (values[fi] ?? null);

  const nearest = (clientX: number, svg: SVGSVGElement) => {
    const px = clientX - svg.getBoundingClientRect().left;
    return years.reduce((a, b) => (Math.abs(cx(b) - px) < Math.abs(cx(a) - px) ? b : a));
  };

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          onClick={(ev) => onFocus(nearest(ev.clientX, ev.currentTarget))}
          className="block cursor-pointer"
        >
          {y.ticks(4).map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x1={M.left} x2={width - M.right} className="stroke-rule" />
              <text x={M.left - 6} dy="0.32em" textAnchor="end" className="tnum fill-faint text-[10px]">
                {tick(t)}
              </text>
            </g>
          ))}
          {fi >= 0 && (
            <rect
              x={x(focused)! - (x.step() - x.bandwidth()) / 2}
              width={x.step()}
              y={M.top - 16}
              height={height - M.top + 16 - M.bottom + 2}
              rx={3}
              className="fill-ink/[0.045]"
            />
          )}
          <path d={path} fill="none" stroke={color} strokeWidth={2} />
          {years.map((yr, i) => {
            const v = values[i] ?? null;
            return (
              v !== null && (
                <circle key={yr} cx={cx(yr)} cy={y(v)} r={yr === focused ? 3.5 : 2} fill={color}>
                  <title>{`${yr}年 ${format(v)}`}</title>
                </circle>
              )
            );
          })}
          {fv !== null && (
            <text x={cx(focused)} y={y(fv) - 8} textAnchor="middle" className="tnum fill-ink text-[10px] font-semibold">
              {short(fv)}
            </text>
          )}
          {years.map(
            (yr) =>
              (yr % every === 0 || yr === focused) && (
                <text
                  key={yr}
                  x={cx(yr)}
                  y={height - M.bottom + 16}
                  textAnchor="middle"
                  className={`tnum text-[10.5px] ${yr === focused ? "fill-ink font-semibold" : "fill-muted"}`}
                >
                  {yr}
                </text>
              ),
          )}
        </svg>
      )}
    </div>
  );
}
