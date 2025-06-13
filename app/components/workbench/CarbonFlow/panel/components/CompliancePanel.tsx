import React, { useState, useMemo } from 'react';
import { Modal } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  BookOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import type { Node } from 'reactflow';
import type { NodeData } from '~/types/nodes';
import type {
  ComplianceStandard,
  ComplianceRequirement,
  ComplianceScoreDetail,
  ComplianceLevel,
  RequirementSeverity,
} from '~/types/complianceCheck';
import {
  ISO_14067_REQUIREMENTS,
  GHG_PROTOCOL_REQUIREMENTS,
  CBAM_REQUIREMENTS,
  CHINA_ETS_REQUIREMENTS,
  GB_T_32150_REQUIREMENTS,
  SBTI_REQUIREMENTS,
  EU_BATTERY_REGULATION_REQUIREMENTS,
} from '~/types/complianceCheck';

interface CompliancePanelProps {
  className?: string;
  sceneInfo?: {
    standard?: string;
    [key: string]: any;
  };
  nodes: Node<NodeData>[];
}

// 标准名称映射 - 确保与设置模态框中的选项值一致
const STANDARD_NAME_MAP: Record<string, { name: string; standard: ComplianceStandard }> = {
  'ISO 14067': { name: 'ISO 14067 - 产品碳足迹', standard: 'ISO_14067' },
  'ISO 14064': { name: 'ISO 14064 - 温室气体核算', standard: 'ISO_14064' },
  'ISO 14040/14044': { name: 'ISO 14040/14044 - LCA标准', standard: 'ISO_14040_14044' },
  'PAS 2050': { name: 'PAS 2050 - 碳足迹规范', standard: 'PAS_2050' },
  'GHG Protocol': { name: 'GHG Protocol - 温室气体协议', standard: 'GHG_PROTOCOL' },
  'EU 2023/1542': { name: '欧盟电池法', standard: 'EU_BATTERY_REGULATION' },
  'GB/T 32150': { name: 'GB/T 32150 - 工业企业温室气体排放核算', standard: 'GB_T_32150' },
  'GB/T 32151': { name: 'GB/T 32151 - 中国产品碳足迹', standard: 'GB_T_32151' },

  // 保持下划线版本的兼容性
  ISO_14067: { name: 'ISO 14067 - 产品碳足迹', standard: 'ISO_14067' },
  ISO_14040_14044: { name: 'ISO 14040/14044 - LCA标准', standard: 'ISO_14040_14044' },
  ISO_14064: { name: 'ISO 14064 - 温室气体核算', standard: 'ISO_14064' },
  GHG_PROTOCOL: { name: 'GHG Protocol - 温室气体协议', standard: 'GHG_PROTOCOL' },
  CBAM: { name: 'CBAM - 欧盟碳边境调节机制', standard: 'CBAM' },
  EU_BATTERY_REGULATION: { name: '欧盟电池法', standard: 'EU_BATTERY_REGULATION' },
  CHINA_ETS: { name: '中国碳排放交易体系', standard: 'CHINA_ETS' },
  GB_T_32150: { name: 'GB/T 32150 - 工业企业温室气体排放核算', standard: 'GB_T_32150' },
  SBTI: { name: 'SBTi - 科学碳目标倡议', standard: 'SBTI' },
};

// 获取标准要求
const getStandardRequirements = (standard: ComplianceStandard): ComplianceRequirement[] => {
  switch (standard) {
    case 'ISO_14067':
      return ISO_14067_REQUIREMENTS;
    case 'GHG_PROTOCOL':
      return GHG_PROTOCOL_REQUIREMENTS;
    case 'CBAM':
      return CBAM_REQUIREMENTS;
    case 'CHINA_ETS':
      return CHINA_ETS_REQUIREMENTS;
    case 'GB_T_32150':
      return GB_T_32150_REQUIREMENTS;
    case 'SBTI':
      return SBTI_REQUIREMENTS;
    case 'EU_BATTERY_REGULATION':
      return EU_BATTERY_REGULATION_REQUIREMENTS;
    default:
      return [];
  }
};

