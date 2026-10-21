export type FlowerId = 'rose' | 'lotus' | 'lily' | 'tulip' | 'cherry' | 'daisy'
export type EnvId = 'studio' | 'bamboo' | 'moon' | 'cosmic' | 'dawn' | 'amber' | 'aurora'

export interface Flower {
  id: FlowerId
  name: string
  short: string
  latin: string
  accent: string
  accent2: string
  tagline: string
  poem: string
  description: string
  palette: string[]
  model: string
  preview: string
  previewT: number
  season: string
}

export interface EnvironmentInfo {
  id: EnvId
  name: string
  en: string
  accent: string
  chip: string
  poem: string
  description: string
  fog: string
}

export const FLOWERS: Flower[] = [
  {
    id: 'rose',
    name: '焰影玫瑰',
    short: '玫瑰',
    latin: 'Rosa × damascena',
    accent: '#ff6f8d',
    accent2: '#ffc2cd',
    tagline: '烈焰藏于层叠的温柔',
    poem: '把火焰折进花瓣，一层一层，缓慢地交还给人间。',
    description:
      '二十五片花瓣沿黄金螺旋错落生长。合拢时是一枚深红的心脏，张开时像一场克制而滚烫的焰火。',
    palette: ['#4b0515', '#a40f31', '#e02a4e', '#ffb6c2'],
    model: '/models/flowers/rose.glb',
    preview: '/previews/rose.png',
    previewT: 0.72,
    season: 'SUMMER · 夏',
  },
  {
    id: 'lotus',
    name: '月露莲华',
    short: '莲花',
    latin: 'Nelumbo nucifera',
    accent: '#ff9fc1',
    accent2: '#ffe7ef',
    tagline: '一池清辉，向光而生',
    poem: '月露落在莲心，花开的声音，比水更轻。',
    description:
      '莲瓣由深至浅，围绕金色莲蓬次第舒展。外层先向水面俯身，内层再托起月光，像一座会呼吸的塔。',
    palette: ['#fff1e6', '#ffd3dd', '#ff9db8', '#f26b93'],
    model: '/models/flowers/lotus.glb',
    preview: '/previews/lotus.png',
    previewT: 0.8,
    season: 'MIDSUMMER · 盛夏',
  },
  {
    id: 'lily',
    name: '鎏金百合',
    short: '百合',
    latin: 'Lilium candidum',
    accent: '#f4c68a',
    accent2: '#fff1dc',
    tagline: '白色火焰，金色心跳',
    poem: '六瓣白焰翻开，金粉在风里轻轻发亮。',
    description:
      '修长的六枚花被片向外反卷，露出鎏金花药与青玉般的雌蕊。它总在最安静的时候，完成最盛大的开放。',
    palette: ['#f8edcf', '#ffedd2', '#f9c3c7', '#e77e95'],
    model: '/models/flowers/lily.glb',
    preview: '/previews/lily.png',
    previewT: 0.88,
    season: 'LATE SPRING · 暮春',
  },
  {
    id: 'tulip',
    name: '琥珀郁金',
    short: '郁金香',
    latin: 'Tulipa gesneriana',
    accent: '#ff9a63',
    accent2: '#ffd89a',
    tagline: '把春光斟进一只杯',
    poem: '琥珀色的杯盏微微倾斜，接住清晨第一滴光。',
    description:
      '六片花瓣围合成一只温柔的酒杯，从蜜金到朱砂，把整个春天层层斟满。',
    palette: ['#ffcf63', '#ff8a3d', '#f24a3f', '#c91f3e'],
    model: '/models/flowers/tulip.glb',
    preview: '/previews/tulip.png',
    previewT: 0.8,
    season: 'EARLY SPRING · 早春',
  },
  {
    id: 'cherry',
    name: '春雪樱',
    short: '樱花',
    latin: 'Prunus serrulata',
    accent: '#ffb3c7',
    accent2: '#fff0f5',
    tagline: '一瓣轻落，春天有声',
    poem: '花开在指尖，风一吹，雪就有了颜色。',
    description:
      '五枚微凹的花瓣，边缘带着浅浅的缺口。细长的花丝托起金色花药，像一场停在半空的春雪。',
    palette: ['#ff9dbb', '#ffbcd1', '#ffe3eb', '#fff6f9'],
    model: '/models/flowers/cherry.glb',
    preview: '/previews/cherry.png',
    previewT: 0.95,
    season: 'SPRING · 春',
  },
  {
    id: 'daisy',
    name: '浮光雏菊',
    short: '雏菊',
    latin: 'Bellis perennis',
    accent: '#ffd76e',
    accent2: '#fff4da',
    tagline: '细小的光，围成太阳',
    poem: '每一道白光都朝同一个方向，围成内心的太阳。',
    description:
      '三十二枚洁白的花瓣围住暖金色花心。它不喧哗，却让整片原野都有了方向感。',
    palette: ['#fff1d0', '#fffdf3', '#ffffff', '#f2b21f'],
    model: '/models/flowers/daisy.glb',
    preview: '/previews/daisy.png',
    previewT: 1,
    season: 'HEYDAY · 盛花期',
  },
]

