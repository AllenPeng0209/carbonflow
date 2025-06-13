/**
 * LCA配置工厂类
 * 提供标准化的LCA计算配置预设
 */

import type { LCACalculationConfig } from './types';

/**
 * LCA配置工厂
 */
export class LCAConfigFactory {
  /**
   * 获取基础LCA配置（适用于快速评估）
   */
  static getBasicConfig(): LCACalculationConfig {
    return {
      methodology: {
        impactMethod: 'ReCiPe',
        characterizationFactors: this.getBasicCharacterizationFactors(),
        normalizationFactors: this.getBasicNormalizationFactors(),
        weightingFactors: this.getBasicWeightingFactors(),
      },
      systemBoundary: {
        includedStages: ['原材料', '制造', '使用', '处置'],
        cutoffCriteria: 0.01, // 1%
        geographicalScope: '中国',
        temporalScope: '2020-2025',
        technologyScope: '当前技术',
      },
      allocation: {
        defaultMethod: 'mass',
        processSpecificMethods: {},
        avoidAllocation: false,
      },
      dataQualityRequirements: {
        minimumScore: 3,
        requireUncertaintyData: false,
        temporalThreshold: 5,
        geographicalRelevance: ['中国', '亚洲'],
      },
    };
  }

  /**
   * 获取专业LCA配置（符合ISO 14044标准）
   */
  static getProfessionalConfig(): LCACalculationConfig {
    return {
      methodology: {
        impactMethod: 'ReCiPe',
        characterizationFactors: this.getProfessionalCharacterizationFactors(),
        normalizationFactors: this.getProfessionalNormalizationFactors(),
        weightingFactors: this.getProfessionalWeightingFactors(),
      },
      systemBoundary: {
        includedStages: ['原材料开采', '原材料加工', '制造', '包装', '分销', '使用', '维护', '处置', '回收'],
        cutoffCriteria: 0.005, // 0.5%
        geographicalScope: '全球',
        temporalScope: '2020-2030',
        technologyScope: '最佳可用技术',
      },
      allocation: {
        defaultMethod: 'causal',
        processSpecificMethods: {
          electricity_generation: 'physical',
          multi_product_process: 'economic',
        },
        avoidAllocation: true,
      },
      uncertaintyAnalysis: {
        enabled: true,
        method: 'monte_carlo',
        iterations: 10000,
        confidenceLevel: 0.95,
        sensitivityAnalysis: true,
      },
      dataQualityRequirements: {
        minimumScore: 2,
        requireUncertaintyData: true,
        temporalThreshold: 3,
        geographicalRelevance: ['全球', '区域特定'],
      },
    };
  }

  /**
   * 获取研究型LCA配置（用于学术研究）
   */
  static getResearchConfig(): LCACalculationConfig {
    return {
      methodology: {
        impactMethod: 'ReCiPe',
        characterizationFactors: this.getResearchCharacterizationFactors(),
        normalizationFactors: this.getResearchNormalizationFactors(),
        weightingFactors: this.getResearchWeightingFactors(),
      },
      systemBoundary: {
        includedStages: [
          '原材料开采',
          '原材料运输',
          '原材料加工',
          '制造',
          '制造废料处理',
          '包装',
          '包装运输',
          '分销',
          '零售',
          '使用',
          '维护',
          '维修',
          '处置',
          '回收',
          '最终处置',
        ],
        cutoffCriteria: 0.001, // 0.1%
        geographicalScope: '多区域比较',
        temporalScope: '2020-2050',
        technologyScope: '技术场景分析',
      },
      allocation: {
        defaultMethod: 'causal',
        processSpecificMethods: {
          electricity_generation: 'physical',
          heat_production: 'physical',
          multi_product_chemical: 'economic',
          waste_treatment: 'causal',
          recycling_process: 'causal',
        },
        avoidAllocation: true,
      },
      uncertaintyAnalysis: {
        enabled: true,
        method: 'monte_carlo',
        iterations: 50000,
        confidenceLevel: 0.99,
        sensitivityAnalysis: true,
      },
      dataQualityRequirements: {
        minimumScore: 1,
        requireUncertaintyData: true,
        temporalThreshold: 2,
        geographicalRelevance: ['多区域', '特定技术'],
      },
    };
  }

  /**
   * 获取碳足迹专用配置
   */
  static getCarbonFootprintConfig(): LCACalculationConfig {
    return {
      methodology: {
        impactMethod: 'TRACI',
        characterizationFactors: this.getCarbonFootprintCharacterizationFactors(),
        normalizationFactors: {},
        weightingFactors: {},
      },
      systemBoundary: {
        includedStages: ['原材料', '制造', '运输', '使用', '处置'],
        cutoffCriteria: 0.01,
        geographicalScope: '中国',
        temporalScope: '当前',
        technologyScope: '平均技术',
      },
      allocation: {
        defaultMethod: 'mass',
        processSpecificMethods: {},
        avoidAllocation: false,
      },
      dataQualityRequirements: {
        minimumScore: 3,
        requireUncertaintyData: false,
        temporalThreshold: 5,
        geographicalRelevance: ['中国'],
      },
    };
  }

