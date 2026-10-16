/**
 * 低解像度ドット絵（Pixel Art）生成＆描画エンジン
 * すべてのアイコン(16x16)、自動車コマ＋人物ピン(28x20)、アバター顔(16x16)、
 * マイホーム建築(24x22)、イベントシーン(64x36)を1ドット単位で厳密に描画し、
 * にじみのないクリーンなピクセルアートとして提供します。
 */

const PIXEL_PALETTE = {
  '.': null,
  'K': '#14131a', // 黒アウトライン
  'D': '#2c2b3c', // 濃紺グレー
  'G': '#686b7a', // グレー
  'L': '#b4b9c7', // 明グレー
  'W': '#fffdf5', // 白
  'R': '#e83b3b', // 赤
  'r': '#9e1f28', // 暗赤
  'P': '#ff77a8', // ピンク
  'O': '#fb8b24', // オレンジ
  'Y': '#ffd93d', // 黄色・ゴールド
  'y': '#c9981a', // 暗ゴールド
  'E': '#38b000', // 緑
  'e': '#1b6ca8', // 青緑
  'g': '#1f6f33', // 暗緑
  'M': '#80ed99', // 明緑
  'B': '#2ec4b6', // シアン・水色
  'U': '#3a86ff', // 青
  'u': '#1d4ed8', // 暗青
  'V': '#8338ec', // 紫
  'v': '#4c1d95', // 暗紫
  'N': '#9c6644', // 茶色
  'n': '#6f4518', // 暗茶色
  'S': '#ffccaa', // 肌色
  's': '#e09f7d', // 影肌色
  'C': '#ffadad'  // 頬赤・淡赤
};