export const ENVIRONMENTS: EnvironmentInfo[] = [
  {
    id: 'studio',
    name: '晨光花室',
    en: 'THE ATELIER',
    accent: '#c9a87d',
    chip: '#f4eadc',
    poem: '晨光落在花瓣上，细节便有了呼吸。',
    description: '奶油色天光、暖石与细微浮尘。像一册植物标本，也像一次缓慢的呼吸。',
    fog: '#f0e9dd',
  },
  {
    id: 'bamboo',
    name: '雾竹幽庭',
    en: 'MISTY BAMBOO',
    accent: '#8fb59a',
    chip: '#dcecdf',
    poem: '竹影摇过石灯，雾气把晨光折成细线。',
    description: '青苔、竹节与石灯。薄雾在竹林间缓慢流动，光从叶隙落下，像一场不会惊动花开的雨。',
    fog: '#e3ebdc',
  },
  {
    id: 'moon',
    name: '月下镜湖',
    en: 'MOONLIT LAKE',
    accent: '#a9ccff',
    chip: '#cfe4ff',
    poem: '月光落入水面，花影随呼吸起伏。',
    description: '静水、低月与远山。萤火在芦苇间浮动，风把花瓣的影子揉进湖面。',
    fog: '#071018',
  },
  {
    id: 'cosmic',
    name: '星穹花庭',
    en: 'CELESTIAL COURT',
    accent: '#b493ff',
    chip: '#d9c8ff',
    poem: '群星为幕，花在宇宙中央醒来。',
    description: '漂浮的晶石、紫青星云与极细的宇宙尘。花朵像一座被群星托起的王座。',
    fog: '#0b0718',
  },
  {
    id: 'dawn',
    name: '晨曦云海',
    en: 'DAWN ABOVE CLOUDS',
    accent: '#ffb27a',
    chip: '#ffe0bd',
    poem: '第一缕光穿过云层，落在花瓣上。',
    description: '淡金天光、层叠云海与悬浮的晨雾。花在云上，等一场温柔的天亮。',
    fog: '#1b1720',
  },
  {
    id: 'amber',
    name: '琥珀秋苑',
    en: 'AMBER AUTUMN',
    accent: '#ffb15c',
    chip: '#ffe0b8',
    poem: '斜阳穿过枝影，落叶替花朵数着时间。',
    description: '低垂的秋阳、剪影般的枝干与缓慢旋落的琥珀色叶片。风经过时，整座庭院都在发光。',
    fog: '#2a1913',
  },
  {
    id: 'aurora',
    name: '极光冰原',
    en: 'AURORA TUNDRA',
    accent: '#8fffd2',
    chip: '#c8ffeb',
    poem: '风与极光，在冰面上写下绿意的诗。',
    description: '幽绿的极光帷幕、带裂纹的冰原与缓缓落下的雪。冷冽，却让花色更热。',
    fog: '#051214',
  },
]

export const GESTURES = [
  {
    id: 'open',
    title: '张开手掌',
    en: 'OPEN PALM',
    key: '✋',
    action: '花朵绽放',
    detail: '五指舒展，花随掌心的开阔度盛开；缓慢开合，可以控制每一层花瓣。',
    hold: '连续控制',
  },
  {
    id: 'fist',
    title: '轻轻握拳',
    en: 'CLOSED FIST',
    key: '✊',
    action: '花朵收拢',
    detail: '收指成拳，花瓣向花心合拢，回到含苞状态。',
    hold: '连续控制',
  },
  {
    id: 'victory',
    title: '双指如剪',
    en: 'VICTORY',
    key: '✌',
    action: '切换花朵',
    detail: '保持胜利手势约 0.7 秒，花谱翻到下一页，空中会散开一簇花瓣。',
    hold: '0.7s',
  },
  {
    id: 'thumb',
    title: '点赞手势',
    en: 'THUMB UP',
    key: '👍',
    action: '切换花境',
    detail: '翘起拇指保持约 0.7 秒，竹庭、月下、星穹、晨曦、秋苑与极光将依次为你展开。',
    hold: '0.7s',
  },
  {
    id: 'point',
    title: '单指向上',
    en: 'POINT UP',
    key: '☝',
    action: '旋转归位',
    detail: '食指向上约 0.8 秒，让花朵回到正面。手势控制期间自由旋转保持锁定，避免自转干扰观察。',
    hold: '0.8s',
  },
  {
    id: 'tilt',
    title: '倾斜手掌',
    en: 'TILT / ROLL',
    key: '🖐',
    action: 'X · Y · Z 轴微调',
    detail: '手掌左右、上下倾斜控制 X/Y 轴；手腕转动控制 Z 轴。锁定某个轴，可只保留想要的旋转。',
    hold: '连续控制',
  },
  {
    id: 'pinch',
    title: '捏合拖转',
    en: 'PINCH & TURN',
    key: '🤏',
    action: '整支花角度调整',
    detail: '两指捏合（拇指+食指）或五指捏合（指尖聚拢）后移动手掌，像握住花茎一样把整支花拖到任意角度；松开后角度保持，单指向上归零。实景 3DGS 中同样可轻推镜头。',
    hold: '捏合期间连续',
  },
]