  /**
   * 基础特征化因子
   */
  private static getBasicCharacterizationFactors(): Record<string, Record<string, number>> {
    return {
      // 全球变暖潜力 (GWP100, IPCC 2013)
      globalWarmingPotential: {
        CO2: 1,
        CH4: 28,
        N2O: 265,
        SF6: 23500,
        'HFC-134a': 1300,
        'PFC-14': 6630,
      },

      // 酸化潜力 (CML 2001)
      acidificationPotential: {
        SO2: 1,
        NH3: 1.88,
        NOx: 0.7,
        HCl: 0.88,
      },

      // 富营养化潜力 (CML 2001)
      eutrophicationPotential: {
        PO4: 1,
        NH3: 0.35,
        NOx: 0.13,
        N2O: 0.27,
      },
    };
  }

  private static getBasicNormalizationFactors(): Record<string, number> {
    return {
      globalWarmingPotential: 1.13e13, // kg CO2-eq/year
      acidificationPotential: 5.98e10, // kg SO2-eq/year
      eutrophicationPotential: 1.95e10, // kg PO4-eq/year
    };
  }

  private static getBasicWeightingFactors(): Record<string, number> {
    return {
      globalWarmingPotential: 0.4,
      acidificationPotential: 0.2,
      eutrophicationPotential: 0.2,
      ozoneDepletionPotential: 0.1,
      humanToxicityPotential: 0.1,
    };
  }

  /**
   * 专业特征化因子（更全面）
   */
  private static getProfessionalCharacterizationFactors(): Record<string, Record<string, number>> {
    return {
      // ReCiPe 2016 特征化因子
      globalWarmingPotential: {
        CO2: 1,
        CH4: 28,
        N2O: 265,
        SF6: 23500,
        'HFC-134a': 1300,
        'HFC-32': 677,
        'HFC-125': 3170,
        'PFC-14': 6630,
        'PFC-116': 11100,
      },
      acidificationPotential: {
        SO2: 1,
        NH3: 1.88,
        NOx: 0.7,
        HCl: 0.88,
        HF: 1.6,
        H2S: 1.88,
      },
      eutrophicationPotential: {
        PO4: 1,
        NH3: 0.35,
        NOx: 0.13,
        N2O: 0.27,
        NH4: 0.33,
        NO3: 0.1,
      },
      ozoneDepletionPotential: {
        'CFC-11': 1,
        'CFC-12': 0.73,
        'CFC-113': 0.85,
        'HCFC-22': 0.034,
        'HCFC-141b': 0.086,
        'HCFC-142b': 0.043,
      },
      humanToxicityPotential: {
        Arsenic: 2.5,
        Cadmium: 9.9,
        'Chromium VI': 0.5,
        Lead: 5.1,
        Mercury: 13,
      },
      ecotoxicityPotential: {
        Copper: 1.9,
        Zinc: 0.74,
        Nickel: 2.6,
        PAH: 170,
      },
    };
  }

  private static getProfessionalNormalizationFactors(): Record<string, number> {
    return {
      globalWarmingPotential: 1.13e13,
      acidificationPotential: 5.98e10,
      eutrophicationPotential: 1.95e10,
      ozoneDepletionPotential: 9.86e7,
      humanToxicityPotential: 1.84e12,
      ecotoxicityPotential: 8.57e12,
      landUse: 2.34e10,
      waterUse: 1.15e12,
    };
  }

  private static getProfessionalWeightingFactors(): Record<string, number> {
    return {
      globalWarmingPotential: 0.25,
      acidificationPotential: 0.15,
      eutrophicationPotential: 0.15,
      ozoneDepletionPotential: 0.05,
      humanToxicityPotential: 0.2,
      ecotoxicityPotential: 0.1,
      landUse: 0.05,
      waterUse: 0.05,
    };
  }

  /**
   * 研究型特征化因子（最全面）
   */
  private static getResearchCharacterizationFactors(): Record<string, Record<string, number>> {
    const professional = this.getProfessionalCharacterizationFactors();

    // 扩展研究型因子
    return {
      ...professional,

      // 新兴污染物
      microplastics: {
        PE_microplastic: 0.001,
        PP_microplastic: 0.001,
        PET_microplastic: 0.002,
      },

      // 纳米材料
      nanomaterials: {
        TiO2_nano: 0.1,
        SiO2_nano: 0.05,
        Ag_nano: 50,
      },

      // 生物多样性影响
      biodiversityImpact: {
        land_occupation: 1.0,
        land_transformation: 10.0,
        habitat_fragmentation: 5.0,
      },
    };
  }

  private static getResearchNormalizationFactors(): Record<string, number> {
    const professional = this.getProfessionalNormalizationFactors();

    return {
      ...professional,
      microplastics: 1.0e8,
      nanomaterials: 5.0e7,
      biodiversityImpact: 2.3e9,
    };
  }