// 合规等级颜色映射
const COMPLIANCE_LEVEL_COLORS: Record<ComplianceLevel, string> = {
  full_compliance: '#52c41a',
  substantial_compliance: '#1890ff',
  partial_compliance: '#fa8c16',
  non_compliance: '#ff4d4f',
};

// 合规等级名称映射
const COMPLIANCE_LEVEL_NAMES: Record<ComplianceLevel, string> = {
  full_compliance: '完全合规',
  substantial_compliance: '基本合规',
  partial_compliance: '部分合规',
  non_compliance: '不合规',
};

// 严重性图标映射
const SEVERITY_ICONS: Record<RequirementSeverity, React.ReactNode> = {
  critical: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
  major: <WarningOutlined style={{ color: '#fa8c16' }} />,
  minor: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
};

// 严重性名称映射
const SEVERITY_NAMES: Record<RequirementSeverity, string> = {
  critical: '关键',
  major: '重要',
  minor: '次要',
};

// 简化的合规评估函数
const assessCompliance = (requirements: ComplianceRequirement[], nodes: Node<NodeData>[]): ComplianceScoreDetail => {
  const requirementResults = requirements.map((req) => {
    // 简化的评分逻辑
    let score = 0;
    let compliant = false;
    const evidence: string[] = [];
    const gaps: string[] = [];
    const recommendations: string[] = [];

    // 根据节点数据进行基本评估
    if (nodes.length > 0) {
      // 基础数据完整性检查
      const hasBasicData = nodes.some((node) => node.data?.label && node.data?.carbonFactor && node.data?.quantity);

      if (hasBasicData) {
        score += 30;
        evidence.push('存在基础排放数据');
      } else {
        gaps.push('缺少基础排放数据');
        recommendations.push('请完善节点的基础数据（标签、碳因子、数量）');
      }

      // 生命周期覆盖度检查
      const lifecycleStages = new Set(nodes.map((node) => node.data?.lifecycleStage).filter(Boolean));
      const coverageScore = Math.min(40, lifecycleStages.size * 10);
      score += coverageScore;

      if (lifecycleStages.size >= 3) {
        evidence.push(`覆盖${lifecycleStages.size}个生命周期阶段`);
      } else {
        gaps.push('生命周期阶段覆盖不足');
        recommendations.push('请增加更多生命周期阶段的数据');
      }

      // 数据质量检查
      const hasDetailedData = nodes.some((node) => node.data?.activityUnit);

      if (hasDetailedData) {
        score += 30;
        evidence.push('存在详细的数据来源和单位信息');
      } else {
        gaps.push('缺少详细的数据质量信息');
        recommendations.push('请补充数据来源和单位信息');
      }
    } else {
      gaps.push('没有排放源数据');
      recommendations.push('请添加排放源');
    }

    compliant = score >= 70;

    return {
      requirementId: req.id,
      compliant,
      score,
      evidence,
      gaps,
      recommendations,
    };
  });

  // 计算总分
  const totalScore = requirements.reduce((sum, req, index) => {
    return sum + requirementResults[index].score * req.weight;
  }, 0);

  const overallScore = Math.round(totalScore);

  // 确定合规等级
  let level: ComplianceLevel = 'non_compliance';
  if (overallScore >= 90) {
    level = 'full_compliance';
  } else if (overallScore >= 75) {
    level = 'substantial_compliance';
  } else if (overallScore >= 60) {
    level = 'partial_compliance';
  }

  // 统计问题
  const compliantCount = requirementResults.filter((r) => r.compliant).length;
  const criticalIssues = requirementResults.filter((r, i) => !r.compliant && requirements[i].severity === 'critical').length;
  const majorIssues = requirementResults.filter((r, i) => !r.compliant && requirements[i].severity === 'major').length;
  const minorIssues = requirementResults.filter((r, i) => !r.compliant && requirements[i].severity === 'minor').length;

  return {
    standard: (requirements[0]?.category as ComplianceStandard) || 'ISO_14067',
    overallScore,
    level,
    categoryScores: [],
    mandatoryScore: overallScore,
    mandatoryCompliance: criticalIssues === 0,
    recommendedScore: overallScore,
    requirementResults,
    nodeIssues: [],
    summary: {
      totalRequirements: requirements.length,
      compliantRequirements: compliantCount,
      criticalIssues,
      majorIssues,
      minorIssues,
    },
    improvements: [],
  };
};

