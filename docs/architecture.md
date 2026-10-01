# ミニゲームプラットフォームの設計・移行記録

## 調査結果（2026-10-01）

変更前はビルド・npm依存・TypeScriptのない静的HTML/JavaScriptサイト。トップに41本（独立5本＋Collection 36本）を掲載していた。

| 対象 | 変更前の構造と課題 |
| --- | --- |
| フレームワーク・言語 | Vanilla JavaScript、HTML、CSS。IIFE、トップレベルのvar/let、インラインscript、ES modulesが混在。Phaserなし |
| 描画 | DOM/CSSとCanvas 2D。GOAT、リズム、シューティング等に独自描画。直接のWebGL/Shader実装は確認できず。特殊なスプライト切抜き・噴射・衝突処理は温存が適切 |
| ディレクトリ | `collection/games/<id>`に36本。`sky-jump.html`＋scripts/assets、`enzine-rythm`、`sample_game`に独立ゲーム。backups/deliverablesは履歴・配布物 |
| 一覧 | ルートHTMLに41枚を手書き。別の`collection/shared/catalog.js`にも36本を登録。タイトル・説明・本数が二重管理 |
| 起動・終了 | アンカーによるページ遷移と戻るリンク。全ゲーム共通のインスタンス契約はない |
| ゲーム進行 | requestAnimationFrame、setTimeout、setInterval、Date.now、performance.now、AudioContext.currentTimeが混在。一部ゲームはフレーム数に依存 |
| 共通UI・入力 | `collection/shared/shell.js`が操作キー再割当、タッチパッド、設定、停止、BGM、効果音、試遊メモを提供。ゲーム側はDOMイベントや個別のドラッグ処理も使用 |
| スコア・保存 | localStorageを各ゲームが直接使用。点数、反応ms、手数、正解数など意味が異なる。保存キーはrfx1、tsm2、spt2、ゲーム別v4キーなど。共通の順位表なし |
| 音声 | HTML AudioのBGM、Web Audioの効果音、リズム専用StemPlayer。ユーザー操作からの音声開始と音楽用クロックへの配慮が必要 |
| アセット | ゲームローカル、collection/assets、root assets、リズム音源、JSON、SVG。改良15パズルは画像をHTMLにdata URLで同梱 |
| 共有ロジック | shell/rules/art、共通スタイル。rulesは迷路・数独等の補助。シューティングはすでに描画/攻撃/データが分離 |
| プラットフォーム依存 | DOM/window、localStorage、AudioContext、fetch、画面サイズ、URLの相対参照が直接使用される。iOS/Android/Steam APIは未実装 |
| 移行の危険箇所 | shellのグローバルタイマー差替え、固定60Hzのゲーム、キー合成、IIFE内の非公開状態、直接保存、相対アセットURL、音楽の時計。一括のTS化/Phaser化は不適切 |

ユーザー追加分の実フォルダ名は`sample_game`。`new15puzzle`、`speed_tap`、`星灯りタワー改良版_完全版_v3`を確認した。原本は変更せず、実行用コピーを`games`に取り込んだ。

## 採用構成

```text
index.html / collection/index.html   登録情報から描画する一覧
play.html                            共通プレイヤー
src/
  core/types.ts                      エンジン非依存の契約
  core/host.ts                       ライフサイクル遷移を直列化
  launcher/catalog.ts                一覧・カテゴリ・カード
  launcher/player.ts                 起動・終了・停止・設定・エラーUI
  adapters/legacy.ts                 iframeの所有者、通信、破棄
  adapters/legacy-bridge.ts           旧ページ内だけの互換処理
  adapters/phaser.ts                 Phaser.Gameの所有者
  platform/web.ts                    保存、旧記録読取、非表示通知
 games/<id>/
  manifest.json                      1ゲーム1登録
  index.ts / index.html               新規TSまたは移植したHTML
  model.ts / scenes / assets ...      任意のゲーム専用実装
 collection / scripts / assets ...   温存した従来実装
 templates/phaser                    新規ゲームのひな形
 scripts/build.mjs                   自動発見・検査・遅延import・静的ビルド
 tests/                             契約/集計/ブラウザーの回帰検証
 dist/                              配布物（Git管理外）
```

登録の唯一の正本は`games/*/manifest.json`。古いcatalog.jsは削除。ルート一覧とCollection一覧は同じデータを使用する。順番はorder、同順位はid。登録情報には実装の種類と実体パスを保持し、一覧のためにゲームコードを実行しない。ゲームは選択時にdynamic importする。

`enabled:false`は登録検査の早期段階で除外されるため、無効ゲームの実装がなくてもビルドできる。フォルダ削除も自動反映。存在しないidへのアクセスはエラー画面で復帰できる。重複idや有効ゲームの欠損ファイルはビルド時に理由付きで検出する。削除/無効化は一覧からの除外であり、旧URLや既存セーブの削除ではない。

## 共通ライフサイクル

`GameModule`は`init / start / pause / resume / reset / destroy / getScore / setSettings`を実装する。`init`の非同期完了を待ってから`start`する。startはゲーム画面を開く操作で、各ゲームのタイトル/難易度選択は保つ。resetは記録を残してタイトルへ戻す。destroyはcanvas/iframe、音声、イベント等を解放する。

