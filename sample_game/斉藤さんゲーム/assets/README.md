# 実行時素材

- `maro.png`：受領原画 `素材/saito_game_001.png` のコピー。透明余白は実行時のPhaserテクスチャフレームで除外します。元画像を書き換えていません。
- `reunion.png`：受領原画 `素材/saito_game_003.png` のコピー。タイトル後の再会画面に使用します。
- `dogs-v1.png`：受領原画 `素材/saito_game_004.png` を参照し、組み込み画像生成ツールで背景を抜いた2セルの素材。左＝スパイク、右＝ナックル。初回の静止素材として保存しています（現在のプレイ中は歩行シートを使用）。透明PNG、1536×1024。
- `medal.wav` / `checkpoint.wav` / `clear.wav` / `miss.wav`：`../audio.mjs` で作成した短い正弦波の効果音。

## 犬素材の最終プロンプト（組み込み image_gen 使用）

Use case: background-extraction. Asset type: transparent 2-character game sprite atlas. Edit target: provided illustration. Extract ONLY the two existing dog characters into ONE image with true transparent alpha background. Remove all city, ground, chains outside the characters, money and scenery. Preserve original character identities, four-legged poses, black leather jackets, necklaces, colors, expressions and original cartoon drawing style. Complete any small occluded body portions naturally. Put SPIKE (the tall slim black-and-tan Doberman originally on LEFT) wholly inside LEFT half of image. Put KNUCKLE (the stocky tan bulldog originally on RIGHT) wholly inside RIGHT half. Two equal-width cells in a single horizontal row, spacious transparent gutter between them, paws aligned near bottom, both full bodies including ears and paws visible. Each figure occupies about 80 percent height of its cell, no overlapping cells. No labels, no ground shadow, no checkerboard, no border. Output genuinely transparent PNG, roughly landscape 1536 by 1024. This is one two-cell sprite atlas, not a new scene.


## 方向別の歩行（2026-10-20）

- `maro-walk-v1.png`：マロ、1254×1254 RGBA。
- `spike-walk-v1.png`：スパイク（原画の左）、1254×1254 RGBA。
- `knuckle-walk-v1.png`：ナックル（原画の右）、1254×1254 RGBA。
- 各画像は上から正面／左／右／背面の4行、左から歩行4コマです。合計48コマ。元のPNGの透明度は変更していません。
- 組み込み `image_gen` で作成。マロは `maro.png`、犬2匹は `dogs-v1.png` を参照。最終プロンプト全文は `walk-prompts.json` に保存しています。
- 画像内の配置は均等なセルではないため、`animation.ts` の明示した矩形で読み込みます。単純な幅÷4による分割は足や尻尾を切るため使用しません。各向きの共通倍率と足元の原点で位置を合わせます。
- 生成元ファイル名：マロ `exec-7f17a839-b6a9-417b-aeda-831fe08ca16f.png`、スパイク `exec-792df3cc-7261-44c5-a2bb-e1b3e8e20533.png`、ナックル `exec-4cd3cb89-15cd-4a09-b2e1-1e9e12f9d5b5.png`。


## 8コマ歩行・改修版

現在の実装は `{maro,spike,knuckle}-{down,left,up}-walk-v2.png` の9枚を使用します。各1536×1024、RGBA、4列×2行の8コマ。右向きは左向きの鏡像です。3匹×4方向×8コマの96方向フレームを登録します（描き下ろしは72コマ）。

- 元絵を参照して組み込み `image_gen` で生成。マロの正面の頭は胴体との比率を小さく調整。
- 最終プロンプト・生成元パス・保存ファイル名は `walk-prompts-v2.json`。
- PNGのRGBには透明領域内の色が含まれます。必ずアルファ付きで表示してください。
- `walk-bounds-v2.json` は8体それぞれの輪郭の範囲。フレームの矩形が隣のキャラクターに重なる箇所は、Phaserへの読み込み時に接続した輪郭を分離します。
- 実行時アトラスは1コマ256×256、足元の基準は(128,232)、向きごとに一定の倍率で配置。入力の隙間に歩行位相をリセットしません。
- 旧 `*-walk-v1.png` は履歴として残しています。32コマを1枚にまとめた途中案はレイアウトが不正確なため未採用です。

歩行コマの確認用一覧は `../previews/walk-cycles-v2.png` に保存しています。
