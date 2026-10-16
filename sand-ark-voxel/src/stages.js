/**
 * ステージ定義
 * 各ステージ = Wave 1〜3（間に砂嵐）→ ボス戦 → クリアでメニューへ戻る
 *
 * waves: 各Waveに出現する敵の種類リスト
 *   drone   : 通常弾を撃つ浮遊ボックス
 *   stunner : スタン電撃弾
 *   burner  : 炎上弾
 *   rammer  : コアが赤く光った後に体当たり突進（吹き飛ばし注意）
 * bossPatterns: ボスが順番に繰り出す攻撃パターン
 */
export const STAGES = [
  {
    id: 1,
    name: '月下の砂海',
    sub: 'MOONLIT SAND SEA',
    desc: '静かな月夜の砂海。砂中から巨大な砂鯨が姿を現す。',
    boss: 'leviathan',
    bossName: 'SAND LEVIATHAN 砂鯨',
    bossHp: 9000,
    bossPatterns: ['volley', 'leap', 'volley', 'summon'],
    shipSpeed: 55,
    waves: [
      ['drone', 'drone', 'drone', 'drone', 'drone'],
      ['drone', 'drone', 'drone', 'stunner', 'stunner', 'drone'],
      ['drone', 'stunner', 'drone', 'stunner', 'drone', 'drone', 'stunner']
    ],
    theme: {
      sky: 0x070d21, fog: 0x0c1633, storm: 0x6e4e32,
      moon: 0xf4faff, moonGlow: 0x70c4ff, ring: 0x80e5ff,
      dune: 0x1e294a, duneEmissive: 0x0b132b, spores: 0x64ffda,
      hemiSky: 0x6f9ceb, hemiGround: 0x261b38
    }
  },
  {
    id: 2,
    name: '蒼晶の砂丘',
    sub: 'CRYSTAL DUNES',
    desc: '青い結晶が砂から突き出す砂丘。結晶碑が光線で甲板を焼き払う。',
    boss: 'prism',
    bossName: 'PRISM MONOLITH 蒼晶碑',
    bossHp: 12000,
    bossPatterns: ['beam', 'volley', 'summon', 'beam', 'rain'],
    shipSpeed: 60,
    waves: [
      ['drone', 'stunner', 'drone', 'stunner', 'drone', 'drone'],
      ['burner', 'drone', 'stunner', 'burner', 'drone', 'rammer'],
      ['rammer', 'burner', 'stunner', 'drone', 'rammer', 'burner', 'stunner', 'drone']
    ],
    theme: {
      sky: 0x060f24, fog: 0x0a1f3d, storm: 0x355a7a,
      moon: 0xdff6ff, moonGlow: 0x4fa8ff, ring: 0x9fd4ff,
      dune: 0x173252, duneEmissive: 0x0a1d3a, spores: 0x8fd8ff,
      hemiSky: 0x5aa2ff, hemiGround: 0x14243d
    }
  },
  {
    id: 3,
    name: '紅月の大砂嵐',
    sub: 'CRIMSON STORM',
    desc: '紅い月が昇る夜。光輪を背負う巨神が甲板へ降り立つ。',
    boss: 'omega',
    bossName: 'OMEGA COLOSSUS 紅月の巨神',
    bossHp: 15000,
    bossPatterns: ['volley', 'board', 'rain', 'beam', 'summon', 'board'],
    shipSpeed: 65,
    waves: [
      ['drone', 'burner', 'stunner', 'rammer', 'drone', 'burner', 'drone'],
      ['rammer', 'rammer', 'burner', 'stunner', 'drone', 'burner', 'stunner', 'drone'],
      ['rammer', 'burner', 'stunner', 'rammer', 'burner', 'stunner', 'drone', 'drone', 'rammer']
    ],
    theme: {
      sky: 0x14060c, fog: 0x2a0d14, storm: 0x7a3a24,
      moon: 0xffd0c0, moonGlow: 0xff5a4a, ring: 0xff8a6a,
      dune: 0x3a1a1e, duneEmissive: 0x1e070b, spores: 0xff9e7a,
      hemiSky: 0xd2687a, hemiGround: 0x2a1014
    }
  }
];
