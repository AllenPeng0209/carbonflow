import type { CarbonFlowAction } from '~/types/actions';
import type { Node } from 'reactflow';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';

// --- 超级完善的单位换算逻辑 ---

/**
 * 定义一个超详细的单位换算基准值表。
 * 每个类别都有一个基准单位，所有换算都通过这个基准单位进行。
 * 涵盖了质量、距离、面积、体积、能源、时间、运输功和物品等多种类别。
 */
const unitBases = {
  // 质量 (基准: g)
  mass: {
    g: 1,
    gram: 1,
    gr: 1,
    mg: 0.001,
    milligram: 0.001,
    kg: 1000,
    kilogram: 1000,
    t: 1000000,
    ton: 1000000, // 美吨(short ton)在特定键'short-ton'中处理
    tonne: 1000000,
    'metric-ton': 1000000,
    kt: 1000000000, // kilotonne
    lb: 453.59237,
    pound: 453.59237,
    oz: 28.349523125,
    ounce: 28.349523125,
    'short-ton': 907185, // 907.185 kg
    'long-ton': 1016047, // 1016.047 kg
  },
  // 距离 (基准: m)
  distance: {
    m: 1,
    meter: 1,
    km: 1000,
    kilometer: 1000,
    cm: 0.01,
    centimeter: 0.01,
    mm: 0.001,
    millimeter: 0.001,
    mi: 1609.344,
    mile: 1609.344,
    nmi: 1852, // 海里
    ft: 0.3048,
    foot: 0.3048,
    in: 0.0254,
    inch: 0.0254,
    yd: 0.9144,
    yard: 0.9144,
  },
  // 面积 (基准: m^2)
  area: {
    m2: 1,
    'sq-m': 1,
    km2: 1000000,
    'sq-km': 1000000,
    ha: 10000,
    hectare: 10000,
    cm2: 0.0001,
    'sq-cm': 0.0001,
    ft2: 0.092903,
    'sq-ft': 0.092903,
    in2: 0.00064516,
    'sq-in': 0.00064516,
    acre: 4046.86,
  },
  // 体积 (基准: L)
  volume: {
    l: 1,
    liter: 1,
    ml: 0.001,
    milliliter: 0.001,
    m3: 1000,
    'cubic-meter': 1000,
    cm3: 0.001,
    'cubic-centimeter': 0.001,
    gal: 3.78541, // 美制液体加仑
    'uk-gal': 4.54609, // 英制加仑
    qt: 0.946353, // 美制夸脱
    pt: 0.473176, // 美制品脱
    cup: 0.24, // 美制杯
    ft3: 28.3168,
    'cubic-foot': 28.3168,
    in3: 0.0163871,
    'cubic-inch': 0.0163871,
  },
  // 能源 (基准: kWh)
  energy: {
    kwh: 1,
    'kw-h': 1,
    mwh: 1000,
    'mw-h': 1000,
    gwh: 1000000,
    'gw-h': 1000000,
    j: 1 / 3600000,
    joule: 1 / 3600000,
    kj: 1 / 3600,
    kilojoule: 1 / 3600,
    mj: 1 / 3.6,
    megajoule: 1 / 3.6,
    gj: 1000 / 3.6,
    gigajoule: 1000 / 3.6,
    btu: 0.000293071,
    cal: 4.184 / 3600000,
    kcal: 4184 / 3600000,
  },
  // 时间 (基准: h)
  time: {
    s: 1 / 3600,
    sec: 1 / 3600,
    second: 1 / 3600,
    min: 1 / 60,
    minute: 1 / 60,
    h: 1,
    hr: 1,
    hour: 1,
    day: 24,
    week: 168,
    month: 730.001, // (365.25 / 12) * 24
    year: 8766, // 365.25 * 24
  },
  // 运输功 (基准: t-km) - 对于LCA至关重要
  transport: {
    't-km': 1,
    tkm: 1,
    'tonne-km': 1,
    'kg-km': 0.001,
    kgkm: 0.001,
    'g-km': 1e-6,
    gkm: 1e-6,
    'ton-mi': 1.45997, // short-ton * mile -> t-km
    't-mi': 1.60934, // tonne * mile -> t-km
    'lb-km': 0.000453592,
    'lb-mi': 0.00073003, // lb * mile -> t-km
    pkm: 1, // 乘客公里
    'passenger-km': 1,
    'person-km': 1,
    'p-mi': 1.60934,
    'passenger-mile': 1.60934,
    vkm: 1, // 车辆公里
    'vehicle-km': 1,
    'v-mi': 1.60934,
    'vehicle-mile': 1.60934,
  },
  // 物品/数量
  items: {
    item: 1,
    unit: 1,
    piece: 1,
    dozen: 12,
    pair: 2,
    set: 1,
  },
};

