# ミニゲームシリーズ

ブラウザですぐ遊べる、ミニゲーム集です。

## 収録ゲーム

- INVADER ATTACK - 3つの難易度・トーチカ・UFO・連射に対応したインベーダーシューティング

- DDE ダンスダンスエボリューション - 佐藤さんの4レーンリズムゲーム。2曲・3難易度・リバースに対応

- マロの大冒険 - 猫のマロをドラッグで導き、ナックルの木橋とスパイクの追跡を抜けて栞音に会う10ステージのアクションパズル

- BALL＆PIT - 反射するボールと強化で3ウェーブとボスに挑むアクション
- STAR BOUNCE - 7人の相棒とGOOD／DARK各3章を進める、必殺技付きラリーゲーム
- GOAT in ANGER - 約3頭身のヤギで森林・渓谷・前哨地を進む、移動と射撃を別々に操作する縦スクロールシューティング
- GOAT JUMP - 30秒で10本目のバーへ進み、待っている子ヤギを救出する横スクロールアクション
- 15パズル - 数字をスライドして順番に並べる定番パズル
- モグラたたき - 30秒で反射神経を競うタップゲーム
- 神経衰弱 - 絵柄のペアを探す記憶ゲーム
- Enzine Rythm - ドラム／ボーカル／ベース／ギターを選び、タップした時刻に演奏パートが鳴るフル尺リズムゲーム
- Collection の36本 - 上記のゲームと同じトップ一覧から直接選択できます。改良版「モグモグ・ポム」もこちらに含まれます。

全46本を収録（STAR BOUNCEはCollectionの既存枠を更新）。2026-09-09の更新では新規16本を追加し、ジャンプとカードバトルに新版の改善をマージしました。旧「ぱくぱく！まりもラン」は削除しました。

## ローカルで遊ぶ

Node.js 22以上を使用します。

```sh
npm ci
npm run dev
```

表示された `http://127.0.0.1:4173/` を開いてください。変更時は再ビルドされるのでブラウザーを再読み込みします。

```sh
npm run build       # 型検査＋distへの静的ビルド
npm run preview     # distをローカルで確認
npm test            # 登録・ライフサイクル・ゲームルールの検証
npm run test:browser # Chrome/Chromiumで従来版と移行版を比較
npm run new-game -- my-game # Phaser + TypeScriptの新規ひな形
```

新しいランチャーはHTTP/HTTPSで使用します。ソースのindex.htmlを直接ダブルクリックする方式から変更しています。従来のゲーム単独HTML/URLは残しています。

## 2026-10-01 モジュール化

- 41本の一覧を `games/*/manifest.json` から自動生成。追加・無効化・削除でランチャーを編集する必要はありません。
- 追加サンプルの15パズル・早押しタップ・星灯りタワーの改良版を採用。原本と従来版を保持。
- 反射神経テストとSTAR BOUNCE（旧ピンポン）をPhaser + TypeScriptで実装。その他は互換アダプターで動作。
- 共通の起動・停止・再開・再起動・終了・ミュートと、将来のプラットフォーム用境界を追加。

[調査・設計・移行記録](docs/architecture.md) / [ゲーム追加手順](docs/adding-games.md) / [検証記録](docs/verification.md)

[STAR BOUNCEの現行仕様・編集するファイル](sample_game/STAR_BOUNCE/README.md) / [旧クラシック版の開発記録](docs/star-bounce.md)

### STAR BOUNCE のストーリー版

`sample_game/STAR_BOUNCE/` に、GOOD／DARKのキャラ選択・固有技・両ルート3章を実装しています。既存の `games/pong/` から接続し、公開URL `play.html?game=pong` を維持しています。

```sh
npm run dev:star-bounce # http://127.0.0.1:4174/
```

[ルール・素材対応・編集手順](sample_game/STAR_BOUNCE/README.md)。通常の配布ビルドに含め、共通プレイヤーの停止・再開・消音・再起動に対応しています。以前のクラシック版の保存データは残し、ストーリー版の記録は別キーで保存します。

### GOAT JUMP のファイル構成

- `sky-jump.html` - 画面構造
- `styles/sky-jump.css` - レイアウトと見た目
- `scripts/sky-jump.js` - ゲーム進行、物理、入力、アニメーション
- `assets/sky-jump/goat-sprite-sheet-v1.png` - 4列×3行のヤギスプライト
- `assets/sky-jump/goat-sprite-sheet.json` - セル寸法とフレーム名
- `scripts/goat-kid.js` - 子ヤギの待機・喜びジャンプ描画
- `assets/sky-jump/kid-idle-v1.png` - 待機8コマ（4列×2行、背景透過）
- `assets/sky-jump/kid-joy-v2.png` - 喜びジャンプ8コマ（4列×2行、背景透過）

