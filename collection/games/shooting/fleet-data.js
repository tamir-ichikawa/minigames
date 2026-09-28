(function(root) {
  const players = [
    { id:'player', name:'STANDARD', label:'バランス型', description:'標準弾 / バランス型。当たり判定は中心の半径8pxの円。', speed:4.8, weapon:0, hp:3, hitRadius:8, color:'#64ceff', source:'01_player_standard_clean.png', nozzles:[[.16,.848],[.84,.848]] },
    { id:'player_speed', name:'SPEED', label:'高速・最小判定', description:'レーザー / 高速機。当たり判定は最小、半径5pxの円。', speed:5.8, weapon:2, hp:3, hitRadius:5, color:'#ff627b', source:'02_player_speed_clean.png', nozzles:[[.25,.876],[.75,.876]] },
    { id:'player_power', name:'POWER', label:'耐久・ミサイル', description:'追尾ミサイル / HP4。当たり判定は少し広い半径10pxの円。', speed:3.9, weapon:3, hp:4, hitRadius:10, color:'#ffd15b', source:'03_player_power_clean.png', nozzles:[[.12,.850],[.88,.850]] },
  ];
  const sheets = [
    { id:'umemura3', rows:3, columns:3, names:[
      ['u3_fighter','ファイター'],['u3_support','サポート'],['u3_speed','スピード'],
      ['u3_gunship','ガンシップ'],['u3_drone','ドローン'],['u3_armor','アーマー'],
      ['nemesis','ネメシス・コア'],['deus','デウス・レギオン'],['omega','オメガ・メテオ'],
    ]},
    { id:'umemura4', rows:5, columns:3, names:[
      ['u4_fighter','ファイター II'],['u4_seeker','シーカー'],['u4_cluster','クラスター'],
      ['u4_scout','スカウト'],['u4_hunter','ハンター'],['u4_float','フロート'],
      ['u4_aegis','イージス'],['u4_ring','リング'],['u4_turret','タレット'],
      ['u4_bomb','ボム'],['u4_spinner','スピナー'],['u4_layer','レイヤー'],
      ['maiden','コア・メイデン'],['behemoth','ネオン・ベヒーモス'],['celestial','セレスティアル・カタストロフ'],
    ]},
  ];
  const enemyGroups = {
    core:['u3_fighter','u4_fighter','u4_hunter'],
    scout:['u3_speed','u4_seeker','u4_scout'],
    laser_ship:['u3_gunship','u4_turret','u4_layer'],
    bat:['u3_support','u4_spinner','u4_ring'],
    tank:['u3_armor','u4_aegis','u4_bomb'],
    float:['u3_drone','u4_cluster','u4_float'],
  };
  const bosses = [
    {id:'nemesis',name:'NEMESIS CORE',hp:360,height:112},
    {id:'deus',name:'DEUS LEGION',hp:440,height:108},
    {id:'omega',name:'OMEGA METEO',hp:520,height:105},
    {id:'maiden',name:'CORE MAIDEN',hp:600,height:118},
    {id:'behemoth',name:'NEON BEHEMOTH',hp:700,height:125},
    {id:'celestial',name:'CELESTIAL CATASTROPHE',hp:820,height:120},
  ];
  root.AstraFleet = { players, sheets, enemyGroups, bosses };
})(typeof window === 'undefined' ? globalThis : window);
