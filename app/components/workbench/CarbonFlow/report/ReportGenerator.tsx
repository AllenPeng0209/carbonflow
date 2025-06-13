import React, { useState } from 'react';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';
import { Button, Card, Col, Descriptions, Divider, Radio, Row, Space, Table, Typography } from 'antd';
import type { Node } from 'reactflow';
import type {
  NodeData,
  FinalProductNodeData,
  ProductNodeData,
  ManufacturingNodeData,
  DistributionNodeData,
  UsageNodeData,
  DisposalNodeData,
} from '~/types/nodes';

const { Title, Text, Paragraph } = Typography;

const reportContent = {
  en: {
    reportTitle: 'Product Carbon Footprint Report',
    reportSubtitle: 'In accordance with ISO 14067:2018 (Placeholder)',
    printButton: 'Print Report',
    generalInfo: '1. General Information',
    reportTitleLabel: 'Report Title',
    reportTitleValue: 'Product Carbon Footprint of [Product Name]',
    dateOfReportLabel: 'Date of Report',
    reportVersionLabel: 'Report Version',
    reportVersionValue: '1.0 (Draft)',
    commissioningOrgLabel: 'Organization Commissioning Study',
    commissioningOrgValue: '[Your Company Name]',
    practitionerLabel: 'PCF Practitioner / Assessor',
    practitionerValue: '[Name of internal team or external consultant]',
    reportIdLabel: 'Report ID',
    reportIdValue: '[Unique Report Identifier, e.g., PCF-2024-001]',
    productUnderAssessmentLabel: 'Product Under Assessment',
    productNameNotSet: '[Final Product Name Not Set]',
    reportingPeriodLabel: 'Reporting Period',
    reportingPeriodValue: '[e.g., Calendar Year 2023]',
    standardConformityLabel: 'Standard Conformity',
    standardConformityValue: 'ISO 14067:2018 (Intended)',
    goalAndScope: '2. Goal and Scope Definition',
    goalOfStudyTitle: '2.1 Goal of the Study',
    goalOfStudyText:
      'The goal of this study is to quantify the carbon footprint of the product "{productName}" in accordance with ISO 14067:2018. This report is intended for [e.g., internal improvement, external communication, TÜV verification submission].',
    functionalUnitTitle: '2.2 Functional Unit',
    functionalUnitText:
      'The functional unit is defined as: "The production and delivery of 1 kg of \'{productName}\', packaged and ready for shipment to the customer."',
    systemBoundaryTitle: '2.3 System Boundary',
    systemBoundaryText:
      'The system boundary for this study is cradle-to-gate, encompassing the following life cycle stages:',
    rawMaterialAcquisition: 'Raw Material Acquisition',
    manufacturing: 'Manufacturing',
    distributionToGate: 'Distribution (to factory gate)',
    systemBoundaryExcluded:
      'The following stages are excluded: Product Use, End-of-Life. Capital goods (machinery, buildings) and employee commuting are also excluded from the system boundary, which is a common practice.',
    systemBoundaryDiagramTitle: '2.4 System Boundary Diagram',
    systemBoundaryDiagramText:
      '[A flowchart illustrating the included and excluded unit processes should be inserted here. This provides a clear, visual representation of the system boundary.]',
    allocationProceduresTitle: '2.5 Allocation Procedures',
    allocationProceduresText:
      'Where a process or facility provides more than one function (e.g., co-production of products), allocation of inputs and outputs is based on the underlying physical relationships. For this study, [e.g., mass-based allocation was applied for shared utilities. If no allocation is performed, state: "No allocation was necessary for this study as all processes are dedicated to the functional unit."]',
    cutoffCriteriaTitle: '2.6 Cut-off Criteria',
    cutoffCriteriaText:
      'Inputs and outputs are excluded from the assessment if they are estimated to contribute less than 1% of the total mass or energy of the system. The sum of all excluded inputs and outputs shall not exceed 5% of the total carbon footprint. All known flows of hazardous substances or those that could cause a significant environmental impact are included, regardless of the cut-off criteria.',
    lci: '3. Life Cycle Inventory Analysis (LCI)',
    lciText:
      'The following tables detail the data collected for the different life cycle stages of the product. All data refers to the functional unit.',
    nodeId: 'Node Name',
    lifecycleStage: 'Lifecycle Stage',
    carbonFootprint: 'Carbon Footprint (kg CO2e)',
    dataSource: 'Data Source',
    verificationStatus: 'Verification Status',
    emissionFactor: 'Emission Factor',
    emissionFactorSource: 'Factor Source',
    nodeDetails: 'Node Details',
    lciRawMaterialStage: '3.1 Raw Material Acquisition Stage',
    material: 'Material',
    weightPerUnit: 'Weight per Unit',
    quantity: 'Quantity',
    lciManufacturingStage: '3.2 Manufacturing Stage',
    energyConsumptionKwh: 'Energy Consumption (kWh)',
    energyType: 'Energy Type',
    lciDistributionStage: '3.3 Distribution Stage',
    transportationMode: 'Transportation Mode',
    distanceKm: 'Distance (km)',
    lciUsageStage: '3.4 Usage Stage (If Applicable)',
    lifespanYears: 'Lifespan (years)',
    energyConsumptionPerUseKwh: 'Energy Consumption per Use (kWh)',
    lciEolStage: '3.5 End-of-Life Stage (If Applicable)',
    disposalMethod: 'Disposal Method',
    recyclingRate: 'Recycling Rate (%)',
    lcia: '4. Life Cycle Impact Assessment (LCIA) Results',
    lciaResultTitle: '4.1 Carbon Footprint Result',
    lciaResultText: 'The total carbon footprint for the defined functional unit of the product "{productName}" is:',
    lciaResultBasis:
      'This result is based on the GWP100 characterization factors from [e.g., IPCC AR6, or specify other].',
    contributionAnalysisTitle: '4.2 Contribution Analysis',
    contributionAnalysisChartPlaceholder:
      '[A chart, such as a pie chart or bar chart, will be displayed here to show the contribution of each life cycle stage and key processes to the total carbon footprint.]',
    interpretation: '5. Interpretation',
    hotspotsTitle: '5.1 Identification of Significant Issues (Hotspots)',
    hotspotsText:
      '[Based on the contribution analysis, the primary hotspots identified are: 1. The manufacturing stage, specifically the [specific process, e.g., "Drying Process"], which contributes X% of the total emissions. 2. The acquisition of raw material [specific material, e.g., "Material X"], contributing Y%.]',
    dataQualityTitle: '5.2 Data Quality Assessment',
    dataQualityText:
      '[The data quality was assessed based on its time, geographical, and technological representativeness. Primary data collected from the facility for [e.g., energy consumption] is considered of high quality. Secondary data for upstream raw materials was sourced from [e.g., Ecoinvent 3.8] and is considered of medium quality. A more detailed data quality matrix is available in the annex.]',
    sensitivityAnalysisTitle: '5.3 Sensitivity Analysis',
    sensitivityAnalysisText:
      '[A sensitivity analysis was performed on key parameters. For example, a ±10% variation in the electricity grid emission factor results in a ±X% change in the final PCF result, indicating that the result is [moderately/highly/lowly] sensitive to this parameter.]',
    uncertaintyAssessmentTitle: '5.4 Uncertainty Assessment',
    uncertaintyAssessmentText:
      '[An uncertainty analysis has not yet been conducted for this draft report. A quantitative uncertainty analysis (e.g., using Monte Carlo simulation) is recommended for final reports intended for public disclosure to estimate the confidence interval of the final result.]',
    conclusionsTitle: '5.5 Conclusions',
    conclusionsText:
      '[Summarize the main findings, linking back to the goal. E.g., The total carbon footprint for one functional unit is X kg CO₂e. The main contributor is the manufacturing stage. The results provide a baseline for future reduction efforts.]',
    limitationsTitle: '5.6 Limitations',
    limitationsText:
      '[This study has the following limitations: 1. The use of generic, rather than supplier-specific, data for some raw materials. 2. The exclusion of capital goods and employee commuting, as is common practice. These limitations are not expected to significantly affect the final conclusions.]',
    recommendationsTitle: '5.7 Recommendations',
    recommendationsText:
      '[Based on the identified hotspots, the following recommendations are made: 1. Investigate the feasibility of switching to [alternative material] for Material X. 2. Conduct an energy audit on the [specific process] to identify efficiency improvement opportunities.]',
    aiSummaryTitle: '6. AI-Generated Summary & Insights (Informative)',
    aiSummaryNote:
      'Note: This section provides insights generated by an AI assistant based on the available data. It is for informative purposes and should be critically reviewed.',
    annexesTitle: '7. Annexes (Placeholder)',
    annexesA1:
      "A.1 Critical Review Statement (If applicable): This report [has / has not] undergone a critical review by an independent third party in accordance with ISO 14067. [If reviewed, add reviewer's statement here.]",
    annexesA2: 'A.2 Detailed LCI Data Tables (if not fully covered above)',
    annexesA3: 'A.3 References',
  },
  zh: {
    reportTitle: '产品碳足迹报告',
    reportSubtitle: '遵循 ISO 14067:2018 标准（占位符）',
    printButton: '打印报告',
    generalInfo: '1. 一般信息',
    reportTitleLabel: '报告标题',
    reportTitleValue: '[产品名称]的产品碳足迹',
    dateOfReportLabel: '报告日期',
    reportVersionLabel: '报告版本',
    reportVersionValue: '1.0 (草稿)',
    commissioningOrgLabel: '研究委托方',
    commissioningOrgValue: '[贵公司名称]',
    practitionerLabel: 'PCF 核算从业者/评估员',
    practitionerValue: '[内部团队或外部顾问名称]',
    reportIdLabel: '报告ID',
    reportIdValue: '[唯一的报告标识符, 例如, PCF-2024-001]',
    productUnderAssessmentLabel: '评估产品',
    productNameNotSet: '[未设置最终产品名称]',
    reportingPeriodLabel: '报告期',
    reportingPeriodValue: '[例如，2023日历年]',
    standardConformityLabel: '标准符合性',
    standardConformityValue: 'ISO 14067:2018 (预期)',
    goalAndScope: '2. 目标与范围定义',
    goalOfStudyTitle: '2.1 研究目标',
    goalOfStudyText:
      '本研究的目标是根据 ISO 14067:2018 标准量化产品"{productName}"的碳足迹。本报告旨在用于[例如，内部改进、外部沟通、TÜV验证提交]。',
    functionalUnitTitle: '2.2 功能单位',
    functionalUnitText: '功能单位定义为："生产和交付1公斤\'{productName}\'，包装完毕并准备好运送给客户。"',
    systemBoundaryTitle: '2.3 系统边界',
    systemBoundaryText: '本研究的系统边界为"从摇篮到大门"，包括以下生命周期阶段：',
    rawMaterialAcquisition: '原材料获取',
    manufacturing: '生产制造',
    distributionToGate: '分销（到工厂门口）',
    systemBoundaryExcluded:
      '以下阶段被排除在外：产品使用、寿命终止。资本货物（机械、建筑）和员工通勤也排除在系统边界之外，这是常见的做法。',
    systemBoundaryDiagramTitle: '2.4 系统边界图',
    systemBoundaryDiagramText: '[此处应插入一个流程图，说明包含和排除的单元过程。这为系统边界提供了清晰的视觉表示。]',
    allocationProceduresTitle: '2.5 分摊程序',
    allocationProceduresText:
      '当一个过程或设施提供多种功能（例如，产品的联合生产）时，输入和输出的分配基于其潜在的物理关系。在本研究中，[例如，对共享公用设施应用了基于质量的分配。如果未执行分配，请说明："本研究无需分配，因为所有过程都专用于功能单元。" ]',
    cutoffCriteriaTitle: '2.6 截断标准',
    cutoffCriteriaText:
      '如果输入和输出的贡献估计小于系统总质量或能量的1%，则将其排除在评估之外。所有排除的输入和输出的总和不得超过总碳足迹的5%。所有已知的有害物质或可能造成重大环境影响的流，无论截断标准如何，都包括在内。',
    lci: '3. 生命周期清单分析 (LCI)',
    lciText: '下表详细说明了为产品不同生命周期阶段收集的数据。所有数据均指功能单位。',
    nodeId: '节点名称',
    lifecycleStage: '生命周期阶段',
    carbonFootprint: '碳足迹 (kg CO2e)',
    dataSource: '数据来源',
    verificationStatus: '验证状态',
    emissionFactor: '排放因子',
    emissionFactorSource: '因子来源',
    nodeDetails: '节点详情',
    lciRawMaterialStage: '3.1 原材料获取阶段',
    material: '材料',
    weightPerUnit: '单位重量',
    quantity: '数量',
    lciManufacturingStage: '3.2 生产制造阶段',
    energyConsumptionKwh: '能耗 (kWh)',
    energyType: '能源类型',
    lciDistributionStage: '3.3 分销阶段',
    transportationMode: '运输方式',
    distanceKm: '距离 (km)',
    lciUsageStage: '3.4 使用阶段 (如适用)',
    lifespanYears: '使用寿命 (年)',
    energyConsumptionPerUseKwh: '每次使用能耗 (kWh)',
    lciEolStage: '3.5 寿命终止阶段 (如适用)',
    disposalMethod: '处置方法',
    recyclingRate: '回收率 (%)',
    lcia: '4. 生命周期影响评估 (LCIA) 结果',
    lciaResultTitle: '4.1 碳足迹结果',
    lciaResultText: '产品"{productName}"的定义功能单位的总碳足迹为：',
    lciaResultBasis: '该结果基于[例如，IPCC AR6或其他]的GWP100特性化因子。',
    contributionAnalysisTitle: '4.2 贡献分析',
    contributionAnalysisChartPlaceholder:
      '[此处将显示图表（如饼图或柱状图），以展示各生命周期阶段和关键流程对总碳足迹的贡献。]',
    interpretation: '5. 阐述',
    hotspotsTitle: '5.1 重大问题识别 (热点)',
    hotspotsText:
      '[根据贡献度分析，识别出的主要热点是：1. 生产制造阶段，特别是[具体工序，例如"干燥工序"]，占总排放的X%。2. 原材料[具体材料，例如"材料X"]的获取，贡献了Y%。]',
    dataQualityTitle: '5.2 数据质量评估',
    dataQualityText:
      '[数据质量根据其时间、地理和技术代表性进行评估。从工厂收集的[例如，能源消耗]的原始数据被认为是高质量的。用于上游原材料的二手数据来源于[例如，Ecoinvent 3.8]，被认为是中等质量。更详细的数据质量矩阵见附录。]',
    sensitivityAnalysisTitle: '5.3 敏感性分析',
    sensitivityAnalysisText:
      '[对关键参数进行了敏感性分析。例如，电网排放因子±10%的变化导致最终PCF结果±X%的变化，表明结果对该参数的敏感性[中等/高/低]。]',
    uncertaintyAssessmentTitle: '5.4 不确定性评估',
    uncertaintyAssessmentText:
      '[本报告草案尚未进行不确定性分析。对于旨在公开披露的最终报告，建议进行定量不确定性分析（例如，使用蒙特卡洛模拟）以估算最终结果的置信区间。]',
    conclusionsTitle: '5.5 结论',
    conclusionsText:
      '[总结主要发现，并与目标联系起来。例如，一个功能单元的总碳足迹为X kg CO₂e。主要贡献者是生产制造阶段。该结果为未来的减排工作提供了基线。]',
    limitationsTitle: '5.6 局限性',
    limitationsText:
      '[本研究存在以下局限性：1. 对某些原材料使用了通用数据而非供应商特定数据。2. 按照惯例排除了资本货物和员工通勤。这些局限性预计不会显著影响最终结论。]',
    recommendationsTitle: '5.7 建议',
    recommendationsText:
      '[根据已识别的热点，提出以下建议：1. 调查将材料X转换为[替代材料]的可行性。2. 对[具体工序]进行能源审计，以确定提高效率的机会。]',
    aiSummaryTitle: '6. AI生成的摘要与见解 (参考信息)',
    aiSummaryNote: '注意：本部分提供了由AI助手根据可用数据生成的见解。它仅供参考，应进行批判性审查。',
    annexesTitle: '7. 附录 (占位符)',
    annexesA1:
      'A.1 关键性审查声明 (如适用): 本报告[已经/尚未]根据 ISO 14067 由独立的第三方进行关键性审查。[如果已审查，请在此处添加审查员的声明。]',
    annexesA2: 'A.2 详细的LCI数据表 (如上文未完全涵盖)',
    annexesA3: 'A.3 参考文献',
  },
};

