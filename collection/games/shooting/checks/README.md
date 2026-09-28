# 自機の切り抜き・噴射・衝突判定

`index.html?inspect-player` で通常・スピード・パワーの実際の描画を拡大し、
当たり判定と噴射口を重ねて確認できます。炎のフレームと左右の傾きをスライダーで変更できます。
ページ下部で透明部分の通過、機体への接触、噴射口の接続、移動、画面端、
二重被弾防止、アセット読み込みの回帰チェックを実行します。

## 座標の基準

- `sprites/*_clean.png` は透明な背景を持つ切り抜き画像です。元画像は残しています。
- 高さ55pxを基準に縦横比を保って表示します。機体選択で形状・速度・初期武器・HPが変わり、武器アイテムでは機体の外見は変わりません。
- `sprite-animation.js` が同じフレーム・ピボットで描画と噴射口を合わせます。
  敵の命中判定は `player-geometry.js` のアルファ値160以上の輪郭を使用します。
- 噴射口は `fleet-data.js` の `players[].nozzles` に、切り抜き後の幅・高さに対する
  0〜1の座標で保存しています。画像を交換した場合はここを測り直し、スプライトを再ビルドしてください。
- 炎は噴射口に根元を固定したCanvas描画で、炎の長さだけが変化します。
- 自機の被弾判定は **赤：半径5px / 青：8px / 黄：10pxの円** です。
  設定は `fleet-data.js` の `hitRadius`、実際の判定は `game.js` の `playerHitbox()`。
  輪郭判定から、小さな円へ変更しました。円外の翼・噴射炎は無害です。
  描画フレームの余白や傾きで中心・半径が変わらず、敵接触と敵弾の両方で同じ円を使用します。
- 被弾時の赤い色は機体だけに合成し、透明余白を矩形で塗りません。

## 画像編集の記録

内蔵 imagegen の背景切り抜き編集を、通常・スピード・パワーの元PNGに各1回使用。
生成したPNGの透明余白をトリミングし、長辺256pxに書き出しています。
生成された大きな元画像は Codex の generated_images に保持し、ゲームはこの
フォルダ内の `*_clean.png` だけを参照します。

書き出した画像:

- `collection/games/shooting/sprites/01_player_standard_clean.png`
- `collection/games/shooting/sprites/02_player_speed_clean.png`
- `collection/games/shooting/sprites/03_player_power_clean.png`

ブラウザ検証: 27項目すべてPASS。通常ゲームの起動・ドラッグ移動・発射を確認。

## 全機体の追加検証

`?inspect-fleet` は3自機・18敵機・6ボスの傾き、専用攻撃、5種類の爆発を
実際のゲームモジュールでプレビューします。PNGシートのリンク、ボス練習リンクを併設。
自動検証には各傾きでの噴射口、画面端、全敵機の出現、18専用武器、
ボスの予告・休止、貫通弾のダメージ間隔、リトライ初期化、30/60/120/144Hz、
初期武器での対ボス撃破ベンチ、3種類の小円判定と実弾での円内/円外への接触を含みます。
190項目すべてPASS。検証ページはハイスコアを保存しません。

各画像のプロンプト（`{variant}` は `standard` / `speed` / `power`）:

```text
Use case: background-extraction
Asset type: transparent spaceship sprite for an existing 2D scrolling shooting game.
Input image: edit target, the existing {variant} player ship.
Primary request: cleanly cut out this EXACT spacecraft on a genuinely transparent RGBA background. Remove only all stray colored/white speckling, fringe, glow, isolated pixels, and remnants outside the solid hull silhouette, including in gaps between the wings. Keep the entire original ship: identical silhouette, proportions, nose pointing straight up, orthographic top-down perspective, original colors, panel details, cockpit, wings and left/right engine housings. No redesign or additional details. The solid hull and its original dark outline must remain crisp and fully opaque. Include no exhaust flame, no shadow, no aura, no checkerboard baked into image, no labels. One single ship centered upright, with a small even transparent margin. Do not crop any tip. This is a precision extraction, not a new ship design.
```
