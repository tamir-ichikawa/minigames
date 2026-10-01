# STAR BOUNCE（仮称）

名前の候補は **STAR BOUNCE**（弾む楽しさ）、**STAR RALLY**（対戦のわかりやすさ）、**STAR POP ORBIT**（ポップな宇宙観）。今回は STAR BOUNCE を仮採用。商標の使用可否は未調査。

## 今回の仕様

- 宇宙ステージ「ルミの星めぐり」を選択して開始。時間制限・勝利点数なし。5回ミスすると終了。
- HPはピンク、水色、黄色、紫、緑の星。ミスするたびに右から1つ消える。
- 操作はドラッグ／マウス、左右キー・A/D、左右の画面ボタン。取手のない光のバーを使用。
- 返球10点、相手のバーを抜くゴール100点、UFO250点、流れ星150点。
- UFOと流れ星は間欠的に横切り、衝突した球は反射。1つのターゲットは1回だけ得点し消える。
- ステージ内側の塗りは透明。背景の暗いフィルターも弱め、星空が見える表示。
- UFOは傾き・ライト・噴射光、流れ星は尾の揺れ・きらめきの4コマアニメーション。右向き・左向きとも本体に当たり判定を合わせる。
- ルミは通常ダンス、返球で応援、プレイヤーの得点で落ち込み、プレイヤーのミスで喜ぶ。
- 4種類・各4フレームの透過PNGシート（2×2、1254×1254、1セル627×627）。
- 一時停止、音声設定、やり直しは既存ランチャーの共通機能。最高得点はステージごとに保存。
- ストーリーモードや未制作ステージは今回実装しない。

## 山本さんと共同開発する場所

`games/pong/` が新版の本体。IDとURLの `pong` は既存リンクの互換性のため維持。

| ファイル | 役割 |
| --- | --- |
| `manifest.json` | ゲーム一覧の名前、説明、サムネイル、登録 |
| `index.ts` | 共通Phaserアダプターへの接続 |
| `stages.ts` | ステージ名、背景、キャラクター、色、難易度、ボーナス設定 |
| `model.ts` | 描画や保存に依存しないルールと固定時間刻みの物理 |
| `scene.ts` | Phaserの表示、アニメーション、入力、効果音、結果画面 |
| `assets/` | ゲーム固有の背景、スプライト、サムネイル、音声 |

新しいステージは固有IDで `STAR_STAGES` に1件追加し、その背景・スプライトを配置する。既存ステージを複製してから変更すること。最高得点キーにもIDを使う。新しいゲームそのものは `npm run new-game -- game-id` で別フォルダを作成。HTML単体の試作品や差し替え相談用データは従来通り `sample_game/` へ置けるが、それだけではゲーム一覧の公開内容は変わらない。

旧ピンポンの `collection/games/pong/` は変更せず、直接URLと `legacyUrl` で残している。

## アセット記録

- 背景：提供画像 `B40DF8AF-FD90-4614-8294-309AA0CE0BE4.png` を無加工で `assets/space-background.png` へコピー。
- サムネイル：提供画像 `E631C257-4F7B-479C-9316-5E2B3DB6FE1F.png` を無加工で `assets/thumbnail.png` へコピー。
- アニメーション：提供キャラ画像を参照し `image_gen.imagegen` で生成。プロンプトは `docs/star-bounce-image-prompts.json`。
- 保存先：`games/pong/assets/alien-idle.png`、`alien-sad.png`、`alien-happy.png`、`alien-return.png`。
- ボーナス画像：`image_gen.imagegen`で生成した `games/pong/assets/ufo-flight-sheet.png` と `games/pong/assets/comet-flight-sheet.png`。各1254×1254の透過PNG、2×2コマ。プロンプトは `docs/star-bounce-bonus-prompts.json`。原画像を加工せずフレームごとの表示基準点を調整し、コマ切り替え時の本体のずれを抑える。
- 音声：`scripts/star-bounce-audio.mjs` で合成した独自の短いチャイム。`return.wav`、`goal.wav`、`miss.wav`、`bonus.wav`。

特定作品の名前・ロゴ・固有キャラクター・音楽・特徴的な武器の造形を取り込まず、提供されたミント色のキャラクターと星・宇宙・光のバーを軸にする。これは法的な非侵害保証ではない。公開時の権利確認やタイトルの商標確認は別途必要。

参考：[文化庁：著作権のポイント](https://www.bunka.go.jp/seisaku/chosakuken/taisetsu/point/index.html)、[特許庁：商標検索](https://www.jpo.go.jp/support/startup/shohyo_search.html)。

## 検証

- `npm test`：既存5件と宇宙ラリー6件。5ミス終了、30連続ゴールでも継続、バーと壁の反射、UFOと流れ星の一度だけの得点、速度上限、30/60/144fpsで同じ結果を確認。
- `npm run build`：TypeScript型検査、41本の登録と静的ビルド。
- `npm run test:browser`：既存41本の単体版とランチャー経由の起動・一時停止・再開、既存ゲームの操作チェックに加え、STAR BOUNCEを検証。
- `node tests/star-bounce-browser.mjs`：STAR BOUNCEだけ再検証。実画面での操作、実際のSceneを使ったテスト専用ページで得点・リアクション・5つの星消失・ゲームオーバー・保存・リトライ・終了時の解放を確認。UFOと流れ星のフレーム進行、左右の向き、一時停止中のアニメ停止、命中・削除時のスプライト解放も確認。テスト用の強制状態変更コードは製品に含めない。
- Chromeの390×844 / 375×667のタッチ端末エミュレーション、WebGLを無効にしたCanvas描画を確認。実機iOS / Androidの検証は未実施。
