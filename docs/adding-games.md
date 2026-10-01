# ゲームの追加・無効化・削除

## Phaser + TypeScript（標準）

```sh
npm run new-game -- my-game
npm run dev
```

`games/my-game/`に`manifest.json`、`index.ts`、`thumbnail.svg`を生成する。既存フォルダは上書きしない。最初から起動可能なPhaserゲームなので、Sceneと登録情報を編集するだけでよい。開発サーバーの再ビルド後、ブラウザーを再読み込みすると一覧に表示される。

手動でフォルダを作成してもよい。登録の例:

```json
{
  "id": "my-game",
  "title": "新しいゲーム",
  "description": "タップしてあそぼう。",
  "thumbnail": "games/my-game/thumbnail.svg",
  "category": "action",
  "enabled": true,
  "engine": "phaser",
  "module": "games/my-game/index.ts",
  "order": 100,
  "color": "#d5eeeb",
  "icon": "🎮"
}
```

パスはmanifestからではなく**リポジトリルートからの相対パス**。idは英小文字・数字・`-`・`_`、先頭は英小文字か数字で重複不可。categoryはaction/puzzle/brain/other。thumbnailは実在ファイル。新規ゲームを増やしてもランチャー・ビルド設定・一覧HTMLの編集は不要。

moduleは`createGame(): GameModule`をexportする。参考は`games/reflex/index.ts`と`templates/phaser/index.ts.template`。モジュール読込時にはゲームを生成せず、init以降で生成する。Phaserアダプター使用時はScene.createでreadyを必ず呼ぶ。SceneのDOM補助UI等はSHUTDOWN/DESTROY時に解除する。

アセットはゲームフォルダにまとめて、例えば次のように読み込む:

```ts
this.load.image('player', context.assetUrl('games/my-game/assets/player.png'));
context.platform.storage.write('my-game:best:v1', best);
context.reportScore({ value: points, unit: '点', direction: 'higher' });
```

通常はPhaserの入力とゲームオブジェクトを使う。DOMボタンを併用する場合は親context.containerの内部へ追加し、破棄時に除去する。Space/Enterだけに依存せず、タッチ・マウス・キーボードでも操作できるUIを用意する。

## 既存HTML/Canvasゲーム

HTML/JS/CSS/アセットを`games/my-game/`へ入れ、engineを`legacy`、moduleを`games/my-game/index.html`にする。HTMLには通常の`<head>`を置く。ビルド時に管理用ブリッジが自動挿入される。元のゲームを変更せずiframe経由で起動できる。

DOMの数値を公開する場合は任意のscore設定を追加できる:

```json
"score": { "selector": "#score", "unit": "点", "direction": "higher" }
```

より複雑な状態はゲーム自身で`window.MinigameScore = () => ({ value, unit, direction })`を定義する。ラベル付きDOMから無理に数値を推測しない。未確定ならnullを返す。

任意のHTMLを置く方式は**信頼した自作ゲーム用**。外部由来の未知のコードには使わない。サービスワーカー、Web Worker、独自ネイティブ連携等を使うゲームは汎用ブリッジの対象を超えるため、個別のGameModuleでリソース管理を実装する。

## 独自Canvas/WebGLモジュール

engineをcanvasまたはwebglにし、TypeScriptでGameModuleを実装する。描画方式をランチャーに意識させず、context.containerにcanvasを置く。init/start/pause/resume/reset/destroy/getScore/setSettingsを実装し、stop/destroyで自分のRAF/イベント/音声/GPUリソースを解放する。Phaser依存は不要。

## 無効化と削除

- 一時的な無効化: manifestのenabledをfalseにして再ビルド。
- 完全に一覧から除外: ゲームのフォルダを削除して再ビルド。
- セーブデータと旧URLは別管理。無効化だけでセーブを消さない。
- 独立したフォルダは他ゲームから直接importしない。必要な共有処理だけsrc/core等へ分離する。

## 確認

```sh
npm run typecheck
npm test
npm run build
npm run test:browser
```

ブラウザー検証はChrome/Chromiumを使う。macOSにGoogle Chromeがあれば自動検出、それ以外は`npx playwright install chromium`、または`CHROME_PATH`に実行ファイルを指定。結果とスクリーンショットは`.test-output/`。

ゲーム追加後は、一覧・直接URL・起動・入力・停止中の時間・再開・リセット・終了・保存・小さい画面を確認する。既存ゲームを変更した場合だけ、そのルール固有の回帰検証を広げる。