// 16x16 ドット絵アイコン定義（各行16文字×16行）
const ICON_GRIDS_16 = {
  start: [
    "................",
    "..KK............",
    "..KWKKKKKK......",
    "..KWRRRRRRK.....",
    "..KWRRWWWRRK....",
    "..KWRRRRRRRK....",
    "..KWRRWWWRK.....",
    "..KWRRRRRK......",
    "..KWKKKKK.......",
    "..KWK...........",
    "..KWK...........",
    "..KWK...........",
    "..KWK...........",
    ".KKKKK..........",
    ".KYYYK..........",
    "..KKK..........."
  ],
  payday: [
    ".....KKKKKK.....",
    "....KYYYYYYK....",
    "....KYnYYnYK....",
    ".....KKKKKK.....",
    "....KYYYYYYK....",
    "...KYYYYYYYYK...",
    "..KYYYYKKYYYYK..",
    "..KYYYKYYKYYYK..",
    "..KYYYKYYKKKKK..",
    "..KYYYYKKYYYYK..",
    "..KYYYYKKKYYYK..",
    "..KYYYKYYKYYYK..",
    "..KYYYYKKYYYYK..",
    "...KYYYYYYYYK...",
    "....KKKKKKKK....",
    "................"
  ],
  cash_plus: [
    "................",
    "....KKKKKKKK....",
    "...KMMMMMMMMK...",
    "..KMMGGGGGGMMK..",
    "..KMGMMMMMMGMK..",
    "..KMGMMYYMMGMK..",
    "..KMGMYKKYMGMK..",
    "..KMGMMYYMMGMK..",
    "..KMGMMMMMMGMK..",
    "..KMMGGGGGGMMK..",
    "...KMMMMMMMMK...",
    "....KKKKKKKK....",
    "..........KK....",
    ".........KYYK...",
    "........KYYYYK..",
    ".........KYYK..."
  ],
  cash_minus: [
    "....KK....KK....",
    "...KWWK..KWWK...",
    "..KWWWWKKWWWWK..",
    "...KWWK..KWWK...",
    "....KKKKKKKK....",
    "...KRRRRRRRRK...",
    "..KRRWWWWWWWRK..",
    "..KRWKKKKKKWRK..",
    "..KRWYYYYYYWRK..",
    "..KRWKKKKKKWRK..",
    "..KRRWWWWWWWRK..",
    "...KRRRRRRRRK...",
    "....KKKKKKKK....",
    "................",
    "................",
    "................"
  ],
  job: [
    ".....KKKKKK.....",
    "....KnnnnnnK....",
    "....Kn....nK....",
    "..KKKKKKKKKKKK..",
    ".KNNNNNNNNNNNNK.",
    ".KNNNNNNNNNNNNK.",
    ".KNNNNNNNNNNNNK.",
    ".KKKKKKYYKKKKKK.",
    ".KnnnnKYYKnnnnK.",
    ".KNNNNKKKKNNNNK.",
    ".KNNNNNNNNNNNNK.",
    ".KNNNNNNNNNNNNK.",
    ".KNNNNNNNNNNNNK.",
    "..KKKKKKKKKKKK..",
    "................",
    "................"
  ],
  school: [
    ".......KK.......",
    ".....KKKKKK.....",
    "...KKKKKKKKKK...",
    ".KKKKDDDDDDKKKK.",
    "KKDDDDDDDDDDDDKK",
    "..KKKKDDDDKKKK..",
    "....KDDDDDDK..K.",
    "....KDDDDDDK..Y.",
    "....KYYYYYYK..Y.",
    "....KDDDDDDK..Y.",
    "....KKKKKKKK.YY.",
    ".............YY.",
    "................",
    "................",
    "................",
    "................"
  ],
  rankup: [
    ".......KK.......",
    "......KYYK......",
    "..KK..KYYK..KK..",
    ".KYYK.KYYK.KYYK.",
    ".KYYKKYYYYKKYYK.",
    "..KYYYYYYYYYYK..",
    "..KYYRYYYYBYYK..",
    "..KYYYYYYYYYYK..",
    "..KKKKKKKKKKKK..",
    "......KKKK......",
    ".....KMMMMK.....",
    "....KMMMMMMK....",
    "......KMMK......",
    "......KMMK......",
    "......KKKK......",
    "................"
  ],
  job_change: [
    "......KKKK......",
    "....KKUUUUkk....",
    "...KUUUUUUUUK...",
    "..KUUUK..KUUUK..",
    "..KUUK....KKKK..",
    ".......KKK......",
    "......KOOOK.....",
    "..KKKK....KOOK..",
    "..KOOOK..KOOOK..",
    "...KOOOOOOOOK...",
    "....KKOOOOKK....",
    "......KKKK......",
    "................",
    "................",
    "................",
    "................"
  ],
  wedding: [
    "....KK....KK....",
    "...KPPK..KPPK...",
    "..KPPPPKKPPPPK..",
    "..KPPPPPPPPPPK..",
    "...KPPPPPPPPK...",
    "....KPPPPPPK....",
    ".....KPPPPK.....",
    "...KKKKKKKKKK...",
    "..KYYYYKYYYYYK..",
    ".KYYKKYKYKKYYYK.",
    ".KYK..KYK...KYK.",
    ".KYK..KYK...KYK.",
    ".KYYKKYKYKKYYYK.",
    "..KYYYYKYYYYYK..",
    "...KKKKKKKKKK...",
    "................"
  ],
  baby: [
    ".....KKKKKK.....",
    "...KKYYYYYYKK...",
    "..KYYSSSSSSYYK..",
    "..KYSSSSSSSSYK..",
    ".KYSKSSSSSSKSYK.",
    ".KYSSSSSSSSSSYK.",
    ".KYSSCCSSCCSSYK.",
    ".KYSSSSRRSSSSYK.",
    "..KYSSSSSSSSYK..",
    "...KKSSSSSSKK...",
    "....KWWWWWWK....",
    "...KWWPPPPWWK...",
    "...KWWPPPPWWK...",
    "....KWWWWWWK....",
    ".....KKKKKK.....",
    "................"
  ],
  house: [
    ".......KK.......",
    "......KRRK......",
    ".....KRRRRK.....",
    "....KRRRRRRK....",
    "...KRRRRRRRRK...",
    "..KRRRRRRRRRRK..",
    ".KRRRRRRRRRRRRK.",
    ".KKKKKKKKKKKKKK.",
    "..KWWWWWWWWWWK..",
    "..KWBBWKKKKWWK..",
    "..KWBBWKNNKWWK..",
    "..KWKKWKNNKWWK..",
    "..KWWWWKNNKWWK..",
    "..KWWWWKNNKWWK..",
    "..KKKKKKKKKKKK..",
    "................"
  ],
  stock: [
    ".KKKKKKKKKKKKKK.",
    ".KWWWWWWWWWWWWK.",
    ".KWWWWWWWWMMMWK.",
    ".KWWWWWWWMmmMWK.",
    ".KWWWWMMMWWWMWK.",
    ".KWWWMWWMWWWWWK.",
    ".KWWMWWWMWWWWWK.",
    ".KWMmWWWMWWWWWK.",
    ".KWWWWWWWWWWWWK.",
    ".KWWYYWWYYWWYYK.",
    ".KWWYYWWYYWWYYK.",
    ".KWWWWWWWWWWWWK.",
    ".KKKKKKKKKKKKKK.",
    "................",
    "................",
    "................"
  ],
  treasure: [
    "................",
    "....KKKKKKKK....",
    "...KBBBBBBBBK...",
    "..KBBWWWWWWBBK..",
    ".KBBWWBBBBWWBBK.",
    ".KBBBBBBBBBBBBK.",
    "..KBBBBBBBBBBK..",
    "...KBBBBBBBBK...",
    "....KBBBBBBK....",
    ".....KBBBBK.....",
    "......KBBK......",
    ".......KK.......",
    "................",
    "................",
    "................",
    "................"
  ],
  insurance: [
    "......KKKK......",
    "....KKUUUUkk....",
    "..KKUUUUUUUUkk..",
    ".KUUUUWWWWUUUUK.",
    ".KUUUUWYYWUUUUK.",
    ".KUUUWWYYWWUUUK.",
    ".KUUUYYYYYYUUUK.",
    ".KUUUWWYYWWUUUK.",
    "..KUUUWYYWUUUK..",
    "..KUUUUWWUUUUK..",
    "...KUUUUUUUUK...",
    "....KUUUUUUK....",
    ".....KUUUUK.....",
    "......KUUk......",
    ".......KK.......",
    "................"
  ],
  debt: [
    "..KKKKKKKKKKKK..",
    ".KRRRRRRRRRRRRK.",
    ".KRWWWWWWWWWWWR.",
    ".KRWKKKKKKKKWWR.",
    ".KRWWRRRRRRWWWR.",
    ".KRWWKRRRRKWWWR.",
    ".KRWWWRRRRWWWWR.",
    ".KRWWWWWWWWWWWR.",
    ".KRWKKKKKKKKWWR.",
    ".KRWWWWWWWWWWWR.",
    ".KRWWWRRRRWWWWR.",
    ".KRWWKRRRRKWWWR.",
    ".KRWWWRRRRWWWWR.",
    ".KRRRRRRRRRRRRK.",
    "..KKKKKKKKKKKK..",
    "................"
  ],
  dice: [
    "................",
    "..KKKKKKKKKKKK..",
    ".KWWWWWWWWWWWWK.",
    ".KWKKWWWWWWKKWK.",
    ".KWKKWWWWWWKKWK.",
    ".KWWWWWWWWWWWWK.",
    ".KWWWWWRRWWWWWK.",
    ".KWWWWWRRWWWWWK.",
    ".KWWWWWWWWWWWWK.",
    ".KWKKWWWWWWKKWK.",
    ".KWKKWWWWWWKKWK.",
    ".KWWWWWWWWWWWWK.",
    ".KLLLLLLLLLLLLK.",
    "..KKKKKKKKKKKK..",
    "................",
    "................"
  ],
  roulette: [
    ".....KKKKKK.....",
    "...KKRRYYBBKK...",
    "..KRRYYYYBBEEK..",
    ".KRRYYKKKKBBEEK.",
    ".KRYKKYYYYKKBEK.",
    "KPPKYKYYYYKYKEEK",
    "KPPKYYYYYYYYKOOK",
    "KPPKYYYYKYYYKooK",
    "KVVKYKYYYYKYKOOK",
    ".KVKKYYYYYYKKOK.",
    ".KVVUUUKKKKOOOK.",
    "..KVVUUUUOOOOK..",
    "...KKUUUUOOKK...",
    ".....KKKKKK.....",
    "................",
    "................"
  ],
  accident: [
    ".......KK.......",
    "......KOOK......",
    ".....KOOOOK.....",
    "....KOORROOK....",
    "....KORRRROK....",
    "...KOORYYROOK...",
    "...KORRYYRROK...",
    "..KOORYYYYROOK..",
    "..KORRYYYYRROK..",
    "..KORYYWWYYROK..",
    "..KORRYWWYRROK..",
    "...KORRWWYRROK..",
    "....KORRRRROK...",
    ".....KKKKKK.....",
    "................",
    "................"
  ],
  hospital: [
    "..KKKKKKKKKKKK..",
    ".KWWWWWWWWWWWWK.",
    ".KWWWWWRRWWWWWK.",
    ".KWWWWWRRWWWWWK.",
    ".KWWWRRRRRRWWWK.",
    ".KWWWRRRRRRWWWK.",
    ".KWWWWWRRWWWWWK.",
    ".KWWWWWRRWWWWWK.",
    ".KWWWWWWWWWWWWK.",
    ".KWBBWWKKWWBBWK.",
    ".KWBBWWKKWWBBWK.",
    ".KWWWWWWWWWWWWK.",
    ".KWWWWKNNKWWWWK.",
    ".KWWWWKNNKWWWWK.",
    "..KKKKKKKKKKKK..",
    "................"
  ],
  travel: [
    ".......KK.......",
    "......KWWK......",
    "......KWWK......",
    ".....KWWWWK.....",
    "....KWWBBWWK....",
    ".KKKKWWBBWWKKKK.",
    "KUUUUWWWWWWUUUUK",
    "KUUUUWWWWWWUUUUK",
    ".KKKKWWWWWWKKKK.",
    ".....KWWWWK.....",
    ".....KWWWWK.....",
    "....KWWKKWWK....",
    "...KWWK..KWWK...",
    "...KKK....KKK...",
    "................",
    "................"
  ],
  casino: [
    "..KKKKKKKKKKKK..",
    ".KYYYYYYYYYYYYK.",
    ".KYKKKKKKKKKKYK.",
    ".KYKWWKWWKWWKYK.",
    ".KYKRRKRRKRRKYK.",
    ".KYKWRKWRKWRKYK.",
    ".KYKWRKWRKWRKYK.",
    ".KYKKKKKKKKKKYK.",
    ".KYYYYYYYYYYYYK.",
    ".KYRRRRRRRRRRYK.",
    ".KYYYYYYYYYYYYK.",
    "..KKKKKKKKKKKK..",
    "................",
    "................",
    "................",
    "................"
  ],
  revenge: [
    ".......KKKKKK...",
    "......KYYYYYK...",
    ".....KYYYYYK....",
    "....KYYYYYK.....",
    "...KYYYYYKKKK...",
    "..KYYYYYYYYYK...",
    "...KKKKYYYYK....",
    "......KYYYK.....",
    ".....KYYYK......",
    "....KYYYK.......",
    "...KYYYK........",
    "..KYYYK.........",
    "..KYYK..........",
    "..KYK...........",
    "..KK............",
    "................"
  ],
  bridge: [
    "................",
    "..KK........KK..",
    "..KOk......kOK..",
    "..KOOK....KOOK..",
    ".KOkOOK..KOOkOK.",
    "KO..KOOKKOOK..OK",
    "KKKKKKOOOOkKKKKK",
    "NNNNNNNNNNNNNNNN",
    "nnnnnnnnnnnnnnnn",
    "KKKKKK....KKKKKK",
    "..KKBBBBBBBBKK..",
    ".BBBBBBBBBBBBBB.",
    "BBBBWWWWWWWWBBBB",
    "................",
    "................",
    "................"
  ],
  castle: [
    ".KK..KK..KK..KK.",
    ".KYYKKYYKKYYKKY.",
    ".KYYYYYYYYYYYYK.",
    "..KYYYYYYYYYYK..",
    "..KYBBYYYYBBYK..",
    "..KKKKKKKKKKKK..",
    ".KWWWWWWWWWWWWK.",
    ".KWBBWWKKWWBBWK.",
    ".KWBBWKRRKWBBWK.",
    ".KWWWWKRRKWWWWK.",
    ".KWWWWKNNKWWWWK.",
    ".KWWWWKNNKWWWWK.",
    ".KWWWWKNNKWWWWK.",
    ".KKKKKKKKKKKKKK.",
    "................",
    "................"
  ],
  trophy: [
    "..KKKKKKKKKKKK..",
    ".KYYYYYYYYYYYYK.",
    "KYKYYYYYYYYYYKYK",
    "KYKYYWWWWYYYYKYK",
    "KYKYYWYYYYYYYKYK",
    ".KKYYYYYYYYYYKK.",
    "..KYYYYYYYYYYK..",
    "...KYYYYYYYYK...",
    "....KKYYYYKK....",
    "......KYYK......",
    "......KYYK......",
    "....KKYYYYKK....",
    "...KnnnnnnnnK...",
    "...KKKKKKKKKK...",
    "................",
    "................"
  ]
};