ホストはロード・停止・再開・リセット・終了を直列化し、途中失敗したモジュールも破棄する。旧ページのready/ackはタイムアウト付き。通信はorigin、source、セッションIDを検証する。複数ゲームを同時に常駐させない。

スコアは`{value, unit, direction}`、未公開/未確定は`null`。`higher`/`lower`を区別する。反射神経テストは平均msを返し、歴代最速は別に保存。15パズルは手数、タワーは段数、早押しは点数を返す。既存全ゲームの非公開状態を推測して収集しない。まだスコアを公開しない旧ゲームは自身のHUD/結果画面を使用する。全ゲーム横断ランキングは今回の範囲外。

## 旧実装の互換性

旧ゲームは同一originのiframeで実行する。JavaScriptのグローバル、CSS、Canvas、入力、時計をランチャーから隔離する。自作コードを信頼して実行する互換境界であり、不審なHTMLを実行するセキュリティsandboxではない。

ビルド出力のHTMLにのみブリッジを先頭挿入し、管理iframeのセッション指定時だけ有効化する。ソースの従来ゲームは変更しない。従来URLの単独起動も保持する。シェル使用ページは既存GameShellの時計に委譲し、その他はiframe内のRAF/タイマー/時刻を制御する。非シェルのフレーム依存処理は60Hzに正規化する。ランチャーやPhaserのグローバル時計は変更しない。

一時停止は入力、時間、CSSアニメーション、音声を止める。共通ミュートはWeb Audioの出力GainとHTMLメディアに適用し、リズムゲームの時計自体を止めない。終了/リセットは音声Contextを閉じ、iframeの破棄でイベント/タイマーを回収する。既存シェルの操作設定、BGM、タッチパッドは残す。旧ゲーム内にも独自の停止ボタンがあり、その状態表示は旧ゲーム側が担当する。

既存保存キーを変更・削除しない。Phaser反射神経テストは`rfx1`を読み継ぎ、以後は`minigames:v1:reflex:best-ms`へ保存する。改良15パズルは`15puzzle_best`を維持し、矢印キー操作も引き継ぐ。改良タワーは旧`tsm1`と新`tsm2`の最大値を読み継ぐ。早押しは同じ`spt2`を使用する。新規設定/記録はplatform.storage経由、保存失敗時はメモリーへ退避してUIに通知する。公開originを変更した場合の旧localStorage移送はブラウザーの制約上自動では行えない。

## Phaser・Canvas・WebGLの共存

Phaser 3.90.0とTypeScriptをnpm lockfileで固定。公式の型定義を使用。Phaser.AUTOでWebGL優先/Canvasフォールバック、Scale.FITで親領域に収める。独立したGameをアダプターが生成・破棄する。

Sceneでは進行・入力・タイマー・アニメーション・衝突を扱い、純粋なルールはmodel等へ分離する。特殊な描画はPhaserのCanvasTextureや独自WebGL pipeline、別canvasとしてScene内で所有してよい。WebGL専用の処理はサポート検出とCanvas時の代替/説明をそのゲームで用意する。

`engine:canvas`や`engine:webgl`も同じGameModuleを返すTSモジュールとして登録できる。Phaserをimportする義務はない。独自RAF、ResizeObserver、GPUリソース等はモジュールがpause/destroy時に管理する。新しいゲームはグローバル時計/イベントを差し替えない。

公式仕様: [インストール・型定義](https://docs.phaser.io/phaser/getting-started/installation)、[Game/renderer/lifecycle](https://docs.phaser.io/phaser/concepts/game)、[Scene](https://docs.phaser.io/phaser/concepts/scenes)。

## 実施した段階と次の移行

1. 元の41本、共有機能、追加3本を調査。設計と移行順を実装前に提示。
2. 登録・型・platform・ビルドを追加。旧ソースの変更を最小化。
3. 旧ページアダプターを用意し、旧41本の単独起動と管理起動を比較。
4. 改良版3本を独立配置。従来版リンクを残す。
5. 反射神経テストだけPhaserへ移行。5回計測/フライング除外/平均・最速・最遅/保存/再挑戦を保持。
6. 共通アダプターを全41本へ適用。主要4本の操作とサイズ違いをブラウザー検証。

他の40本を一括でPhaserに置換することはしない。次の移行では従来のmoduleをlegacyUrlに残し、同じidのindex.tsを作り、manifestのengine/moduleだけ切り替える。入力・スコア・音・保存・ゲーム終了まで比較してから次のゲームへ進む。問題があればmanifestをlegacyへ戻せる。

## 将来の配布

Webは`dist/`を静的ホストへ配布する。リポジトリのソースルートをそのまま公開する従来設定から、ビルド出力を公開する設定へ変更が必要。HTTP/HTTPSを前提とし、file://での新ランチャー実行は対象外。

Capacitor候補では同じdistをWebViewに同梱し、Webアダプター生成箇所をネイティブの保存/アプリ休止通知を提供する実装へ交換する。Electron候補でも同じWebコードを利用し、OS/Steam機能は限定したpreload/IPCを通じたPlatform実装へ集約する。ゲームSceneへOSやSteam SDKをimportしない。

現時点ではネイティブSDK、課金、実績、配布署名、Steamworks、コントローラー対応は追加していない。旧ゲームのlocalStorage/DOM依存は互換層内に残り、各ゲームを移行する際にplatformへ置き換える。iPhone/iPad/Android実機、Safari、Electron等での最終検証はそれぞれの配布段階で行う。
