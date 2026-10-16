// ===== Parts Data =====
// World: AI "GRID" has gone rogue and seized control of all infrastructure.
//        Humans pilot mech frames as the last resistance against the machine empire.

export const PARTS_DB = {
    body: [
        {
            id: 'standard_frame',
            name: 'Standard Frame',
            desc: 'バーストウェーブ: 衝撃波で周囲の弾を消しつつダメージ',
            hp: 3,
            bombType: 'burst_wave',
            bombCooldown: 15000,
            rarity: 'C',
            color: '#00f0ff',
            series: 'Standard',
            flavor: 'レジスタンスの制式フレーム。旧世代の軍用規格だが、信頼性は折り紙付き。内蔵された衝撃波発生装置により、緊急時に周囲の敵弾を一掃できる。'
        },
        {
            id: 'assault_frame',
            name: 'Assault Frame',
            desc: 'オメガレーザー: 前方に極太ビーム照射。発動中移動不可',
            hp: 2,
            bombType: 'omega_laser',
            bombCooldown: 18000,
            rarity: 'B',
            color: '#ff2244',
            series: 'Phantom',
            flavor: 'GRIDの巡回ドローンから回収した装甲を転用した攻撃型フレーム。赤い塗装は威嚇のため。装甲が薄い代わりに、前方に極太のオメガレーザーを照射する攻撃特化設計。'
        },
        {
            id: 'fortress_frame',
            name: 'Fortress Frame',
            desc: 'アブソリュートバリア: 自分と周囲の味方を無敵化',
            hp: 5,
            bombType: 'absolute_barrier',
            bombCooldown: 25000,
            rarity: 'A',
            color: '#aa44ff',
            series: 'Apex',
            flavor: '崩壊前の防衛省地下研究所で発見された試作重装甲。生存性を極限まで追求した設計。全フレーム中最大のHP5を誇り、絶対障壁による味方全体の無敵化も可能。'
        },
        {
            id: 'speedster_frame',
            name: 'Speedster Frame',
            desc: 'クロックアップ: 自分以外の時間を遅くする',
            hp: 2,
            bombType: 'clock_up',
            bombCooldown: 20000,
            rarity: 'S',
            color: '#ffee00',
            series: 'Zero',
            flavor: 'GRIDのコアコードの断片が埋め込まれた禁忌のフレーム。時間干渉能力の源泉。発動すると周囲の時間流を0.3倍に減速させ、敵弾と攻撃を5秒間スローにする。'
        }
    ],
    mainWeapon: [
        {
            id: 'rapid_vulcan',
            name: 'Rapid Vulcan',
            desc: '連射速度に優れる機関銃',
            fireRate: 100,
            damage: 5,
            pattern: 'vulcan',
            rarity: 'C',
            color: '#00f0ff',
            series: 'Standard',
            flavor: '制式採用された回転式機関砲。100ms間隔の高速連射で弾幕を張る。一発の威力は控えめだが、手数で圧倒するレジスタンスの基本戦術を体現した武器。'
        },
        {
            id: 'wide_spread',
            name: 'Wide Spread',
            desc: '広範囲(3way〜5way)拡散弾',
            fireRate: 200,
            damage: 4,
            pattern: 'spread',
            rarity: 'B',
            color: '#00ff88',
            series: 'Phantom',
            flavor: '鹵獲したGRID散弾砲の改造品。3方向への同時発射で広範囲を制圧する。単発威力は低いが、面で捉えるため移動する標的にも当てやすい。'
        },
        {
            id: 'homing_missiles',
            name: 'Homing Missiles',
            desc: '低威力だが自動追尾するミサイル',
            fireRate: 350,
            damage: 6,
            pattern: 'homing',
            rarity: 'A',
            color: '#ff8800',
            series: 'Apex',
            flavor: '旧世界の誘導技術を復元した追尾弾。GRIDの電子戦に耐える独自周波数を使用。発射後に自動でボスを追尾するため、回避に集中しながら安定した火力を維持できる。'
        },
        {
            id: 'plasma_cutter',
            name: 'Plasma Cutter',
            desc: '射程は短いが貫通する高威力カッター',
            fireRate: 150,
            damage: 12,
            pattern: 'cutter',
            rarity: 'S',
            color: '#ff00aa',
            series: 'Zero',
            flavor: 'GRID中枢の防壁を切り裂くために開発された禁断の兵器。プラズマ化した刃が敵を貫通し、消滅せずに奥の標的にも到達する。接近戦での瞬間火力は全武装中最高。'
        }
    ],
    subWeapon: [
        {
            id: 'sniper_cannon',
            name: 'Sniper Cannon',
            desc: 'ロックオン後、超高速の狙撃弾を発射',
            fireRate: 800,
            damage: 40,
            pattern: 'sniper',
            rarity: 'C',
            color: '#00f0ff',
            series: 'Standard',
            flavor: '遠距離支援用の狙撃砲。レジスタンスの古参パイロットに愛用者が多い。発射間隔は長いが、一撃40ダメージの超高速弾が左右の砲身から放たれる。'
        },
        {
            id: 'floating_bits',
            name: 'Floating Bits',
            desc: 'ビットを射出し全方位からオールレンジ攻撃',
            fireRate: 300,
            damage: 8,
            pattern: 'bits',
            rarity: 'B',
            color: '#aa44ff',
            series: 'Phantom',
            flavor: 'GRIDの偵察ユニットを改造した遠隔攻撃端末。まるで意思を持つかのように動く。4基のビットが機体の左右に展開し、それぞれがボスに向けて誘導弾を放つ。'
        },
        {
            id: 'charge_lance',
            name: 'Charge Lance',
            desc: 'チャージしてから極太ビームを放つ',
            fireRate: 1500,
            damage: 80,
            pattern: 'charge',
            rarity: 'A',
            color: '#ffee00',
            series: 'Apex',
            flavor: 'エネルギー圧縮技術の結晶。一撃の威力は対GRID戦の切り札となる。停止状態を維持するほどチャージが溜まり、最大で通常の3倍の破壊力を持つ極太ビームを放つ。'
        },
        {
            id: 'repair_field',
            name: 'Repair Field',
            desc: '攻撃せず周囲に回復フィールドを展開(ヒーラー)',
            fireRate: 500,
            damage: 0,
            pattern: 'repair',
            healAmount: 0.5,
            rarity: 'S',
            color: '#00ff88',
            series: 'Zero',
            flavor: 'GRIDのナノマシン技術を逆用した修復装置。敵の技術で味方を救う皮肉な兵器。攻撃能力を持たない代わりに、周囲の味方のHPを継続的に回復するヒーラー専用装備。'
        }
    ],
    backpack: [
        {
            id: 'boost_vernier',
            name: 'Boost Vernier',
            desc: 'ハイジャンプ: 画面上空へ退避し無敵状態で着地',
            actionType: 'jump',
            cooldown: 5000,
            moveSpeed: 4, // slow
            rarity: 'C',
            color: '#00f0ff',
            series: 'Standard',
            flavor: '標準噴射装置。跳躍による一時退避が可能。重いが確実。出力の大半を跳躍に回すため移動速度は全バックパック中最も遅いが、弾幕を丸ごと飛び越える安心感がある。'
        },
        {
            id: 'blink_drive',
            name: 'Blink Drive',
            desc: 'テレポート: 前方へ瞬間移動(弾抜け)',
            actionType: 'teleport',
            cooldown: 4000,
            moveSpeed: 6, // normal
            rarity: 'B',
            color: '#aa44ff',
            series: 'Phantom',
            flavor: 'GRIDの空間転移技術の劣化コピー。完全な再現には程遠いが、弾を避けるには十分。前方150pxへの瞬間移動で弾幕をすり抜ける。通常の移動速度は標準的。'
        },
        {
            id: 'shield_generator',
            name: 'Shield Generator',
            desc: 'リフレクター: 一瞬シールド展開し弾を反射',
            actionType: 'reflect',
            cooldown: 6000,
            moveSpeed: 6, // normal
            rarity: 'A',
            color: '#ffee00',
            series: 'Apex',
            flavor: '戦前の防衛衛星に搭載されていた反射シールドの小型版。敵弾を送り返す。反射された弾は1.5倍の速度でボスに向かい、直撃時には15ダメージを与える攻防一体の装備。'
        },
        {
            id: 'decoy_eject',
            name: 'Decoy Eject',
            desc: 'デコイ射出: 分身を残して後退',
            actionType: 'decoy',
            cooldown: 7000,
            moveSpeed: 8, // fast
            rarity: 'S',
            color: '#ff00aa',
            series: 'Zero',
            flavor: '自身の戦闘データを記録した精巧な囮を射出する。GRIDすら一瞬騙される精度を持つ。囮は3秒間敵の標的となり、その間に本体は高速で離脱できる。全バックパック中最速の機動力。'
        }
    ],
    accessory: [
        {
            id: 'none',
            name: 'None',
            desc: 'アクセサリなし',
            effect: 'none',
            rarity: 'C',
            color: '#666',
            series: '—',
            flavor: '何も装備していない空きスロット。補助効果は得られないが、他の4スロットに集中投資する戦略もある。'
        },
        {
            id: 'auto_reloader',
            name: 'Auto-Reloader',
            desc: '連射速度UP',
            effect: 'fire_rate_up',
            value: 0.7,
            rarity: 'B',
            color: '#00f0ff',
            series: 'Phantom',
            flavor: 'GRIDの自動装填機構を小型化した補助装置。メインとサブ両方の発射間隔を30%短縮し、単位時間あたりの火力を大幅に向上させる。'
        },
        {
            id: 'nano_skin',
            name: 'Nano Skin',
            desc: 'HP自動回復(微量)',
            effect: 'auto_heal',
            value: 0.1,
            interval: 5000,
            rarity: 'A',
            color: '#00ff88',
            series: 'Apex',
            flavor: '微小な修復機械が装甲表面を這い回り、損傷を自動修復する。5秒ごとにHP0.1を回復。微量だが長期戦では生存率を大きく左右する。'
        },
        {
            id: 'radar_sensor',
            name: 'Radar Sensor',
            desc: '敵弾の軌道予測線表示',
            effect: 'radar',
            rarity: 'A',
            color: '#ffee00',
            series: 'Apex',
            flavor: 'GRIDの攻撃パターンを解析し、弾道を予測線として表示する戦術支援装備。被弾率の低下に直結するため、上級パイロットほどこの装備を好む傾向がある。'
        },
        {
            id: 'revive_kit',
            name: 'Revive Kit',
            desc: '蘇生速度短縮(3秒→1.5秒)',
            effect: 'revive_speed',
            value: 0.5,
            rarity: 'S',
            color: '#ff00aa',
            series: 'Zero',
            flavor: '瀕死の味方を蘇生するGRID由来の医療技術。通常3秒かかる蘇生時間を半分の1.5秒に短縮する。マルチプレイでの生存率を劇的に変える協力特化装備。'
        },
        {
            id: 'energy_condenser',
            name: 'Energy Condenser',
            desc: 'ボムのクールタイム短縮',
            effect: 'bomb_cooldown',
            value: 0.6,
            rarity: 'S',
            color: '#aa44ff',
            series: 'Zero',
            flavor: '次元圧縮によりエネルギーを凝縮する装置。ボムのクールダウンを40%短縮し、必殺技の回転率を飛躍的に高める。ボス戦での決定力が求められる局面で真価を発揮する。'
        }
    ]
};

export function getPartById(slot, id) {
    return PARTS_DB[slot].find(p => p.id === id) || PARTS_DB[slot][0];
}

export function getDefaultLoadout() {
    return {
        body: 'standard_frame',
        mainWeapon: 'rapid_vulcan',
        subWeapon: 'sniper_cannon',
        backpack: 'boost_vernier',
        accessory: 'none'
    };
}

export function getGachaPool() {
    const pool = [];
    for (const slot of Object.keys(PARTS_DB)) {
        for (const part of PARTS_DB[slot]) {
            if (part.id === 'none') continue;
            if (part.id === 'standard_frame' || part.id === 'rapid_vulcan' ||
                part.id === 'sniper_cannon' || part.id === 'boost_vernier') continue;
            pool.push({ slot, ...part });
        }
    }
    return pool;
}