// プレイヤーアバター16x16ドット絵（8種）
const AVATAR_GRIDS_16 = [
  // 0: フレッシュ若者
  [
    "....KKKKKKKK....",
    "...KnnnnnnnnK...",
    "..KnnnnnnnnnnK..",
    "..KnnSSSSSSnnK..",
    "..KnSSSSSSSSnK..",
    "..KSSKSSSSKSSK..",
    "..KSSSSSSSSSSK..",
    "..KSSCCSSCCSSK..",
    "...KSSSRRSSSK...",
    "....KSSSSSSK....",
    "...KKUUUUUUKK...",
    "..KUUUUWWUUUUK..",
    "..KUUUWWWWUUUK..",
    "..KUUUUUUUUUUK..",
    "...KKKKKKKKKK...",
    "................"
  ],
  // 1: ツインテールヒロイン
  [
    "..KK..KKKK..KK..",
    ".KOOkKOOOOkkOOK.",
    ".KOOOOOOOOOOOOK.",
    "KOOooSSSSSSooOOK",
    "KOooSSSSSSSSooOK",
    "KOoSSKSSSSKSSoOK",
    "KOoSSSSSSSSSSoOK",
    ".K.SSCCSSCCSS.K.",
    "...KSSSRRSSSK...",
    "....KSSSSSSK....",
    "...KKPPPPPPKK...",
    "..KPPPPWWPPPPK..",
    "..KPPPPPPPPPPK..",
    "...KKKKKKKKKK...",
    "................",
    "................"
  ],
  // 2: メガネ知性派
  [
    "....KKKKKKKK....",
    "...KDDDDDDDDK...",
    "..KDDDDDDDDDDK..",
    "..KDDSSSSSSDDK..",
    "..KKKKKKKKKKKK..",
    "..KBBKSSSSKBBK..",
    "..KKKKKKKKKKKK..",
    "..KSSSSSSSSSSK..",
    "...KSSSRRSSSK...",
    "....KSSSSSSK....",
    "...KKEEEEEEKK...",
    "..KEEEEWWEEEEK..",
    "..KEEEERRREEEK..",
    "..KEEEEEEEEEEE..",
    "...KKKKKKKKKK...",
    "................"
  ],
  // 3: 熱血キャップ
  [
    "....KKKKKKKK....",
    "...KRRRRRRRRK...",
    "..KRRRRWWWRRRK..",
    ".KKKKRRRRRRRRKK.",
    "..KSSSSSSSSSSK..",
    "..KSSKSSSSKSSK..",
    "..KSSSSSSSSSSK..",
    "..KSSCCSSCCSSK..",
    "...KSSWWWWSSK...",
    "....KSSSSSSK....",
    "...KKYYYYYYKK...",
    "..KYYYYRRYYYYK..",
    "..KYYYYYYYYYYK..",
    "...KKKKKKKKKK...",
    "................",
    "................"
  ],
  // 4: エレガントお嬢様
  [
    "....KKKKKKKK....",
    "...KYYYYYYYYK...",
    "..KYYYYYYYYYYK..",
    "..KYYSSSSSSYYK..",
    ".KYYSSSSSSSSYYK.",
    ".KYSKSSSSSSKSYK.",
    ".KYYSSSSSSSSYYK.",
    ".KYYSSCCSSCCYYK.",
    "..KYSSSRRSSSYK..",
    "..KYYSSSSSSYYK..",
    "...KKVVVVVVKK...",
    "..KVVVVWWVVVVK..",
    "..KVVVVVVVVVVK..",
    "...KKKKKKKKKK...",
    "................",
    "................"
  ],
  // 5: ダンディ社長
  [
    "....KKKKKKKK....",
    "...KLLLLLLLLK...",
    "..KLLSSSSSSLLK..",
    "..KLSSSSSSSSK...",
    "..KSSKSSSSKSSK..",
    "..KSSSSSSSSSSK..",
    "..KSSnnnnnnSSK..",
    "...KSnnnnnnSK...",
    "....KSSSSSSK....",
    "...KKDDDDDDKK...",
    "..KDDDDWWDDDDK..",
    "..KDDDDRRDDDDK..",
    "..KDDDDDDDDDDK..",
    "...KKKKKKKKKK...",
    "................",
    "................"
  ],
  // 6: ファンキースター
  [
    "...KKKKKKKKKK...",
    "..KVVVVVVVVVVK..",
    ".KVVVVVVVVVVVVK.",
    "..KVVSSSSSSVVK..",
    "..KKKKKKKKKKKK..",
    "..KYYKYYYYKYYK..",
    "..KKKKKKKKKKKK..",
    "..KSSSSSSSSSSK..",
    "...KSSWWWWSSK...",
    "....KSSSSSSK....",
    "...KKOOOOOOKK...",
    "..KOOOOYYOOOOK..",
    "..KOOOOOOOOOOK..",
    "...KKKKKKKKKK...",
    "................",
    "................"
  ],
  // 7: サイバー飛行士
  [
    "....KKKKKKKK....",
    "...KWWWWWWWWK...",
    "..KWWBBBBBBWWK..",
    "..KWBBUUUUBBWK..",
    "..KWBUUUUUUBWK..",
    "..KWBUUWWUUBWK..",
    "..KWBBUUUUBBWK..",
    "..KWWBBBBBBWWK..",
    "...KWWWWWWWWK...",
    "....KKKKKKKK....",
    "...KKLLLLLLKK...",
    "..KLLLLRRLLLLK..",
    "..KLLLLBBLLLLK..",
    "...KKKKKKKKKK...",
    "................",
    "................"
  ]
];

