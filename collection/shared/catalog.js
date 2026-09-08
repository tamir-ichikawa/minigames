const GAME_CATALOG=[
  {
    "id": "dash",
    "title": "コハク便ダッシュ",
    "category": "action",
    "icon": "🦊",
    "color": "#fae5c8",
    "description": "安全な配達列か、金星への寄り道か。ルートを選ぼう。",
    "tag": "",
    "art": "assets/characters/dash.svg"
  },
  {
    "id": "shooting",
    "title": "アストラ・パトロール",
    "category": "action",
    "icon": "🚀",
    "color": "#dce8f2",
    "description": "編隊を迎撃し、60秒で中ボス。予告を見て回避・反撃。",
    "tag": "",
    "art": "assets/characters/shooting.svg"
  },
  {
    "id": "jump",
    "title": "ケロの空中遺跡",
    "category": "action",
    "icon": "🐸",
    "color": "#deedcf",
    "description": "左右移動、動く足場、壊れる足場を順に学ぶ空中遺跡。",
    "tag": "",
    "art": "assets/characters/jump.svg"
  },
  {
    "id": "flappy",
    "title": "ルナの夜間飛行",
    "category": "action",
    "icon": "🦉",
    "color": "#e5def4",
    "description": "最初の3門は練習コース。10門・20門を目指そう。",
    "tag": "",
    "art": "assets/characters/flappy.svg"
  },
  {
    "id": "flick",
    "title": "ポストン仕分け局",
    "category": "action",
    "icon": "📦",
    "color": "#f2e6c7",
    "description": "次の荷物を見て仕分け。30個配送とエンドレス。",
    "tag": "",
    "art": "assets/characters/flick.svg"
  },
  {
    "id": "tsumiki",
    "title": "星灯りタワー",
    "category": "action",
    "icon": "🏙️",
    "color": "#e3ddf2",
    "description": "切れ端が落ち、10段ごとに空が変わる灯りのタワー。",
    "tag": "",
    "art": "assets/characters/tsumiki.svg"
  },
  {
    "id": "tetris",
    "title": "プリズム・ライン",
    "category": "puzzle",
    "icon": "💎",
    "color": "#d5eeeb",
    "description": "壁際回転と接地猶予で、最後の一手を整えよう。",
    "tag": "",
    "art": "assets/characters/tetris.svg"
  },
  {
    "id": "maze",
    "title": "こもれび迷宮",
    "category": "puzzle",
    "icon": "🧭",
    "color": "#e3edd4",
    "description": "最短で出口へ、または寄り道して木の実を集めよう。",
    "tag": "",
    "art": "assets/characters/maze.svg"
  },
  {
    "id": "matching",
    "title": "珊瑚のペア図鑑",
    "category": "puzzle",
    "icon": "🐠",
    "color": "#d7edf0",
    "description": "海の専用イラストをペアに。全札プレビュー練習も。",
    "tag": "",
    "art": "assets/characters/matching.svg"
  },
  {
    "id": "sudoku",
    "title": "ロジの数字研究所",
    "category": "puzzle",
    "icon": "🤖",
    "color": "#dfe7ef",
    "description": "候補メモと理由ヒント。行・列・四角で考える数字パズル。",
    "tag": "",
    "art": "assets/characters/sudoku.svg"
  },
  {
    "id": "marubatsu",
    "title": "ノヴァと三目勝負",
    "category": "puzzle",
    "icon": "🤖",
    "color": "#e8e0ef",
    "description": "通常対戦と、一手で勝つ・リーチを止める詰め問題。",
    "tag": "",
    "art": "assets/characters/marubatsu.svg"
  },
  {
    "id": "machigai",
    "title": "ミッケの鑑定室",
    "category": "brain",
    "icon": "🔎",
    "color": "#d8ebed",
    "description": "色だけでなく形も見比べる、二列の模様鑑定。",
    "tag": "",
    "art": "assets/characters/machigai.svg"
  },
  {
    "id": "anzan",
    "title": "ひらめき発電所",
    "category": "brain",
    "icon": "⚡",
    "color": "#f3eac6",
    "description": "計算の種類を選び、間違えた問題をゆっくり復習。",
    "tag": "",
    "art": "assets/characters/anzan.svg"
  },
  {
    "id": "karuta",
    "title": "季節の絵札帖",
    "category": "brain",
    "icon": "🎴",
    "color": "#f0e4cf",
    "description": "季節ごとの絵札と文章。任意の読み上げにも対応。",
    "tag": "",
    "art": "assets/characters/karuta.svg"
  },
  {
    "id": "shiritori",
    "title": "ことばの小径",
    "category": "brain",
    "icon": "🐍",
    "color": "#dfeddb",
    "description": "複数の正しい言葉から選んで、10回つなごう。",
    "tag": "",
    "art": "assets/characters/shiritori.svg"
  },
  {
    "id": "typing",
    "title": "ことば通信局",
    "category": "brain",
    "icon": "⌨️",
    "color": "#dce7ef",
    "description": "文字数・正確さ・入力時間を分けて練習。",
    "tag": "",
    "art": "assets/characters/typing.svg"
  },
  {
    "id": "card_battle",
    "title": "小さな騎士の五連戦",
    "category": "other",
    "icon": "🛡️",
    "color": "#e8deeb",
    "description": "敵の予告を読んでカードを選び、戦闘後に成長。",
    "tag": "",
    "art": "assets/characters/card_battle.svg"
  },
  {
    "id": "janken",
    "title": "ポン太の三手勝負",
    "category": "other",
    "icon": "🐻",
    "color": "#eee0cc",
    "description": "気分の予告、くり返し派、均等確率から相手を選ぶ。",
    "tag": "",
    "art": "assets/characters/janken.svg"
  },
  {
    "id": "oekaki",
    "title": "いろのアトリエ",
    "category": "other",
    "icon": "🎨",
    "color": "#eee5d7",
    "description": "ペン・直線・丸・下絵。UndoとRedoで自由に描こう。",
    "tag": "",
    "art": "assets/characters/oekaki.svg"
  },
  {
    "id": "marimo-run",
    "title": "モグモグ・ポム",
    "category": "action",
    "icon": "🍊",
    "color": "#f3e5cf",
    "description": "最初の敵で食べるタイミングを練習。3段階の変身へ。",
    "tag": "",
    "art": "assets/characters/marimo-run.svg"
  },
  {
    "id": "beat_tap",
    "title": "ビートタップ",
    "category": "other",
    "icon": "🥁",
    "color": "#eddef1",
    "description": "拍に合わせてタップ。速さを選んでタイミングを磨こう。",
    "tag": "",
    "art": "assets/characters/beat_tap.svg"
  },
  {
    "id": "breakout",
    "title": "ブロック崩し",
    "category": "action",
    "icon": "🧱",
    "color": "#e2ecdb",
    "description": "パドルでボールを返し、ブロックを消して次のレベルへ。",
    "tag": "",
    "art": "assets/characters/breakout.svg"
  },
  {
    "id": "bubble",
    "title": "バブルポップ",
    "category": "action",
    "icon": "🫧",
    "color": "#e2ecdb",
    "description": "泡をタップして連鎖。60秒でハイスコアを目指そう。",
    "tag": "",
    "art": "assets/characters/bubble.svg"
  },
  {
    "id": "coin",
    "title": "コインキャッチ",
    "category": "action",
    "icon": "🪙",
    "color": "#e2ecdb",
    "description": "かごを動かしてコインを集め、危険な落下物をよけよう。",
    "tag": "",
    "art": "assets/characters/coin.svg"
  },
  {
    "id": "colormatch",
    "title": "カラーマッチ",
    "category": "brain",
    "icon": "🎨",
    "color": "#e3e8f3",
    "description": "文字に惑わされず、お題と同じ色を選ぼう。",
    "tag": "",
    "art": "assets/characters/colormatch.svg"
  },
  {
    "id": "crane",
    "title": "クレーンゲーム",
    "category": "action",
    "icon": "🏗️",
    "color": "#e2ecdb",
    "description": "クレーンを止めるタイミングを狙って景品を集めよう。",
    "tag": "",
    "art": "assets/characters/crane.svg"
  },
  {
    "id": "fruitcut",
    "title": "フルーツカット",
    "category": "action",
    "icon": "🍎",
    "color": "#e2ecdb",
    "description": "指でフルーツを切ろう。爆弾に注意！",
    "tag": "",
    "art": "assets/characters/fruitcut.svg"
  },
  {
    "id": "hanoi",
    "title": "ハノイの塔",
    "category": "puzzle",
    "icon": "🗼",
    "color": "#f2e8d4",
    "description": "円盤を一枚ずつ動かして、右の棒へ積み直そう。",
    "tag": "",
    "art": "assets/characters/hanoi.svg"
  },
  {
    "id": "numorder",
    "title": "数字順タップ",
    "category": "brain",
    "icon": "🔢",
    "color": "#e3e8f3",
    "description": "散らばった数字を1から順番に探してタップ。",
    "tag": "",
    "art": "assets/characters/numorder.svg"
  },
  {
    "id": "pattern",
    "title": "パターン記憶",
    "category": "brain",
    "icon": "🧠",
    "color": "#e3e8f3",
    "description": "光る順番を覚えて再現。3回のチャンスでどこまで進める？",
    "tag": "",
    "art": "assets/characters/pattern.svg"
  },
  {
    "id": "pong",
    "title": "ピンポン",
    "category": "action",
    "icon": "🏓",
    "color": "#e2ecdb",
    "description": "パドルを動かして相手のコートへ打ち返そう。",
    "tag": "",
    "art": "assets/characters/pong.svg"
  },
  {
    "id": "reflex",
    "title": "反射神経テスト",
    "category": "brain",
    "icon": "⚡",
    "color": "#e3e8f3",
    "description": "緑に変わった瞬間をタップ。5回の反応時間を比べよう。",
    "tag": "",
    "art": "assets/characters/reflex.svg"
  },
  {
    "id": "renda",
    "title": "連打チャレンジ",
    "category": "action",
    "icon": "💥",
    "color": "#e2ecdb",
    "description": "時間内に何回タップできる？モードを選んで挑戦。",
    "tag": "",
    "art": "assets/characters/renda.svg"
  },
  {
    "id": "slot",
    "title": "絵柄スロット",
    "category": "other",
    "icon": "🎰",
    "color": "#eddef1",
    "description": "リールを止めて絵柄を揃えよう。ゲーム内コインで遊べます。",
    "tag": "",
    "art": "assets/characters/slot.svg"
  },
  {
    "id": "speed_tap",
    "title": "早押しタップ",
    "category": "action",
    "icon": "🎯",
    "color": "#e2ecdb",
    "description": "ターゲットを狙って連続タップ。ボムを避けてコンボを伸ばそう。",
    "tag": "",
    "art": "assets/characters/speed_tap.svg"
  },
  {
    "id": "which_more",
    "title": "どっちが多い？",
    "category": "brain",
    "icon": "🤔",
    "color": "#e3e8f3",
    "description": "ふたつの箱を見比べて、数が多い方を選ぼう。",
    "tag": "",
    "art": "assets/characters/which_more.svg"
  }
];
