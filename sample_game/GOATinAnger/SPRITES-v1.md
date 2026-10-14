# スプライト制作記録

2026-10-15 / 内蔵 image_gen ツールを使用。

- `goat-actions-v1.png`: ヤギ4種類、各10ポーズ、1983×793、透過PNG。
- `fox-actions-v1.png`: 狐6種類、各10ポーズ、1619×971、透過PNG。
- 元画像は `素材/` と既存の `public/assets/goat-*.png`, `fox*.png` に保持。
- 各行の列順: 待機A / 待機B / 歩行A / 歩行B / 構え / 発射 / 被弾 / 膝をつく / 倒れる / 勝利（狐は警戒）。
- `src/sprites.js` で実出力の余白を考慮した領域を128pxセルへランタイム配置し、足元を揃える。静止画全体の上下移動ではなく、アクション別に絵柄を切り替える。
- 待機・歩行・射撃・被弾・倒れる・勝利の6状態。倒れる動きは最後のコマで停止。左右は反転対応、上下方向専用の絵柄は未制作。
- 狐2〜6の一部は既存立ち絵の完全な再現ではなく、狐1・狐4を参考にしたゲーム用バリエーション。

## ヤギ生成プロンプト

Use case: stylized-concept. Create production game sprite atlas, real transparent background, 2560x1024, EXACTLY 10 columns x 4 rows equal 256x256 cells. No text, no grid lines, no shadows/backdrop. Reference images are character identity references, not edit targets. Four goat soldiers in charming detailed hand-painted anime game style, simplified for 72px display, consistent 3/4 front view facing right, full body with feet baseline at 90% of every cell. Each character fills 75% cell height and stays fully inside cell with padding. Keep head, horns, uniform, colors consistent throughout each row. Row1 leader male goat green beret olive uniform brown backpack. Row2 scout female goat green beret binoculars olive uniform. Row3 medic goat medical satchel olive uniform. Row4 sturdy rifleman goat thick horns olive uniform. EXACT action sequence across 10 columns for EACH row: 1 idle relaxed, 2 idle breathing slightly shoulders raised, 3 walk left foot forward right arm forward, 4 walk right foot forward left arm forward (clearly different leg poses), 5 aiming rifle to right, 6 shooting rifle to right recoil muzzle flash, 7 flinching from hit eyes closed, 8 dropping onto one knee defeated, 9 lying down defeated non-graphic, 10 happy victory salute. All upright poses use same scale and same baseline. Knee and lying poses are lower in their cell retaining character scale. Preserve consistent character identity. Distinct articulated limbs per action, not merely translated copies. No blood. Exactly forty sprites evenly aligned in ten columns and four rows.

## 狐生成プロンプト

Use case: stylized-concept. Production transparent game sprite atlas with EXACTLY 10 columns and 6 rows of equal square cells, total aspect 5:3, requested 2560x1536. 60 sprites total. No text/grid/borders/background. Input images character design references. Hand painted charming chibi anime sprites matching goat military game. Six distinct fox soldiers: row1 orange fox officer peaked cap dark charcoal uniform red piping; row2 orange fox infantry dark cap; row3 pale silver fox dark uniform; row4 lavender long-haired fox female dark uniform boots; row5 dark brown fox heavy soldier; row6 sandy fox scout dark uniform. Keep recognizable fox ears and fluffy tails, full modest military clothing, consistent each row. Three-quarter front view facing right. Each sprite entirely WITHIN its cell with 12% margin ALL sides, weapons tails and effects must fit within same cell, never overlap adjacent cells. Same scale feet baseline 88% cell height in each upright pose. EXACT columns each row: 1 idle, 2 idle breathe, 3 walk left foot forward, 4 walk right foot forward, 5 aim rifle right, 6 fire rifle right small muzzle flash recoil, 7 flinch hit, 8 fall to knee, 9 lying down defeated, 10 standing guard. Frames8-9 lower stance without scaling up. Non-graphic, no blood. Make walk steps distinctly different legs and arms. Exactly ten evenly spaced columns six evenly spaced rows. True transparent background.