  private static getResearchWeightingFactors(): Record<string, number> {
    return {
      globalWarmingPotential: 0.2,
      acidificationPotential: 0.1,
      eutrophicationPotential: 0.1,
      ozoneDepletionPotential: 0.05,
      humanToxicityPotential: 0.15,
      ecotoxicityPotential: 0.15,
      landUse: 0.1,
      waterUse: 0.05,
      microplastics: 0.05,
      nanomaterials: 0.02,
      biodiversityImpact: 0.03,
    };
  }

  /**
   * 碳足迹专用特征化因子
   */
  private static getCarbonFootprintCharacterizationFactors(): Record<string, Record<string, number>> {
    return {
      globalWarmingPotential: {
        CO2: 1,
        CH4: 28,
        N2O: 265,
        SF6: 23500,
        'HFC-134a': 1300,
        'PFC-14': 6630,

        // 生物CO2（根据来源区分）
        CO2_biogenic: 0, // 生物源CO2暂不计入
        CO2_fossil: 1, // 化石源CO2
        // 间接排放
        CO2_electricity: 1, // 电力间接排放
        CO2_heat: 1, // 热力间接排放
      },
    };
  }

  /**
   * 创建自定义配置
   */
  static createCustomConfig(options: {
    impactMethod?: 'ReCiPe' | 'CML' | 'TRACI' | 'EF';
    systemBoundary?: {
      stages?: string[];
      cutoff?: number;
      geography?: string;
      timeframe?: string;
    };
    uncertaintyAnalysis?: boolean;
    dataQualityLevel?: 'basic' | 'professional' | 'research';
  }): LCACalculationConfig {
    const baseConfig = this.getBasicConfig();

    // 应用用户选项
    if (options.impactMethod) {
      baseConfig.methodology.impactMethod = options.impactMethod;
    }

    if (options.systemBoundary) {
      if (options.systemBoundary.stages) {
        baseConfig.systemBoundary.includedStages = options.systemBoundary.stages;
      }

      if (options.systemBoundary.cutoff) {
        baseConfig.systemBoundary.cutoffCriteria = options.systemBoundary.cutoff;
      }

      if (options.systemBoundary.geography) {
        baseConfig.systemBoundary.geographicalScope = options.systemBoundary.geography;
      }

      if (options.systemBoundary.timeframe) {
        baseConfig.systemBoundary.temporalScope = options.systemBoundary.timeframe;
      }
    }

    if (options.uncertaintyAnalysis) {
      baseConfig.uncertaintyAnalysis = {
        enabled: true,
        method: 'monte_carlo',
        iterations: 1000,
        confidenceLevel: 0.95,
        sensitivityAnalysis: true,
      };
    }

    // 根据数据质量级别调整配置
    if (options.dataQualityLevel === 'professional') {
      baseConfig.methodology.characterizationFactors = this.getProfessionalCharacterizationFactors();
      baseConfig.dataQualityRequirements.minimumScore = 2;
    } else if (options.dataQualityLevel === 'research') {
      baseConfig.methodology.characterizationFactors = this.getResearchCharacterizationFactors();
      baseConfig.dataQualityRequirements.minimumScore = 1;
      baseConfig.dataQualityRequirements.requireUncertaintyData = true;
    }

    return baseConfig;
  }

  /**
   * 验证配置完整性
   */
  static validateConfig(config: LCACalculationConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证必需字段
    if (!config.methodology.impactMethod) {
      errors.push('影响评价方法未指定');
    }

    if (!config.systemBoundary.includedStages || config.systemBoundary.includedStages.length === 0) {
      errors.push('系统边界未定义包含的生命周期阶段');
    }

    if (config.systemBoundary.cutoffCriteria < 0 || config.systemBoundary.cutoffCriteria > 1) {
      errors.push('截断标准必须在0-1之间');
    }

    // 验证特征化因子
    if (!config.methodology.characterizationFactors.globalWarmingPotential) {
      warnings.push('未提供全球变暖潜力特征化因子');
    }

    // 验证不确定性分析配置
    if (config.uncertaintyAnalysis?.enabled) {
      if (!config.uncertaintyAnalysis.iterations || config.uncertaintyAnalysis.iterations < 100) {
        warnings.push('蒙特卡洛模拟迭代次数建议至少100次');
      }

      if (config.uncertaintyAnalysis.confidenceLevel < 0.5 || config.uncertaintyAnalysis.confidenceLevel > 1) {
        errors.push('置信水平必须在0.5-1之间');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 获取推荐配置
   */
  static getRecommendedConfig(
    purpose: 'quick_assessment' | 'product_comparison' | 'certification' | 'research',
  ): LCACalculationConfig {
    switch (purpose) {
      case 'quick_assessment':
        return this.getBasicConfig();

      case 'product_comparison':
        return this.getProfessionalConfig();

      case 'certification':
        const certConfig = this.getProfessionalConfig();
        certConfig.dataQualityRequirements.minimumScore = 1;
        certConfig.systemBoundary.cutoffCriteria = 0.001;
        return certConfig;

      case 'research':
        return this.getResearchConfig();

      default:
        return this.getBasicConfig();
    }
  }
}
