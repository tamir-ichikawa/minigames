# ミニゲームシリーズ

ブラウザですぐ遊べる、シンプルなワンタップゲーム集です。

## 収録ゲーム

- GOAT JUMP - 30秒で10本目のバーへ進み、待っている子ヤギを救出する横スクロールアクション
- 15パズル - 数字をスライドして順番に並べる定番パズル
- モグラたたき - 30秒で反射神経を競うタップゲーム
- 神経衰弱 - 絵柄のペアを探す記憶ゲーム
- Enzine Rythm - ドラム／ボーカル／ベース／ギターを選び、タップした時刻に演奏パートが鳴るフル尺リズムゲーム
- Collection の36本 - 上記5本と同じトップ一覧から直接選択できます。改良版「モグモグ・ポム」もこちらに含まれます。

全41本を収録。2026-09-09の更新では新規16本を追加し、ジャンプとカードバトルに新版の改善をマージしました。旧「ぱくぱく！まりもラン」は削除しました。

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
- 反射神経テストをPhaser + TypeScriptへ試験移行。その他は互換アダプターで動作。
- 共通の起動・停止・再開・再起動・終了・ミュートと、将来のプラットフォーム用境界を追加。

[調査・設計・移行記録](docs/architecture.md) / [ゲーム追加手順](docs/adding-games.md) / [検証記録](docs/verification.md)

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

### GitHub Pagesへの初回反映

`.github/workflows/pages.yml` を用意しています。GitHub上の初回実行・公開元切替はまだ行っていません。

1. [リポジトリのPages設定](https://github.com/tamir-ichikawa/minigames/settings/pages)を開き、**Build and deployment → Source** を **GitHub Actions** に変更します。テンプレートから別のworkflowを作る必要はありません。旧方式で新しいソースが配信されないよう、mainへpushする前に切り替えます。
2. 今回の変更をコミットしてmainへpushします。新規の`.github/workflows/pages.yml`、`games`、`src`、`scripts`、`templates`、`tests`、`package.json`、`package-lock.json`も含めてください。`node_modules`、`dist`、`.test-output`は.gitignoreで除外しています。
3. [Actions](https://github.com/tamir-ichikawa/minigames/actions)で **Build and deploy Pages** を開き、buildとdeployの両方が成功したことを確認します。テスト・型検査・ビルド・ブラウザー検証が失敗した場合、公開処理は実行されません。
4. [公開サイト](https://tamir-ichikawa.github.io/minigames/)で一覧とゲームの起動を確認します。

以後はmainへのpushで検証と公開が自動実行されます。main向けPull Requestでは検証のみ実行し、公開しません。手動再実行はActionsの **Run workflow** でmainを選びます。GitHub Actions上でビルドするため、distを手作業でアップロードする必要はありません。

### Enzine Rythm のファイル構成

- `enzine-rythm/` - ゲーム本体、譜面エディター、譜面JSON
- `enzine-rythm/assets/bgm/` - 同じ開始位置・長さに揃えた伴奏と演奏パート

曲の登録は `enzine-rythm/tracks.json`、パート構成と譜面は各曲のJSONで管理します。「κの底で」のドラム／ボーカル版、「EDGE ON THE BIT」のドラム版、「PULSE」のドラム／ベース／ギター版を収録しています。
