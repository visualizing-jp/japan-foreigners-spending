import { Suspense } from "react";
import { EraView } from "./views/EraView.tsx";
import { MarketsView } from "./views/MarketsView.tsx";
import { CategoryView } from "./views/CategoryView.tsx";
import { PlacesView } from "./views/PlacesView.tsx";
import { useUrlState } from "./hooks/useUrlState.ts";
import { SeriesBar, SeriesFooter } from "./components/Brand.tsx";

const VIEWS = [
  { id: "era", label: "時代", hint: "2010–" },
  { id: "markets", label: "国・地域", hint: "2010–" },
  { id: "category", label: "費目", hint: "2015–" },
  { id: "places", label: "都道府県", hint: "2018–" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export function App() {
  const [view, setView] = useUrlState<ViewId>("view", "era", (v) => VIEWS.some((x) => x.id === v));

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-paper/85 backdrop-blur-sm">
        <SeriesBar />
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-end justify-between gap-4 px-6 pt-5">
          <div className="pb-2">
            <h1 className="text-[15px] font-semibold tracking-tight">訪れた外国人は、いくら使ってきたか</h1>
            <p className="text-[11px] text-muted">観光庁「インバウンド消費動向調査」（旧「訪日外国人消費動向調査」）</p>
          </div>
          <nav className="-mb-px flex gap-1" aria-label="ビュー">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-current={view === v.id ? "page" : undefined}
                className={`cursor-pointer border-b-2 px-3 pt-1 pb-2 text-[13px] whitespace-nowrap transition-colors duration-150 ${
                  view === v.id ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {v.label}
                <span className="ml-1.5 text-[10px] font-normal text-faint max-sm:hidden">{v.hint}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <Suspense key={view} fallback={<Loading />}>
        {view === "era" && <EraView />}
        {view === "markets" && <MarketsView />}
        {view === "category" && <CategoryView />}
        {view === "places" && <PlacesView />}
      </Suspense>

      <footer className="mx-auto w-full max-w-[1240px] px-6 pt-2 pb-10 text-[11px] leading-relaxed text-faint">
        出典: 観光庁「インバウンド消費動向調査」（2024年1–3月期までは「訪日外国人消費動向調査」）の各年の年間値の報告書・集計結果と、当年の四半期の2次速報。
        2010–2018・2020・2021年の資料は国立国会図書館インターネット資料収集保存事業（WARP）で保存されたもの。
        旅行消費額は訪日外国人旅行者が日本滞在中に支出した額で、日本に住む外国人を含まない。
        都道府県はB1地域調査（一般客）の2018・2019年と2024年以降。県の和は全国と一致しない。
        各年の値は費目の和、国籍・地域の和、1人当たり旅行支出×旅行者数と突き合わせて一致を確かめている。
        <SeriesFooter />
      </footer>
    </div>
  );
}

function Loading() {
  return <div className="mx-auto w-full max-w-[1240px] px-6 py-16 text-[12px] text-faint">読み込み中</div>;
}
