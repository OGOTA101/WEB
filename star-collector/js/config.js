/**
 * config.js
 * Game Balance & Configuration Settings
 */

const GAME_CONFIG = {
    // -------------------------------------------------------------------------
    // ■ 難易度設定 (Difficulty & Spawning)
    // -------------------------------------------------------------------------
    DIFFICULTY_TABLE: [
        { maxCombo: 9, spawnRate: 800, lifeTime: 3000, type: 'static', starSize: 18, desc: 'Intro', rareChance: 0.0, gimmick: { constellation: 0, shooting: 0 } },
        { maxCombo: 29, spawnRate: 700, lifeTime: 2500, type: 'static', starSize: 16, desc: 'Wake up', rareChance: 0.05, gimmick: { constellation: 0, shooting: 0 } },
        { maxCombo: 59, spawnRate: 600, lifeTime: 2000, type: 'static', starSize: 14, desc: 'Normal', rareChance: 0.1, gimmick: { constellation: 0, shooting: 0 } },
        { maxCombo: 89, spawnRate: 550, lifeTime: 1500, type: 'static', starSize: 13, desc: 'Fast', rareChance: 0.2, gimmick: { constellation: 0.05, shooting: 0 } },
        { maxCombo: 119, spawnRate: 500, lifeTime: 1200, type: 'wobbly', starSize: 12, desc: 'Wobbly', rareChance: 0.3, gimmick: { constellation: 0.1, shooting: 0.05 } },
        { maxCombo: 149, spawnRate: 450, lifeTime: 1000, type: 'moving', starSize: 11, desc: 'Moving', rareChance: 0.4, gimmick: { constellation: 0.15, shooting: 0.1 } },
        { maxCombo: 179, spawnRate: 400, lifeTime: 800, type: 'rush', starSize: 10, desc: 'Rush', rareChance: 0.5, gimmick: { constellation: 0.2, shooting: 0.15 } },
        { maxCombo: 199, spawnRate: 350, lifeTime: 700, type: 'blink', starSize: 9, desc: 'Blink', rareChance: 0.6, gimmick: { constellation: 0.25, shooting: 0.2 } },
        { maxCombo: 9999, spawnRate: 250, lifeTime: 600, type: 'starfall', starSize: 8, desc: 'Starfall', rareChance: 0.8, gimmick: { constellation: 0.3, shooting: 0.3 } }
    ],

    // -------------------------------------------------------------------------
    // ■ レアリティ設定 (Rarity System)
    // -------------------------------------------------------------------------
    RARITY: {
        THRESHOLDS: { UNCOMMON: 0.60, RARE: 0.85, EPIC: 0.95 },
        COLORS: ['#ffd700', '#00ffff', '#50ff50', '#d050ff', 'rainbow'],
        BONUS_POINTS: [0, 1, 2, 3, 5]
    },

    // -------------------------------------------------------------------------
    // ■ システム設定 (System Settings)
    // -------------------------------------------------------------------------
    SYSTEM: {
        ENDLESS_SCORE_RATE: 0.1,
        MISS_TIME_PENALTY: 10,
        TIME_LIMIT_SECONDS: 180,
        GACHA_COST: 300
    },

    // -------------------------------------------------------------------------
    // ■ アクセサリ設定 (Accessory System)
    // -------------------------------------------------------------------------

    // ベースアイテム (器)
    // ベースアイテム (器)
    ACCESSORY_BASE: [
        {
            id: 'base_01',
            name: '星のヘアピン',
            desc: '夜空からこぼれ落ちた\n小さな金色の星屑。\n瞬くたびに\n微かな光を放つ。',
            type: 'head'
        },
        {
            id: 'base_02',
            name: '猫の首輪',
            desc: '歩くたびにチリチリと\n可愛らしい音が鳴る。\n不思議な引力で\n飼い主を呼び寄せる。',
            type: 'neck'
        },
        {
            id: 'base_03',
            name: '銀河の指輪',
            desc: '覗き込むと深遠な宇宙が\n広がるガラス細工。\n遠い星々の記憶が\n指先から伝わる。',
            type: 'ring'
        },
        {
            id: 'base_04',
            name: '天使の羽',
            desc: 'ふわふわとした純白の羽。\n少しだけ高く\nジャンプできるような\n不思議な浮遊感。',
            type: 'back'
        },
        {
            id: 'base_05',
            name: '三日月の冠',
            desc: '静かな夜の魔力を秘めた\n銀色の冠。\n夜目が効くようになり\n隠れた星を見つけやすくなる。',
            type: 'head'
        },
        {
            id: 'base_06',
            name: '魔法のステッキ',
            desc: '星を操るための小さな杖。\n振ると魔法の粉がこぼれる。\n猫じゃらしとしても優秀。',
            type: 'hand'
        },
        {
            id: 'base_07',
            name: '流星のピアス',
            desc: '流れ星の尾を\n結晶化させたピアス。\n揺れるたびに\n小さな願い事を叶える。',
            type: 'head'
        },
        {
            id: 'base_08',
            name: '夜想曲のオルゴール',
            desc: '星空の下でだけ音を奏でる\n古びたオルゴール。\n音色は失われた時間を\nゆっくりと巻き戻す。',
            type: 'hand'
        },
        {
            id: 'base_09',
            name: '彗星のしっぽ',
            desc: '氷と塵でできた冷たい尻尾。\n装着するとひんやりとして\n熱くならない。\nちょっと溶けやすいのが難点。',
            type: 'back'
        },
        {
            id: 'base_10',
            name: '星詠みの眼鏡',
            desc: '星の瞬きを観測する眼鏡。\nかけると賢そうに見えるが\n視界がぐるぐる回る。',
            type: 'head'
        },
        {
            id: 'base_11',
            name: '宵闇のマント',
            desc: '夜そのものを縫い合わせた\n漆黒のマント。\n闇に溶け込むため\nかくれんぼに最適。',
            type: 'back'
        },
        {
            id: 'base_12',
            name: 'プリズムの欠片',
            desc: '朝露が固まったような\n七色の欠片。\n光にかざすと\n見たことのない世界が映る。',
            type: 'neck'
        },
        {
            id: 'base_13',
            name: '星屑のコンパス',
            desc: '北ではなく「ステキなもの」を\n指し示す気まぐれな針。\nお宝探しには向かないが\n散歩にはうってつけ。',
            type: 'hand'
        },
        {
            id: 'base_14',
            name: '居眠り雲',
            desc: 'ちぎれ雲を捕まえた\nふかふかのクッション。\nいつでもどこでも\n極上の昼寝ができる。',
            type: 'back'
        },
        {
            id: 'base_15',
            name: '織姫の羽衣',
            desc: '天の川で輝く薄衣。\n風に乗って空を飛べそう。\n絶対に汚してはいけない。',
            type: 'back'
        },
        {
            id: 'base_16',
            name: 'シリウスのランタン',
            desc: '星の光を閉じ込めた\nアンティークなランタン。\nどんなに暗い夜道でも\nもう怖くない。',
            type: 'hand'
        },
        {
            id: 'base_17',
            name: '古びた星図',
            desc: '今はもう存在しない星座が\n描かれた羊皮紙。\n星座たちが動き出し\n昔話を語る。',
            type: 'hand'
        },
        {
            id: 'base_18',
            name: '小判のチャーム',
            desc: 'キラキラ光る黄金色のメダル。\n金運を招くと言われるが\n猫にとってはただのオモチャ。',
            type: 'neck'
        },
        {
            id: 'base_19',
            name: '満月のポシェット',
            desc: 'お月様のような\nフェルト製のポシェット。\n中には大好きなおやつが\nたっぷり詰まっている。',
            type: 'back'
        },
        {
            id: 'base_20',
            name: '極光のリボン',
            desc: 'オーロラを結んだリボン。\n角度によって色が変わるため\n見る人を飽きさせない。',
            type: 'head'
        },
        {
            id: 'base_21',
            name: '砂時計のペンダント',
            desc: 'サラサラと光る砂が\n時を刻むペンダント。\n逆さにすると\n少しだけ過去に戻れる気分。',
            type: 'neck'
        },
        {
            id: 'base_22',
            name: '妖精のブーツ',
            desc: '羽の生えた小さな靴。\n履くと足取りが軽くなり\n空中散歩も夢ではない。',
            type: 'hand'
        },
        {
            id: 'base_23',
            name: '月光のハープ',
            desc: '弦のない不思議な竪琴。\n月の光が差し込むと\n美しい旋律を奏でる。',
            type: 'hand'
        },
        {
            id: 'base_24',
            name: '星屑のインク瓶',
            desc: '夜空色をしたインク。\nこれで描いた絵は\n夜になると動き出す。',
            type: 'hand'
        },
        {
            id: 'base_25',
            name: '衛星の模型',
            desc: '体の周りをくるくる回る\n小さなブリキの衛星。\n時々ピピッと\n電波を受信する。',
            type: 'back'
        },
        {
            id: 'base_26',
            name: '黒猫の仮面',
            desc: '夜会に参加するための\nエレガントな仮面。\n素顔を隠して\n大人の世界へ。',
            type: 'head'
        },
        {
            id: 'base_27',
            name: '氷柱のタクト',
            desc: '透き通る氷の指揮棒。\n一振りすれば\nあたり一面が銀世界。',
            type: 'hand'
        },
        {
            id: 'base_28',
            name: '陽だまりクッション',
            desc: 'お日様の匂いがする\n暖かなクッション。\nどんなに寒い夜でも\nこれがあればポカポカ。',
            type: 'back'
        },
        {
            id: 'base_29',
            name: '銀の鈴',
            desc: '澄んだ音色の銀の鈴。\nその音は魔を払い\n幸運を呼び込む。',
            type: 'neck'
        },
        {
            id: 'base_30',
            name: '瓶詰めの星雲',
            desc: '手のひらサイズの宇宙が\n詰め込まれた小瓶。\n振ると中で\n新しい星が生まれる。',
            type: 'hand'
        }
    ],

    // 付与効果リスト (Random Effects)
    ACCESSORY_EFFECTS: [
        // A. 判定強化
        { id: 'range_s', name: '広域(小)', desc: '判定x1.2', detail: '星を拾える範囲が少し広がるよ', stats: { hitScale: 0.2 }, isRare: false },
        { id: 'range_m', name: '広域(中)', desc: '判定x1.5', detail: '星を拾える範囲がかなり広がるよ', stats: { hitScale: 0.5 }, isRare: false },
        { id: 'range_l', name: '広域(大)', desc: '判定x2.0', detail: '星を拾える範囲がすごく広がるよ！', stats: { hitScale: 1.0 }, isRare: true },

        // B. 星滞在時間 (Star Life)
        { id: 'life_s', name: '悠久(小)', desc: '星寿命+0.5秒', detail: '星が消えるまでの時間が0.5秒伸びるよ', stats: { lifeAdd: 500 }, isRare: false },
        { id: 'life_m', name: '悠久(中)', desc: '星寿命+1.0秒', detail: '星が消えるまでの時間が1秒伸びるよ', stats: { lifeAdd: 1000 }, isRare: false },
        { id: 'life_l', name: '悠久(大)', desc: '星寿命+2.0秒', detail: '星が消えるまでの時間が2秒も伸びるよ！', stats: { lifeAdd: 2000 }, isRare: true },

        // C. 制限時間延長 (Game Time)
        { id: 'time_s', name: '延長(小)', desc: '制限時間+30秒', detail: 'ゲームの制限時間が30秒増えるよ', stats: { timeAdd: 30 }, isRare: false },
        { id: 'time_l', name: '延長(大)', desc: '制限時間+60秒', detail: 'ゲームの制限時間が60秒増えるよ！', stats: { timeAdd: 60 }, isRare: true },
        { id: 'time_xl', name: '延長(特)', desc: '制限時間+90秒', detail: 'ゲームの制限時間が90秒も増えるよ！！', stats: { timeAdd: 90 }, isRare: true },

        // D. トレジャー (レア出現率)
        { id: 'treasure_s', name: '幸運(小)', desc: 'レア率+10%', detail: '珍しい星が少し出やすくなるよ', stats: { rareRate: 0.1 }, isRare: false },
        { id: 'treasure_l', name: '幸運(大)', desc: 'レア率+20%', detail: '珍しい星がかなり出やすくなるよ！', stats: { rareRate: 0.2 }, isRare: true },

        // E. スコア・獲得
        { id: 'score_s', name: '得点(小)', desc: 'スコア+1', detail: '星を拾った時のスコアが+1されるよ', stats: { scoreAdd: 1 }, isRare: false },
        { id: 'score_l', name: '得点(大)', desc: 'スコア+3', detail: '星を拾った時のスコアが+3されるよ', stats: { scoreAdd: 3 }, isRare: true },
        { id: 'collect_s', name: '収集(小)', desc: '獲得x1.2', detail: '持ち帰れる星の数が1.2倍になるよ', stats: { currencyMult: 0.2 }, isRare: false },
        { id: 'collect_l', name: '収集(大)', desc: '獲得x1.5', detail: '持ち帰れる星の数が1.5倍になるよ！', stats: { currencyMult: 0.5 }, isRare: true },

        // F. ユニーク効果 (Special)
        { id: 'unique_auto', name: '自動', desc: '5秒毎に自動回収', detail: '5秒に1回、勝手に星を集めてくれるよ', stats: { autoCatch: 5000 }, isRare: true },
        { id: 'unique_heal', name: '時戻し', desc: '5%で時間回復', detail: '星を拾うと、たまに時間が5秒回復するよ', stats: { luckyHeal: 0.05 }, isRare: true },
        { id: 'unique_sniper', name: '狙撃手', desc: '判定x0.8/点x2', detail: '判定は狭くなるけど、スコアが2倍になるよ！', stats: { hitScale: -0.2, scoreMult: 2.0 }, isRare: true }
    ],
};