export const KEYBOARD_HINTS = [
  ['V', '实景 / 花境'],
  ['1 – 3', '实景场景'],
  ['1 – 6', '切换花朵'],
  ['Q W E R T Y U', '切换花境'],
  ['Space', '绽放 / 收拢'],
  ['A', '自动旋转（关闭手势时）'],
  ['O', '自动巡游'],
  ['X Y Z', '锁定对应轴'],
  ['← ↑ → ↓', '微调旋转'],
  ['G', '手势指南'],
  ['L', '打开花谱'],
  ['S', '设置 · 操控偏好'],
  ['M', '声音'],
  ['F', '全屏'],
  ['H', '隐藏界面'],
]

export type RealSceneId = 'flowers' | 'bonsai' | 'garden'

export interface RealScene {
  id: RealSceneId
  name: string
  en: string
  accent: string
  accent2: string
  latin: string
  tagline: string
  description: string
  asset: string
  cameras: string
  hero: number
  splats: string
  source: string
  exposure: number
  bounds: { zoomMax: number; pitchMax: number; yawMax: number }
  ground?: { x: number; y: number; z: number; radius: number; color: string }
}

export const REAL_SCENES: RealScene[] = [
  {
    id: 'flowers',
    name: '烬红花野',
    en: 'REAL FLOWERBED',
    accent: '#ff7a4d',
    accent2: '#ffc38a',
    latin: 'Canna × hybrida',
    tagline: '整帧重建的花与它的整座花园',
    description:
      '真实的晨光、叶脉与土壤被一起重建进画面。美人蕉与朱蕉层层叠在一起，风经过时，整片花野都在轻微呼吸。',
    asset: '/splats/flowers_v7.spz',
    cameras: '/splats/meta/flowers_cameras.json',
    hero: 0,
    splats: '3.14M',
    source: 'INRIA 3DGS · Mip-NeRF 360 flowers',
    exposure: 0.98,
    bounds: { zoomMax: 2.4, pitchMax: 0.68, yawMax: 3.2 },
    ground: { x: 0, y: 2.6, z: 1, radius: 60, color: '#33421d' },
  },
  {
    id: 'bonsai',
    name: '春枝盆景',
    en: 'BONSAI IN BLOOM',
    accent: '#e97ba6',
    accent2: '#ffd3e0',
    latin: 'Prunus incisa',
    tagline: '一室之内，真实的春天正在开',
    description:
      '粉色花枝从陶盆里探出，落在旧木桌上。房间里的自行车、钢琴与书箱都保留着扫描时的位置，像一段被暂停的下午。',
    asset: '/splats/bonsai_v5.spz',
    cameras: '/splats/meta/bonsai_cameras.json',
    hero: 87,
    splats: '723K',
    source: 'INRIA 3DGS · Mip-NeRF 360 bonsai',
    exposure: 1.5,
    bounds: { zoomMax: 2.8, pitchMax: 1.15, yawMax: 6.29 },
  },
  {
    id: 'garden',
    name: '石径庭院',
    en: 'STONE GARDEN',
    accent: '#9cc47a',
    accent2: '#dbe9bd',
    latin: 'Hortus lapideus',
    tagline: '苔痕、石径与被时间磨亮的院子',
    description:
      '六边形石板被草叶慢慢吞没，雨水留下深浅不一的斑。树影从画面边缘伸进来，真实得能听见脚步。',
    asset: '/splats/garden_v7.spz',
    cameras: '/splats/meta/garden_cameras.json',
    hero: 37,
    splats: '4.04M',
    source: 'INRIA 3DGS · Mip-NeRF 360 garden',
    exposure: 0.98,
    bounds: { zoomMax: 1.9, pitchMax: 1.15, yawMax: 3.2 },
    ground: { x: 0, y: 4.0, z: 1, radius: 55, color: '#3d4d26' },
  },
]