const ReportGenerator: React.FC = () => {
  const { nodes, aiSummary } = useCarbonFlowStore();
  const [language, setLanguage] = useState<'en' | 'zh'>('zh');

  const currentContent = reportContent[language];

  const finalProductNode = nodes.find((node) => node.type === 'finalProduct') as Node<FinalProductNodeData> | undefined;
  const productNodes = nodes.filter((node) => node.type === 'product') as Node<ProductNodeData>[];
  const manufacturingNodes = nodes.filter((node) => node.type === 'manufacturing') as Node<ManufacturingNodeData>[];
  const distributionNodes = nodes.filter((node) => node.type === 'distribution') as Node<DistributionNodeData>[];
  const usageNodes = nodes.filter((node) => node.type === 'usage') as Node<UsageNodeData>[];
  const disposalNodes = nodes.filter((node) => node.type === 'disposal') as Node<DisposalNodeData>[];

  const handlePrint = () => {
    window.print();
  };

  const commonNodeColumns = [
    { title: currentContent.nodeId, dataIndex: ['data', 'nodeId'], key: 'nodeId' },
    { title: currentContent.lifecycleStage, dataIndex: ['data', 'lifecycleStage'], key: 'lifecycleStage' },
    { title: currentContent.carbonFootprint, dataIndex: ['data', 'carbonFootprint'], key: 'carbonFootprint' },
    {
      title: currentContent.emissionFactor,
      dataIndex: ['data', 'emissionFactor'],
      key: 'emissionFactor',
      render: (text: any) => text || 'N/A',
    },
    {
      title: currentContent.emissionFactorSource,
      dataIndex: ['data', 'emissionFactorSource'],
      key: 'emissionFactorSource',
      render: (text: any) => text || 'N/A',
    },
    { title: currentContent.dataSource, dataIndex: ['data', 'activitydataSource'], key: 'activitydataSource' },
    { title: currentContent.verificationStatus, dataIndex: ['data', 'verificationStatus'], key: 'verificationStatus' },
  ];

  // Placeholder for more detailed LCI data rendering
  const renderDetailedLciTable = (nodeCollection: Node<NodeData>[], title: string, specificColumns: any[] = []) => {
    if (!nodeCollection || nodeCollection.length === 0) {
      return null;
    }

    return (
      <>
        <Divider orientation="left">
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {title}
          </Title>
        </Divider>
        <Table
          dataSource={nodeCollection}
          columns={[...commonNodeColumns, ...specificColumns]}
          rowKey="id"
          pagination={false}
          bordered
          size="small"
          expandable={{
            expandedRowRender: (record) => (
              <Descriptions title={currentContent.nodeDetails} bordered column={1} size="small">
                {Object.entries(record.data).map(([key, value]) => {
                  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    return (
                      <Descriptions.Item
                        key={key}
                        label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                      >
                        {String(value)}
                      </Descriptions.Item>
                    );
                  }

                  return null;
                })}
              </Descriptions>
            ),
            rowExpandable: (_record) => true,
          }}
        />
      </>
    );
  };

  return (
    <div
      style={{
        padding: '24px',
        background: '#2a2a2a',
        color: '#e0e0e0',
        height: '100%',
        overflowY: 'auto',
      }}
      id="report-content"
    >
      <style>{`
        @page {
          size: A4;
          margin: 1in;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #report-content,
          #report-content * {
            visibility: visible;
          }
          #report-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #fff !important;
            color: #000 !important;
          }
          .no-print {
            display: none !important;
          }
          #report-content .ant-card {
            background: #fff !important;
            color: #000 !important;
            border: 1px solid #f0f0f0 !important;
            page-break-inside: avoid;
          }
          #report-content .ant-table tr {
            page-break-inside: avoid;
          }
          #report-content .ant-descriptions-item-label,
          #report-content .ant-descriptions-item-content,
          #report-content .ant-typography,
          #report-content .ant-table,
          #report-content .ant-table-thead > tr > th,
          #report-content .ant-table-tbody > tr > td,
          #report-content .ant-divider-inner-text {
            color: #000 !important;
          }
          #report-content .ant-table-bordered .ant-table-thead > tr > th,
          #report-content .ant-table-bordered .ant-table-tbody > tr > td {
            border-color: #f0f0f0 !important;
          }
        }
      `}</style>
      <Space direction="vertical" size="large" style={{ width: '100%', paddingBottom: '48px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ color: '#e0e0e0' }}>
              {currentContent.reportTitle}
            </Title>
            <Text type="secondary">{currentContent.reportSubtitle}</Text>
          </Col>
          <Col className="no-print">
            <Space>
              <Radio.Group value={language} onChange={(e) => setLanguage(e.target.value)} buttonStyle="solid">
                <Radio.Button value="en">EN</Radio.Button>
                <Radio.Button value="zh">中</Radio.Button>
              </Radio.Group>
              <Button type="primary" onClick={handlePrint}>
                {currentContent.printButton}
              </Button>
            </Space>
          </Col>
        </Row>

        <Card title={<span style={{ color: '#e0e0e0' }}>{currentContent.generalInfo}</span>}>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label={currentContent.reportTitleLabel}>
              {currentContent.reportTitleValue.replace(
                '[Product Name]',
                finalProductNode?.data.finalProductName || '...',
              )}
            </Descriptions.Item>
            <Descriptions.Item label={currentContent.dateOfReportLabel}>
              {new Date().toLocaleDateString()}
            </Descriptions.Item>
            <Descriptions.Item label={currentContent.reportVersionLabel}>
              {currentContent.reportVersionValue}
            </Descriptions.Item>
            <Descriptions.Item label={currentContent.commissioningOrgLabel}>
              {currentContent.commissioningOrgValue}
            </Descriptions.Item>
            <Descriptions.Item label={currentContent.practitionerLabel}>
              {currentContent.practitionerValue}
            </Descriptions.Item>
            <Descriptions.Item label={currentContent.reportIdLabel}>{currentContent.reportIdValue}</Descriptions.Item>
            <Descriptions.Item label={currentContent.productUnderAssessmentLabel}>
              {finalProductNode?.data.finalProductName || currentContent.productNameNotSet}
            </Descriptions.Item>
            <Descriptions.Item label={currentContent.reportingPeriodLabel}>
              {currentContent.reportingPeriodValue}
            </Descriptions.Item>
            <Descriptions.Item label={currentContent.standardConformityLabel}>
              {currentContent.standardConformityValue}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title={<span style={{ color: '#e0e0e0' }}>{currentContent.goalAndScope}</span>}>
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {currentContent.goalOfStudyTitle}
          </Title>
          <Paragraph>
            {currentContent.goalOfStudyText.replace(
              '{productName}',
              finalProductNode?.data.finalProductName || '[Final Product Name]',
            )}
          </Paragraph>
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {currentContent.functionalUnitTitle}
          </Title>
          <Paragraph>
            {currentContent.functionalUnitText.replace(
              '{productName}',
              finalProductNode?.data.finalProductName || '[Final Product Name]',
            )}
          </Paragraph>
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {currentContent.systemBoundaryTitle}
          </Title>
          <Paragraph>
            {currentContent.systemBoundaryText}
            <ul>
              <li>{currentContent.rawMaterialAcquisition}</li>
              <li>{currentContent.manufacturing}</li>
              <li>{currentContent.distributionToGate}</li>
            </ul>
            {currentContent.systemBoundaryExcluded}
          </Paragraph>
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {currentContent.systemBoundaryDiagramTitle}
          </Title>
          <Paragraph>{currentContent.systemBoundaryDiagramText}</Paragraph>
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {currentContent.allocationProceduresTitle}
          </Title>
          <Paragraph>{currentContent.allocationProceduresText}</Paragraph>
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {currentContent.cutoffCriteriaTitle}
          </Title>
          <Paragraph>{currentContent.cutoffCriteriaText}</Paragraph>
        </Card>

        <Card title={<span style={{ color: '#e0e0e0' }}>{currentContent.lci}</span>}>
          <Paragraph>{currentContent.lciText}</Paragraph>

          {renderDetailedLciTable(productNodes, currentContent.lciRawMaterialStage, [
            { title: currentContent.material, dataIndex: ['data', 'material'], key: 'material' },
            { title: currentContent.weightPerUnit, dataIndex: ['data', 'weight_per_unit'], key: 'weight_per_unit' },
            { title: currentContent.quantity, dataIndex: ['data', 'quantity'], key: 'quantity' },
          ])}

          {renderDetailedLciTable(manufacturingNodes, currentContent.lciManufacturingStage, [
            {
              title: currentContent.energyConsumptionKwh,
              dataIndex: ['data', 'energyConsumption'],
              key: 'energyConsumption',
            },
            { title: currentContent.energyType, dataIndex: ['data', 'energyType'], key: 'energyType' },
          ])}

          {renderDetailedLciTable(distributionNodes, currentContent.lciDistributionStage, [
            {
              title: currentContent.transportationMode,
              dataIndex: ['data', 'transportation_mode'],
              key: 'transportation_mode',
            },
            {
              title: currentContent.distanceKm,
              dataIndex: ['data', 'transportation_distance'],
              key: 'transportation_distance',
            },
          ])}

          {usageNodes.length > 0 &&
            renderDetailedLciTable(usageNodes, currentContent.lciUsageStage, [
              { title: currentContent.lifespanYears, dataIndex: ['data', 'lifespan'], key: 'lifespan' },
              {
                title: currentContent.energyConsumptionPerUseKwh,
                dataIndex: ['data', 'energyConsumptionPerUse'],
                key: 'energyConsumptionPerUse',
              },
            ])}

          {disposalNodes.length > 0 &&
            renderDetailedLciTable(disposalNodes, currentContent.lciEolStage, [
              { title: currentContent.disposalMethod, dataIndex: ['data', 'disposal_method'], key: 'disposal_method' },
              { title: currentContent.recyclingRate, dataIndex: ['data', 'recycling_rate'], key: 'recycling_rate' },
            ])}
        </Card>

        <Card title={<span style={{ color: '#e0e0e0' }}>{currentContent.lcia}</span>}>
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {currentContent.lciaResultTitle}
          </Title>
          <Paragraph>
            {currentContent.lciaResultText.replace(
              '{productName}',
              finalProductNode?.data.finalProductName || '[Final Product Name]',
            )}
            <Text strong> {finalProductNode?.data.totalCarbonFootprint ?? 'N/A'} kg CO2e</Text>.
          </Paragraph>
          <Paragraph>{currentContent.lciaResultBasis}</Paragraph>
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {currentContent.contributionAnalysisTitle}
          </Title>
          <Paragraph>
            <Card style={{ background: '#3a3a3a', border: '1px solid #555', color: '#e0e0e0' }}>
              {currentContent.contributionAnalysisChartPlaceholder}
            </Card>
          </Paragraph>
        </Card>

        <Card title={<span style={{ color: '#e0e0e0' }}>{currentContent.interpretation}</span>}>
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {currentContent.hotspotsTitle}
          </Title>
          <Paragraph>{currentContent.hotspotsText}</Paragraph>
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {currentContent.dataQualityTitle}
          </Title>
          <Paragraph>{currentContent.dataQualityText}</Paragraph>
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {currentContent.sensitivityAnalysisTitle}
          </Title>
          <Paragraph>{currentContent.sensitivityAnalysisText}</Paragraph>
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {currentContent.uncertaintyAssessmentTitle}
          </Title>
          <Paragraph>{currentContent.uncertaintyAssessmentText}</Paragraph>
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {currentContent.conclusionsTitle}
          </Title>
          <Paragraph>{currentContent.conclusionsText}</Paragraph>
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {currentContent.limitationsTitle}
          </Title>
          <Paragraph>{currentContent.limitationsText}</Paragraph>
          <Title level={4} style={{ color: '#e0e0e0' }}>
            {currentContent.recommendationsTitle}
          </Title>
          <Paragraph>{currentContent.recommendationsText}</Paragraph>
        </Card>

        {aiSummary && (
          <Card title={<span style={{ color: '#e0e0e0' }}>{currentContent.aiSummaryTitle}</span>}>
            <Paragraph>
              <Text strong>Note:</Text> {currentContent.aiSummaryNote}
            </Paragraph>
            <Paragraph>
              {typeof aiSummary === 'string' ? aiSummary : <pre>{JSON.stringify(aiSummary, null, 2)}</pre>}
            </Paragraph>
          </Card>
        )}

        <Card title={<span style={{ color: '#e0e0e0' }}>{currentContent.annexesTitle}</span>}>
          <Paragraph>
            {currentContent.annexesA1}
            <br />
            {currentContent.annexesA2}
            <br />
            {currentContent.annexesA3}
          </Paragraph>
        </Card>
      </Space>
    </div>
  );
};
export default ReportGenerator;