スタートのバーは0本目。着地した回数ではなく到達したバーの番号で進捗を数え、二段ジャンプで飛び越えたバーも含みます。最後のバーより先は生成されず、ステージ1は10本目、ステージ2は12本目がゴールです。ゴールの上空を通過するだけではクリアせず、着地すると親が止まり、子ヤギが約2.4秒喜んだ後に結果を表示します。

空中通過ではカウントだけを更新し、バーの粒・画面の揺れ・効果音は着地時だけ発生します。カウント済みのバーに初めて着地した場合も、着地演出は一度だけ発生します。

変更前の縦スクロール版は `backups/sky-jump-vertical/` に保存しています。

Web公開では `npm run build` で生成した **distの内容** を配布してください。ソースルートの直接公開では新ランチャーは動きません。リポジトリ名を含むサブディレクトリ公開にも対応します。

### GitHub Pagesへの反映

`.github/workflows/pages.yml` により、mainへのpushでテスト・型検査・ビルド・ブラウザー検証と公開を実行します。main向けPull Requestは検証のみ実行します。distを手作業でアップロードする必要はありません。

[Actionsの実行結果](https://github.com/tamir-ichikawa/minigames/actions) / [公開サイト](https://tamir-ichikawa.github.io/minigames/)

おすすめ欄は、実装・修正・動作確認を重ねた13本を先に表示します。[選定と並べ替え](docs/recommendations.md)。

### Enzine Rythm のファイル構成

- `enzine-rythm/` - ゲーム本体、譜面エディター、譜面JSON
- `enzine-rythm/assets/bgm/` - 同じ開始位置・長さに揃えた伴奏と演奏パート

曲の登録は `enzine-rythm/tracks.json`、パート構成と譜面は各曲のJSONで管理します。「κの底で」のドラム／ボーカル版、「EDGE ON THE BIT」のドラム版、「PULSE」のドラム／ベース／ギター版を収録しています。

### GOAT in ANGER

`sample_game/GOATinAnger/` に、旧「仮ゲーム」フォルダのPhaserシューティング本体と原画素材を移動しました。`games/goatinanger/` で一覧登録し、通常の開発・配布ビルドに含めています。STAR BOUNCEも同じ配布ビルドに含まれます。

```sh
npm run dev                # 一覧 → GOAT in ANGER
npm run dev:goatinanger    # ゲーム単独のVite開発サーバー
npm run test:goatinanger   # 移動・射程・隊員能力のテスト
```

共通プレイヤーの直接URLは `play.html?game=goatinanger`。既存ゲームと同じ停止・再開・リセット・終了・ミュート操作を利用できます。ソース変更時は親の開発サーバーも再ビルドします。

[操作・仕様・単独起動の説明](sample_game/GOATinAnger/README.md)

### 全ゲーム共通の画面対応ルール

新規追加・改修するゲームは、幅や高さが変わってもゲーム全体と操作UIを画面内に維持します。比率を保った拡大縮小、モバイルの高さ変化、画面回転、埋め込み、全画面切り替えに対応し、リサイズで進行をリセットしません。[共通ルール](AGENTS.md) / [追加手順](docs/adding-games.md)。既存ゲームすべての一括改修は今回の対象外です。

### マロの大冒険

`sample_game/斉藤さんゲーム/` にPhaser製の10ステージ試作を実装しています。`npm run dev:maro` で単独プレビュー、`npm run build` で共通プレイヤーと単独ページを配布できます。共通URLは `play.html?game=maro-adventure`、単独URLは `sample_game/maro-adventure/`。

[操作・構成・検証手順](sample_game/斉藤さんゲーム/README.md)。`npm run test:maro` でルールとブラウザー操作を検証します。

### DDE / Dance

佐藤さん作成の「DDE ダンスダンスエボリューション」を `Dance/` に取り込み、Phaser版として再構築しました。2曲・6譜面、ノーマル／リバースに対応し、音声出力時刻に基づく判定と画面サイズへの追従を実装しています。原本は `Dance/original/` に保存しています。

`npm run dev:dance` で単独プレビュー（`http://127.0.0.1:4176/Dance/`）、通常のビルドでは `Dance/` と `play.html?game=dance` から遊べます。

[操作・タイミング修正・構成](Dance/README.md)。`npm run test:dance` で判定と音声時計を検証します。

### INVADER ATTACK

`sample_game/invader-attack/invader-attack.html` を共通プレイヤーに登録しています。公開URLは `play.html?game=invader-attack`。左右キー／A・Dで移動、Spaceで発射、スマートフォンでは画面下のボタンを使います。難易度別の最高得点を保存し、一時停止・再開・消音・再起動、縦横画面に対応しています。
