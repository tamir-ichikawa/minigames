# ミニゲームシリーズ

ブラウザですぐ遊べる、シンプルなワンタップゲーム集です。

## 収録ゲーム

- GOAT JUMP - 30秒で動く足場を10本登る横スクロールアクション
- 15パズル - 数字をスライドして順番に並べる定番パズル
- モグラたたき - 30秒で反射神経を競うタップゲーム
- 神経衰弱 - 絵柄のペアを探す記憶ゲーム
- ぱくぱく！まりもラン - 迫るモンスターを食べるワンクリックランゲーム
- Enzine Rythm - ドラム／ボーカル／ベース／ギターを選び、タップした時刻に演奏パートが鳴るフル尺リズムゲーム

## ローカルで遊ぶ

`index.html` をブラウザで開くとスタートします。

### GOAT JUMP のファイル構成

- `sky-jump.html` - 画面構造
- `styles/sky-jump.css` - レイアウトと見た目
- `scripts/sky-jump.js` - ゲーム進行、物理、入力、アニメーション
- `assets/sky-jump/goat-sprite-sheet-v1.png` - 4列×3行のヤギスプライト
- `assets/sky-jump/goat-sprite-sheet.json` - セル寸法とフレーム名

変更前の縦スクロール版は `backups/sky-jump-vertical/` に保存しています。

GitHub Pagesへ公開する場合は、リポジトリのルートを公開元に設定してください。

### Enzine Rythm のファイル構成

- `enzine-rythm/` - ゲーム本体、譜面エディター、譜面JSON
- `enzine-rythm/assets/bgm/` - 同じ開始位置・長さに揃えた伴奏と演奏パート

曲の登録は `enzine-rythm/tracks.json`、パート構成と譜面は各曲のJSONで管理します。「κの底で」のドラム／ボーカル版、「EDGE ON THE BIT」のドラム版、「PULSE」のドラム／ベース／ギター版を収録しています。