class PixelArtEngine {
  constructor() {
    this.cache = new Map();
  }

  /**
   * グリッド配列をオフスクリーンCanvasに描画して返す
   */
  renderGridToCanvas(grid, scale = 2) {
    const h = grid.length;
    const w = grid[0].length;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < h; y++) {
      const row = grid[y];
      for (let x = 0; x < w; x++) {
        const ch = row[x];
        const color = PIXEL_PALETTE[ch];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    return canvas;
  }

  /**
   * 16x16 アイコンの取得（Canvas または DataURL）
   */
  getIconCanvas(iconName, scale = 2) {
    const key = `icon_${iconName}_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const grid = ICON_GRIDS_16[iconName] || ICON_GRIDS_16.start;
    const canvas = this.renderGridToCanvas(grid, scale);
    this.cache.set(key, canvas);
    return canvas;
  }

  getIconDataUrl(iconName, scale = 3) {
    const key = `icon_url_${iconName}_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const canvas = this.getIconCanvas(iconName, scale);
    const url = canvas.toDataURL();
    this.cache.set(key, url);
    return url;
  }

  /**
   * アバター顔アイコンDataURL取得
   */
  getAvatarDataUrl(avatarIndex = 0, scale = 3) {
    const idx = Math.abs(avatarIndex) % AVATAR_GRIDS_16.length;
    const key = `avatar_url_${idx}_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const canvas = this.renderGridToCanvas(AVATAR_GRIDS_16[idx], scale);
    const url = canvas.toDataURL();
    this.cache.set(key, url);
    return url;
  }

  /**
   * 自動車コマ＋家族人物ピン（自分・配偶者・子どもたち）をドット絵で描画したCanvasを返す
   * @param {string} mainColor メイン車体色 (#hex)
   * @param {string} darkColor 車体影色 (#hex)
   * @param {boolean} married 配偶者ピンの有無
   * @param {number} childrenCount 子どもピンの数
   * @param {number} debtCount 借金（約束手形）の枚数
   * @param {number} scale ピクセル拡大率
   */
  getCarSpriteCanvas(mainColor, darkColor, married = false, childrenCount = 0, debtCount = 0, scale = 2) {
    const key = `car_${mainColor}_${married ? 1 : 0}_${Math.min(6, childrenCount)}_${debtCount > 0 ? 1 : 0}_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const w = 26;
    const h = 19;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const p = (x, y, col, pw = 1, ph = 1) => {
      ctx.fillStyle = col;
      ctx.fillRect(x * scale, y * scale, pw * scale, ph * scale);
    };

    // 地面の影
    p(3, 17, 'rgba(0,0,0,0.38)', 20, 2);

    // 乗車している人物ピンを描画するヘルパー（車の上部座席エリア y=2..8）
    const drawPin = (px, py, headCol, bodyCol) => {
      p(px, py - 1, '#14131a', 3, 4);
      p(px, py - 2, '#14131a', 3, 1);
      p(px + 1, py - 1, '#ffccaa', 1, 1); // 顔
      p(px + 1, py, bodyCol, 1, 2);        // 胴体ピン
      p(px + 1, py - 2, headCol, 1, 1);    // 帽子/頭頂
    };

    // 1. 運転手ピン（自分：水色ピン）
    drawPin(13, 6, '#38bdf8', '#0284c7');

    // 2. 配偶者ピン（ピンクピン）
    if (married) {
      drawPin(10, 6, '#f472b6', '#db2777');
    }

    // 3. 子どもピン（最大4本まで後部座席に並ぶ：黄色/緑ピン）
    const kids = Math.min(4, childrenCount);
    for (let i = 0; i < kids; i++) {
      const kx = 7 - i * 2;
      const ky = 7 - (i % 2);
      const col = i % 2 === 0 ? '#facc15' : '#4ade80';
      drawPin(kx, ky, col, col);
    }

    // フロントガラス
    p(16, 5, '#14131a', 2, 4);
    p(17, 6, '#7dd3fc', 1, 3);
    p(18, 7, '#bae6fd', 1, 2);

    // 車体アウトライン（黒）
    p(2, 9, '#14131a', 22, 6);
    p(3, 8, '#14131a', 19, 1);
    p(1, 10, '#14131a', 1, 4);
    p(24, 10, '#14131a', 1, 4);

    // 車体メインカラー
    p(3, 9, mainColor, 19, 3);
    p(2, 10, mainColor, 22, 2);
    // 車体ハイライト＆シャドウ
    p(4, 9, '#ffffff', 5, 1);
    p(2, 12, darkColor, 22, 2);

    // バンパー・ヘッドライト・テールランプ
    p(23, 10, '#fef08a', 2, 2); // ヘッドライト
    p(1, 10, '#ef4444', 1, 2);  // テールランプ
    p(1, 13, '#cbd5e1', 2, 1);  // リアバンパー
    p(23, 13, '#cbd5e1', 2, 1); // フロントバンパー

    // タイヤ2輪（ドット絵ホイール）
    const drawWheel = (wx, wy) => {
      p(wx, wy, '#14131a', 5, 5);
      p(wx + 1, wy + 1, '#334155', 3, 3);
      p(wx + 2, wy + 2, '#e2e8f0', 1, 1);
    };
    drawWheel(4, 13);
    drawWheel(17, 13);

    // 借金がある場合、後部から紫のモヤモヤ煙ドット
    if (debtCount > 0) {
      p(0, 7, '#6b21a8', 2, 2);
      p(1, 5, '#9333ea', 2, 2);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  /**
   * マイホーム（全10種）のドット絵スプライト(24x20)
   */
  getHouseCanvas(houseType = 0, scale = 3) {
    const key = `house_${houseType}_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const w = 24;
    const h = 20;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const p = (x, y, col, pw = 1, ph = 1) => {
      ctx.fillStyle = col;
      ctx.fillRect(x * scale, y * scale, pw * scale, ph * scale);
    };

    const configs = [
      { roof: '#dc2626', wall: '#fef3c7', door: '#92400e', win: '#38bdf8', style: 'cottage' },
      { roof: '#92400e', wall: '#d97706', door: '#451a03', win: '#fde047', style: 'log' },
      { roof: '#2563eb', wall: '#f8fafc', door: '#1e40af', win: '#7dd3fc', style: 'modern' },
      { roof: '#059669', wall: '#ecfdf5', door: '#065f46', win: '#38bdf8', style: 'villa' },
      { roof: '#7c2d12', wall: '#ea580c', door: '#27272a', win: '#fef08a', style: 'brick' },
      { roof: '#4f46e5', wall: '#e0e7ff', door: '#312e81', win: '#38bdf8', style: 'mansion' },
      { roof: '#0f172a', wall: '#94a3b8', door: '#38bdf8', win: '#bae6fd', style: 'tower' },
      { roof: '#334155', wall: '#fef9c3', door: '#78350f', win: '#fde047', style: 'japanese' },
      { roof: '#ca8a04', wall: '#fef08a', door: '#854d0e', win: '#38bdf8', style: 'palace' },
      { roof: '#9333ea', wall: '#fae8ff', door: '#6b21a8', win: '#f472b6', style: 'castle' }
    ];
    const cfg = configs[Math.abs(houseType) % configs.length];

    // 芝生土台
    p(1, 17, '#166534', 22, 2);
    p(2, 16, '#22c55e', 20, 1);

    if (cfg.style === 'tower') {
      // タワーマンション
      p(5, 2, '#14131a', 14, 15);
      p(6, 3, cfg.wall, 12, 14);
      p(4, 2, cfg.roof, 16, 2);
      for (let wy = 5; wy <= 13; wy += 3) {
        for (let wx = 7; wx <= 15; wx += 3) {
          p(wx, wy, cfg.win, 2, 2);
        }
      }
      p(10, 14, cfg.door, 4, 3);
    } else if (cfg.style === 'castle' || cfg.style === 'palace') {
      // 城・宮殿
      p(2, 5, '#14131a', 5, 12);
      p(17, 5, '#14131a', 5, 12);
      p(6, 7, '#14131a', 12, 10);
      p(3, 6, cfg.wall, 3, 11);
      p(18, 6, cfg.wall, 3, 11);
      p(7, 8, cfg.wall, 10, 9);
      // 尖塔屋根
      p(2, 3, cfg.roof, 5, 3);
      p(3, 1, cfg.roof, 3, 2);
      p(17, 3, cfg.roof, 5, 3);
      p(18, 1, cfg.roof, 3, 2);
      p(8, 4, cfg.roof, 8, 4);
      p(10, 2, '#facc15', 4, 2);
      p(10, 12, cfg.door, 4, 5);
      p(8, 9, cfg.win, 2, 2);
      p(14, 9, cfg.win, 2, 2);
    } else {
      // 一般住宅・ヴィラ・洋館
      for (let i = 0; i < 7; i++) {
        p(3 + i, 8 - i, '#14131a', 18 - i * 2, 1);
        p(4 + i, 8 - i, cfg.roof, 16 - i * 2, 1);
      }
      p(16, 2, '#78350f', 3, 5); // 煙突
      p(4, 9, '#14131a', 16, 8);
      p(5, 9, cfg.wall, 14, 8);
      p(7, 11, '#14131a', 4, 4);
      p(8, 12, cfg.win, 2, 2);
      p(13, 11, '#14131a', 5, 6);
      p(14, 12, cfg.door, 3, 5);
      p(16, 14, '#facc15', 1, 1);
    }

    this.cache.set(key, canvas);
    return canvas;
  }

  getHouseDataUrl(houseType = 0, scale = 3) {
    return this.getHouseCanvas(houseType, scale).toDataURL();
  }

  /**
   * イベントカード・マス目詳細に表示する低解像度ドット絵シーン(64x36)を生成
   * 各マスのカテゴリやイベント種別に応じて、空・地面・建物・キャラクター・演出をドットで描画します。
   */
  renderSceneDataUrl(sceneType = 'normal', scale = 3) {
    const key = `scene_${sceneType}_${scale}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const w = 64;
    const h = 36;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const p = (x, y, col, pw = 1, ph = 1) => {
      ctx.fillStyle = col;
      ctx.fillRect(Math.floor(x) * scale, Math.floor(y) * scale, Math.ceil(pw) * scale, Math.ceil(ph) * scale);
    };

    // 背景テーマ設定
    const isNight = ['casino', 'trouble', 'debt', 'revenge', 'dice'].includes(sceneType);
    const isSunset = ['payday', 'rankup', 'bridge', 'goal'].includes(sceneType);
    const isPink = ['wedding', 'baby', 'love'].includes(sceneType);

    // 1. 空グラデーション（ドット階段状）
    if (isNight) {
      p(0, 0, '#0f172a', w, 10);
      p(0, 10, '#1e1b4b', w, 10);
      p(0, 20, '#312e81', w, 8);
      // 星ドット
      [[6, 4], [14, 7], [28, 3], [45, 5], [56, 8], [21, 12], [51, 14]].forEach(([sx, sy]) => {
        p(sx, sy, '#fef08a', 1, 1);
      });
    } else if (isSunset) {
      p(0, 0, '#7c2d12', w, 8);
      p(0, 8, '#ea580c', w, 9);
      p(0, 17, '#facc15', w, 11);
    } else if (isPink) {
      p(0, 0, '#fbcfe8', w, 10);
      p(0, 10, '#fce7f3', w, 10);
      p(0, 20, '#fff1f2', w, 8);
    } else {
      p(0, 0, '#38bdf8', w, 10);
      p(0, 10, '#7dd3fc', w, 10);
      p(0, 20, '#bae6fd', w, 8);
      // 白い雲ドット
      p(8, 5, '#ffffff', 8, 3);
      p(10, 4, '#ffffff', 4, 1);
      p(44, 7, '#ffffff', 10, 3);
      p(46, 6, '#ffffff', 6, 1);
    }

    // 2. 遠景の山・街並みと地面
    p(0, 26, '#15803d', w, 3);
    p(0, 29, '#166534', w, 7);
    // 道路
    p(0, 30, '#475569', w, 5);
    for (let rx = 2; rx < w; rx += 8) {
      p(rx, 32, '#f8fafc', 4, 1);
    }

    // 3. シーン別のメインドット絵オブジェクト描画
    if (sceneType === 'wedding' || sceneType === 'baby') {
      // 教会とベルとハート紙吹雪
      p(22, 10, '#14131a', 20, 18);
      p(23, 11, '#fff1f2', 18, 17);
      p(28, 4, '#db2777', 8, 7);
      p(31, 1, '#facc15', 2, 4);
      p(30, 2, '#facc15', 4, 1);
      p(29, 19, '#9f1239', 6, 9);
      // 紙吹雪
      [[10, 8, '#f43f5e'], [15, 14, '#facc15'], [48, 9, '#38bdf8'], [52, 16, '#ec4899'], [12, 20, '#4ade80']].forEach(([cx, cy, cc]) => {
        p(cx, cy, cc, 2, 2);
      });
    } else if (sceneType === 'job' || sceneType === 'rankup' || sceneType === 'job_change' || sceneType === 'stock') {
      // オフィスビル群
      p(10, 12, '#1e293b', 12, 16);
      p(24, 6, '#0f172a', 16, 22);
      p(42, 10, '#334155', 12, 18);
      for (let by = 8; by < 25; by += 3) {
        for (let bx = 26; bx < 38; bx += 3) {
          p(bx, by, '#fef08a', 2, 2);
        }
      }
      if (sceneType === 'rankup') {
        p(29, 2, '#facc15', 6, 4); // 王冠
      }
    } else if (sceneType === 'payday' || sceneType === 'cash_plus' || sceneType === 'treasure') {
      // 黄金の金庫・札束・キラキラ
      p(22, 11, '#14131a', 20, 16);
      p(23, 12, '#facc15', 18, 14);
      p(25, 14, '#fef08a', 14, 10);
      p(29, 16, '#15803d', 6, 6);
      [[12, 9], [16, 17], [48, 10], [52, 18], [8, 15]].forEach(([gx, gy]) => {
        p(gx, gy, '#fde047', 3, 3);
        p(gx + 1, gy + 1, '#ffffff', 1, 1);
      });
    } else if (sceneType === 'house') {
      // マイホーム通り
      const houseC = this.getHouseCanvas(2, 1);
      ctx.drawImage(houseC, 20 * scale, 9 * scale, 24 * scale, 20 * scale);
    } else if (sceneType === 'dice' || sceneType === 'casino') {
      // カジノネオン＆ダブルダイス
      p(16, 10, '#14131a', 12, 12);
      p(17, 11, '#ffffff', 10, 10);
      p(21, 15, '#ef4444', 2, 2);
      p(34, 12, '#14131a', 12, 12);
      p(35, 13, '#ffffff', 10, 10);
      p(37, 15, '#14131a', 2, 2);
      p(41, 19, '#14131a', 2, 2);
      p(39, 17, '#14131a', 2, 2);
    } else if (sceneType === 'goal' || sceneType === 'castle') {
      // 大富豪キャッスル
      const castleC = this.getHouseCanvas(9, 1);
      ctx.drawImage(castleC, 20 * scale, 8 * scale, 24 * scale, 20 * scale);
      p(8, 8, '#facc15', 3, 3);
      p(52, 7, '#facc15', 3, 3);
    } else if (sceneType === 'debt' || sceneType === 'trouble' || sceneType === 'accident') {
      // 雷と雨雲とトラブル
      p(18, 4, '#334155', 28, 7);
      p(30, 11, '#facc15', 4, 5);
      p(28, 16, '#facc15', 4, 5);
      p(26, 21, '#facc15', 4, 5);
    }

    // 4. 道路を走るドット絵の赤い車
    const carC = this.getCarSpriteCanvas('#ef4444', '#991b1b', true, 2, 0, 1);
    ctx.drawImage(carC, 6 * scale, 16 * scale, 26 * scale, 19 * scale);

    const url = canvas.toDataURL();
    this.cache.set(key, url);
    return url;
  }
}

window.pixelArt = new PixelArtEngine();
