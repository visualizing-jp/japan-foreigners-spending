# 訪れた外国人は、いくら使ってきたか

観光庁「インバウンド消費動向調査」（旧「訪日外国人消費動向調査」）をもとに、訪日外国人の旅行消費額を時代／国・地域／費目の3つの切り口で探索するダッシュボード。

- 想定URL: https://japan-foreigners-spending.visualizing.jp/
- シリーズ: [日本にいる外国人は、どこから来たか](https://japan-foreigners.visualizing.jp/)（`../japan-foreigners/`）

visualizing.jp スタンドアロン（dataviz.jp サブスクツールではない）。

## 開発

```bash
brew install poppler   # PDF の読み取りに pdftotext を使う
npm install
npm run fetch && npm run normalize && npm run data && npm run verify
npm run dev
```

| スクリプト | 内容 |
| --- | --- |
| `npm run fetch` | 各年の年間値と当年の四半期の PDF を `data/raw/` へ（`-- --force` で取り直し） |
| `npm run normalize` | 正規化 JSON を `data/normalized/` へ |
| `npm run data` | 配信用 JSON を `public/data/` へ |
| `npm run verify` | 費目の和・国籍の和・1人当たり×人数の突き合わせ |
| `npm run dev` | Vite 開発サーバ |
| `npm run build` | 本番ビルド |
| `npm run typecheck` | TypeScript 検査 |

データ設計の正本は [`docs/data-sources.md`](docs/data-sources.md)。

## ビュー

- **時代** — 旅行消費額の総額と1人当たり旅行支出（2010–）
- **国・地域** — 年ごとの順位と、上位の構成の推移、選んだ国の1人当たり旅行支出
- **費目** — 宿泊費・飲食費・交通費・娯楽等サービス費・買物代の構成（2015–）

## デプロイ

`main` への push で GitHub Pages にデプロイ（`.github/workflows/pages.yml`）。カスタムドメインは `public/CNAME`。