// 完整法规面板组件
const FullComplianceModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  currentStandard: { name: string; standard: ComplianceStandard };
  complianceResult: ComplianceScoreDetail;
  groupedRequirements: Record<string, Array<{ requirement: ComplianceRequirement; result: any }>>;
}> = ({ visible, onClose, currentStandard, complianceResult, groupedRequirements }) => {
  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <BookOutlined style={{ color: '#3b82f6', fontSize: '20px' }} />
          <span className="text-lg font-semibold text-bolt-elements-textPrimary">{currentStandard.name} - 完整合规评估</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
      style={{ top: 20 }}
      className="compliance-modal"
      styles={{
        content: {
          backgroundColor: 'var(--bolt-elements-background-depth-1)',
          borderRadius: '12px',
        },
        header: {
          backgroundColor: 'var(--bolt-elements-background-depth-2)',
          borderBottom: '1px solid var(--bolt-elements-borderColor)',
          borderRadius: '12px 12px 0 0',
          padding: '16px 24px',
        },
        body: {
          padding: '0',
          backgroundColor: 'var(--bolt-elements-background-depth-1)',
        },
        mask: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        },
      }}
    >
      <div className="max-h-[80vh] overflow-auto bg-bolt-elements-background-depth-1">
        {/* 总体评分区域 */}
        <div className="bg-bolt-elements-background-depth-2 p-6 rounded-lg mb-6 border border-bolt-elements-borderColor">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 总体评分 */}
            <div className="text-center">
              <div
                className="text-3xl font-bold mb-2"
                style={{ color: COMPLIANCE_LEVEL_COLORS[complianceResult.level] }}
              >
                {complianceResult.overallScore}%
              </div>
              <div
                className="px-3 py-1 rounded-full text-base font-medium inline-block mb-2"
                style={{
                  backgroundColor: COMPLIANCE_LEVEL_COLORS[complianceResult.level] + '20',
                  color: COMPLIANCE_LEVEL_COLORS[complianceResult.level],
                  border: `2px solid ${COMPLIANCE_LEVEL_COLORS[complianceResult.level]}40`,
                }}
              >
                {COMPLIANCE_LEVEL_NAMES[complianceResult.level]}
              </div>
              <div className="w-full bg-bolt-elements-background-depth-3 rounded-full h-3 overflow-hidden border border-bolt-elements-borderColor">
                <div
                  className="h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, complianceResult.overallScore))}%`,
                    backgroundColor: COMPLIANCE_LEVEL_COLORS[complianceResult.level],
                  }}
                />
              </div>
            </div>

            {/* 达标统计 */}
            <div className="text-center">
              <div className="text-2xl font-bold text-bolt-elements-textPrimary mb-2">
                {complianceResult.summary.compliantRequirements}/{complianceResult.summary.totalRequirements}
              </div>
              <div className="text-bolt-elements-textSecondary mb-4">已达标要求</div>
              <div className="text-sm text-bolt-elements-textSecondary">
                完成率:{' '}
                {Math.round(
                  (complianceResult.summary.compliantRequirements / complianceResult.summary.totalRequirements) * 100,
                )}
                %
              </div>
            </div>

            {/* 问题统计 */}
            <div className="text-center">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-red-400">关键问题:</span>
                  <span className="font-medium text-bolt-elements-textPrimary">{complianceResult.summary.criticalIssues}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-orange-400">重要问题:</span>
                  <span className="font-medium text-bolt-elements-textPrimary">{complianceResult.summary.majorIssues}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-400">次要问题:</span>
                  <span className="font-medium text-bolt-elements-textPrimary">{complianceResult.summary.minorIssues}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 详细要求列表 */}
        <div className="space-y-6">
          {Object.entries(groupedRequirements).map(([category, items]) => {
            const categoryScore = Math.round(items.reduce((sum, item) => sum + item.result.score, 0) / items.length);
            const compliantCount = items.filter((item) => item.result.compliant).length;

            return (
              <div key={category} className="bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg">
                {/* 类别标题 */}
                <div className="bg-bolt-elements-background-depth-3 p-4 border-b border-bolt-elements-borderColor rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-bolt-elements-textPrimary">{category}</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-bolt-elements-textSecondary">
                        {compliantCount}/{items.length} 达标
                      </span>
                      <div className="w-24 bg-bolt-elements-background-depth-1 rounded-full h-2 overflow-hidden border border-bolt-elements-borderColor">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(0, categoryScore))}%`,
                            backgroundColor:
                              categoryScore >= 70 ? '#10b981' : categoryScore >= 50 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-bolt-elements-textPrimary">{categoryScore}%</span>
                    </div>
                  </div>
                </div>

                {/* 要求列表 */}
                <div className="p-4 space-y-4">
                  {items.map(({ requirement, result }) => (
                    <div
                      key={requirement.id}
                      className="border-l-4 pl-4 bg-bolt-elements-background-depth-3 p-4 rounded-lg"
                      style={{ borderColor: result.compliant ? '#10b981' : '#ef4444' }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          {SEVERITY_ICONS[requirement.severity]}
                          <h4 className="text-base font-medium text-bolt-elements-textPrimary">{requirement.name}</h4>
                          {requirement.mandatory && (
                            <span className="px-2 py-1 bg-red-500 text-white text-sm rounded">必须</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {result.compliant ? (
                            <CheckCircleOutlined style={{ color: '#10b981', fontSize: '18px' }} />
                          ) : (
                            <CloseCircleOutlined style={{ color: '#ef4444', fontSize: '18px' }} />
                          )}
                          <span className="text-sm font-medium text-bolt-elements-textSecondary">{result.score}%</span>
                        </div>
                      </div>

                      <p className="text-bolt-elements-textSecondary mb-4 leading-relaxed">{requirement.description}</p>

                      {/* 检查标准 */}
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-bolt-elements-textPrimary mb-2">检查标准:</h5>
                        <ul className="text-sm text-bolt-elements-textSecondary ml-4 space-y-1">
                          {requirement.checkCriteria.map((criteria: string, index: number) => (
                            <li key={index}>• {criteria}</li>
                          ))}
                        </ul>
                      </div>

                      {/* 当前状态 */}
                      {result.evidence.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-green-400 mb-2">✓ 符合项:</h5>
                          <ul className="text-sm text-green-400 ml-4 space-y-1">
                            {result.evidence.map((evidence: string, index: number) => (
                              <li key={index}>• {evidence}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.gaps.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-red-400 mb-2">✗ 不符合项:</h5>
                          <ul className="text-sm text-red-400 ml-4 space-y-1">
                            {result.gaps.map((gap: string, index: number) => (
                              <li key={index}>• {gap}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.recommendations.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-blue-400 mb-2">💡 改进建议:</h5>
                          <ul className="text-sm text-blue-400 ml-4 space-y-1">
                            {result.recommendations.map((rec: string, index: number) => (
                              <li key={index}>• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export const CompliancePanel: React.FC<CompliancePanelProps> = ({ className = '', sceneInfo, nodes }) => {
  const [modalVisible, setModalVisible] = useState(false);

  // 获取当前审核标准
  const currentStandard = useMemo(() => {
    const standard = sceneInfo?.standard;

    if (!standard || !STANDARD_NAME_MAP[standard]) {
      return null;
    }

    const mappedStandard = STANDARD_NAME_MAP[standard];

    return mappedStandard;
  }, [sceneInfo?.standard]);

  // 获取合规评估结果
  const complianceResult = useMemo(() => {
    if (!currentStandard) {
      return null;
    }

    const requirements = getStandardRequirements(currentStandard.standard);
    if (requirements.length === 0) {
      return null;
    }

    return assessCompliance(requirements, nodes);
  }, [currentStandard, nodes]);

  // 按类别分组要求
  const groupedRequirements = useMemo(() => {
    if (!currentStandard || !complianceResult) {
      return {};
    }

    const requirements = getStandardRequirements(currentStandard.standard);
    const groups: Record<string, Array<{ requirement: ComplianceRequirement; result: any }>> = {};

    requirements.forEach((req, index) => {
      const category = req.category;

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push({
        requirement: req,
        result: complianceResult.requirementResults[index],
      });
    });

    return groups;
  }, [currentStandard, complianceResult]);

  if (!currentStandard) {
    return (
      <div
        className={`h-full bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor ${className}`}
      >
        <div className="p-4 border-b border-bolt-elements-borderColor">
          <h3 className="text-bolt-elements-textPrimary font-medium">法律合规面板</h3>
        </div>
        <div className="p-6 flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-bolt-elements-textSecondary mb-2">📋</div>
            <p className="text-bolt-elements-textSecondary">请在场景设置中选择审核标准</p>
          </div>
        </div>
      </div>
    );
  }

  if (!complianceResult) {
    return (
      <div
        className={`h-full bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor ${className}`}
      >
        <div className="p-4 border-b border-bolt-elements-borderColor">
          <h3 className="text-bolt-elements-textPrimary font-medium">法律合规面板</h3>
        </div>
        <div className="p-6 flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-bolt-elements-textSecondary mb-2">⚠️</div>
            <p className="text-bolt-elements-textSecondary">无法加载合规要求</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`h-full bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor cursor-pointer hover:border-blue-400 transition-colors ${className}`}
        onClick={() => setModalVisible(true)}
      >
        {/* 标题栏 */}
        <div className="p-4 border-b border-bolt-elements-borderColor">
          <div className="flex items-center justify-between">
            <h3 className="text-bolt-elements-textPrimary font-medium">法律合规面板</h3>
            <ExpandOutlined className="text-bolt-elements-textSecondary hover:text-blue-400" />
          </div>
        </div>

        {/* 内容区域 */}
        <div className="h-full flex flex-col p-4 overflow-hidden">
          {/* 标准信息 */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOutlined style={{ color: '#3b82f6' }} />
              <span className="text-bolt-elements-textPrimary font-medium text-sm">{currentStandard.name}</span>
            </div>

            {/* 总体评分 */}
            <div className="bg-bolt-elements-background-depth-3 p-3 rounded-lg border border-bolt-elements-borderColor">
              <div className="flex items-center justify-between mb-2">
                <span className="text-bolt-elements-textPrimary font-medium text-sm">总体合规评分</span>
                <span
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: COMPLIANCE_LEVEL_COLORS[complianceResult.level] + '20',
                    color: COMPLIANCE_LEVEL_COLORS[complianceResult.level],
                    border: `1px solid ${COMPLIANCE_LEVEL_COLORS[complianceResult.level]}40`,
                  }}
                >
                  {COMPLIANCE_LEVEL_NAMES[complianceResult.level]}
                </span>
              </div>
              <div className="w-full bg-bolt-elements-background-depth-1 rounded-full h-2 mb-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, complianceResult.overallScore))}%`,
                    backgroundColor: COMPLIANCE_LEVEL_COLORS[complianceResult.level],
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-bolt-elements-textSecondary">
                <span>
                  已达标: {complianceResult.summary.compliantRequirements}/{complianceResult.summary.totalRequirements}
                </span>
                <span>关键问题: {complianceResult.summary.criticalIssues}</span>
              </div>
            </div>
          </div>

          {/* 提示点击查看详情 */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-bolt-elements-textSecondary">
              <ExpandOutlined className="text-2xl mb-2" />
              <p className="text-sm">点击查看完整合规评估</p>
            </div>
          </div>
        </div>
      </div>

      {/* 完整合规面板模态框 */}
      {modalVisible && currentStandard && complianceResult && (
        <FullComplianceModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          currentStandard={currentStandard}
          complianceResult={complianceResult}
          groupedRequirements={groupedRequirements}
        />
      )}
    </>
  );
};

export default CompliancePanel; 