/**
 * 计算两个单位之间的换算系数.
 * 这个函数现在可以更好地处理不同的单位写法。
 * @param fromUnit 原始单位.
 * @param toUnit 目标单位.
 * @returns 换算系数, 如果无法换算则返回 1.
 */
function getConversionFactor(fromUnit?: string, toUnit?: string): number {
  if (!fromUnit || !toUnit || fromUnit.toLowerCase() === toUnit.toLowerCase()) {
    return 1;
  }

  // 标准化单位: 转为小写, 去除首尾空格, 将常见分隔符替换为连字号(-)
  const normalize = (unit: string) =>
    unit
      .toLowerCase()
      .trim()
      .replace(/ /g, '-') // "cubic meter" -> "cubic-meter"
      .replace(/\*/g, '-'); // "t*km" -> "t-km"

  const from = normalize(fromUnit);
  const to = normalize(toUnit);

  if (from === to) {
    return 1;
  }

  // 遍历所有单位类别, 寻找匹配的换算规则
  for (const category in unitBases) {
    const rates = unitBases[category as keyof typeof unitBases];
    const fromRate = rates[from as keyof typeof rates];
    const toRate = rates[to as keyof typeof rates];

    if (fromRate !== undefined && toRate !== undefined) {
      // 找到了同一个类别下的两个单位，计算换算系数
      return fromRate / toRate;
    }
  }

  console.warn(`无法在 "${fromUnit}" 和 "${toUnit}" 之间进行单位换算。将默认使用 1 作为系数。`);
  return 1; // 如果找不到换算路径，返回 1
}

/**
 * 重新計算所有節點的碳足跡（carbonFootprint），根據 carbonFactor、quantity 等欄位。
 * 此函數現在會自動處理單位換算，並將換算係數更新到 unitConversion 欄位。
 * @param store Zustand store
 * @param action CarbonFlowAction
 */
export async function handleCalculate(store: typeof useCarbonFlowStore, action: CarbonFlowAction): Promise<void> {
  const nodes = store.getState().nodes;
  const newNodes = nodes.map((node) => {
    let unitConversion: number;

    const activityUnit = node.data.activityUnit;
    const carbonFactorUnit = node.data.carbonFactorUnit;
    

    // 如果可以，计算单位换算系数，否则使用节点上已有的值
    if (activityUnit && carbonFactorUnit) {
      unitConversion = getConversionFactor(activityUnit, carbonFactorUnit);
    } else {
      unitConversion = Number(node.data.unitConversion) || 1;
    }

    // 根據 nodeType 處理不同計算規則
    let carbonFootprint = node.data.carbonFootprint;

    try {
      const carbonFactor = Number(node.data.carbonFactor) || 0;

      let quantity = 1;
      quantity = Number(node.data.quantity) || 1;
       
      carbonFootprint = String(carbonFactor * quantity * unitConversion);

    } catch (e) {
      console.error(`为节点 ${node.id} 计算碳足迹失败`, e);
      // 若計算失敗則保留原值
    }

    return {
      ...node,
      data: {
        ...node.data,
        carbonFootprint,
        unitConversion: String(unitConversion),
      },
    };
  });
  store.getState().setNodes(newNodes);
}
