# 敵機イラストの背景抽出プロンプト

方式：内蔵 imagegen（API/CLIは未使用）。各原画から1回の抽出、続いて1回の輪郭整理。元原画は変更していません。

保存先：`collection/games/shooting/sprites/atlases/umemura3.png`、`umemura4.png`。
個別切り抜きと5フレームPNGは `sprites/fleet/` と `sprites/sheets/` に生成します。

## umemura3

原画：`sample_game/ASTRA_PATROL_v5/astra patrol.umemura3.png`（編集対象）。

### 抽出

```text
Use case: background-extraction. Asset type: production sprite atlas cut out from the supplied ASTRA PATROL enemy design sheet.
Input is an EDIT TARGET. Extract exactly the 9 different PRIMARY spacecraft designs specified below. Keep their recognizable original designs, colors, hull details, distinct silhouettes. Convert the provided front/top views into a consistent orthographic TOP-DOWN game view with noses pointing UP (towards the TOP of this output). Circular ships remain top-down. No flying exhaust, no stars, no large glows.
Output layout: 3 columns by 3 rows (9 equal square cells), square image. All cells equal in size. Each ship centered independently inside its cell at x=(column+.5)/3 and y=(row+.5)/3. Fit each entire hull into the middle 76% of its cell so at least 12% padding on all four edges. Absolutely no hull may cross a cell boundary. Use a genuinely transparent RGBA background everywhere outside the hulls, including between wings. Clean precise edges with no background fringe. No labels, no text, no grid lines, no UI, no extra designs, no side views, no color-variant duplicates. Do NOT merge ships. EXACT cell order:
Row 1: red fighter (01 ファイター), blue circular support drone (02 サポート), magenta needle speed fighter (03 スピード).
Row 2: purple armored gunship (04 ガンシップ), small cyan circular drone (05 ドローン), blue heavy armor (06 アーマー).
Row 3: large magenta many-winged NEMESIS CORE (01 ネメシス・コア), magenta DEUS LEGION command ship (02 デウス・レギオン), magenta circular OMEGA METEO UFO (03 オメガ・メテオ).
This is an edit/extraction of the reference illustrations for an existing game, NOT a redesign. No perspective tilt in these base cells; banking frames will be assembled in code.
```

### 透明輪郭の整理

前工程のアトラスを編集対象として使用。

```text
Edit this existing transparent spaceship atlas ONLY to clean its alpha silhouettes. Keep the exact number, ordering, colors, orthographic views and hull designs of all 9 ships in 3 columns x 3 rows. Preserve all intact metallic hull detail. There are distracting red/magenta/blue/white speckles and colored auras OUTSIDE the hulls. DELETE every stray or fuzzy fringe pixel outside each solid dark outline, remove ALL exterior glow, retain only each solid ship. No sparkles, no stars, no exhaust. The background must be genuinely transparent RGBA, not black, not checkerboard. All ships are separate cutouts in equal-sized grid cells; scale each ship down uniformly enough to fit within middle 70 percent of its own cell so there is ample EMPTY TRANSPARENT padding on every side; no overlapping cells. Maintain exact center of each cell. No text or grid lines. Crisp isolated game cutouts, no background remnants. Square image.
```

## umemura4

原画：`sample_game/ASTRA_PATROL_v5/astra patrol.umemura4.png`（編集対象）。

### 抽出

```text
Use case: background-extraction. Asset type: production sprite atlas cut out from the supplied ASTRA PATROL enemy design sheet.
Input is an EDIT TARGET. Extract exactly the 15 different PRIMARY spacecraft designs specified below. Keep their recognizable original designs, colors, hull details, distinct silhouettes. Convert the provided front/top views into a consistent orthographic TOP-DOWN game view with noses pointing UP (towards the TOP of this output). Circular ships remain top-down. No flying exhaust, no stars, no large glows.
Output layout: 3 columns by 5 rows (15 equal square cells), portrait image with exact aspect ratio 3:5. All cells equal in size. Each ship centered independently inside its cell at x=(column+.5)/3 and y=(row+.5)/5. Fit each entire hull into the middle 76% of its cell so at least 12% padding on all four edges. Absolutely no hull may cross a cell boundary. Use a genuinely transparent RGBA background everywhere outside the hulls, including between wings. Clean precise edges with no background fringe. No labels, no text, no grid lines, no UI, no extra designs, no side views, no color-variant duplicates. Do NOT merge ships. EXACT cell order:
Row 1: blue fighter (01 ファイター), magenta seeker (02 シーカー), white-blue multi-pod spherical cluster (03 クラスター).
Row 2: green scout (04 スカウト), red hunter (05 ハンター), purple spherical float (06 フロート).
Row 3: orange aegis armor (07 イージス), cyan ring (08 リング), dark-orange turret (09 タレット).
Row 4: pink spherical bomb (10 ボム), purple spiked spinner (11 スピナー), white-purple layered fighter (12 レイヤー).
Row 5: white-blue large core maiden boss (01 コア・メイデン), dark magenta tentacled neon behemoth boss (02 ネオン・ベヒーモス), gold-blue ring celestial catastrophe boss (03 セレスティアル・カタストロフ).
This is an edit/extraction of the reference illustrations for an existing game, NOT a redesign. No perspective tilt in these base cells; banking frames will be assembled in code.
```

### 透明輪郭の整理

前工程のアトラスを編集対象として使用。

```text
Edit this existing transparent spaceship atlas ONLY to clean its alpha silhouettes. Keep the exact number, ordering, colors, orthographic views and hull designs of all 15 ships in 3 columns x 5 rows. Preserve all intact metallic hull detail. There are distracting red/magenta/blue/white speckles and colored auras OUTSIDE the hulls. DELETE every stray or fuzzy fringe pixel outside each solid dark outline, remove ALL exterior glow, retain only each solid ship. No sparkles, no stars, no exhaust. The background must be genuinely transparent RGBA, not black, not checkerboard. All ships are separate cutouts in equal-sized grid cells; scale each ship down uniformly enough to fit within middle 70 percent of its own cell so there is ample EMPTY TRANSPARENT padding on every side; no overlapping cells. Maintain exact center of each cell. No text or grid lines. Crisp isolated game cutouts, no background remnants. Portrait aspect ratio 3:5.
```


