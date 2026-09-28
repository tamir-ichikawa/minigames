# 自機の切り抜き・噴射・衝突判定

`index.html?inspect-player` で通常・スピード・パワーの実際の描画を拡大し、
当たり判定と噴射口を重ねて確認できます。炎のフレームはスライダーで変更できます。
ページ下部で透明部分の通過、機体への接触、噴射口の接続、移動、画面端、
二重被弾防止、アセット読み込みの回帰チェックを実行します。

## 座標の基準

- `sprites/*_clean.png` は透明な背景を持つ切り抜き画像です。元画像は残しています。
- 高さ55pxを基準に縦横比を保って表示します。武器ごとに横幅が変わります。
- `player-geometry.js` がアルファ値160以上の輪郭まで余白を詰め、描画・衝突・
  噴射口が同じ原点を使うようにします。
- 噴射口は `index.html` の `PLAYER_SPRITES` に、切り抜き後の幅・高さに対する
  0〜1の座標で保存しています。画像を交換した場合はここを測り直してください。
- 炎は噴射口に根元を固定したCanvas描画で、炎の長さだけが変化します。
- 被弾判定は自機の不透明な輪郭と相手の不透明な輪郭の重なりです。
  敵の180度回転を反映し、透明な角・翼の隙間・噴射炎を判定に含めません。
  以前の「中央30%の矩形」から輪郭全体の判定に変更しています。
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

各画像のプロンプト（`{variant}` は `standard` / `speed` / `power`）:

```text
Use case: background-extraction
Asset type: transparent spaceship sprite for an existing 2D scrolling shooting game.
Input image: edit target, the existing {variant} player ship.
Primary request: cleanly cut out this EXACT spacecraft on a genuinely transparent RGBA background. Remove only all stray colored/white speckling, fringe, glow, isolated pixels, and remnants outside the solid hull silhouette, including in gaps between the wings. Keep the entire original ship: identical silhouette, proportions, nose pointing straight up, orthographic top-down perspective, original colors, panel details, cockpit, wings and left/right engine housings. No redesign or additional details. The solid hull and its original dark outline must remain crisp and fully opaque. Include no exhaust flame, no shadow, no aura, no checkerboard baked into image, no labels. One single ship centered upright, with a small even transparent margin. Do not crop any tip. This is a precision extraction, not a new ship design.
```
