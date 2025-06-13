import React, { useMemo } from 'react';
import { Modal, Button, Card, Row, Col, Table, Typography, Empty, Spin, Divider, Tag, Space, message } from 'antd';
import { UploadOutlined, EyeOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnType, TableProps } from 'antd/es/table';
import type { UploadedFile } from '~/types/files';

// 添加 ParsedEmissionSource 类型定义
interface ParsedEmissionSource {
  key: string;
  index: number;
  lifecycleStage: string;
  name: string;
  category: string;
  activityData: string;
  activityUnit: string;
  dataStatus: string;
  supplementaryInfo: string;
}

interface AIFileParseModalProps {
  visible: boolean;
  onClose: () => void;
  uploadedFiles: UploadedFile[];
  selectedFileForParse: UploadedFile | null;
  onFileSelect: (file: UploadedFile) => void;
  onParseFile: (file: UploadedFile) => void;
  onPreviewFile: (file: UploadedFile) => void;
  onOpenUploadModal: () => void;
  isLoadingFiles: boolean;
  nodes: any[];
  getChineseFileStatusMessage: (status: string) => string;
  selectedParsedSourceKeys: React.Key[];
  onSelectedParsedSourceKeysChange: (keys: React.Key[]) => void;
  onDeleteFile?: (id: string) => void;
}

export const AiFileParseModal: React.FC<AIFileParseModalProps> = ({
  visible,
  onClose,
  uploadedFiles,
  selectedFileForParse,
  onFileSelect,
  onParseFile,
  onPreviewFile,
  onOpenUploadModal,
  isLoadingFiles,
  nodes,
  getChineseFileStatusMessage,
  selectedParsedSourceKeys,
  onSelectedParsedSourceKeysChange,
  onDeleteFile,
}) => {
  // 文件表格列定义
  const fileTableColumns: ColumnType<UploadedFile>[] = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      width: 200,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const statusText = getChineseFileStatusMessage(status);
        let color = 'default';

        if (status === 'completed') {
          color = 'success';
        } else if (status === 'parsing') {
          color = 'processing';
        } else if (status === 'failed') {
          color = 'error';
        } else if (status === 'pending') {
          color = 'warning';
        }

        return <Tag color={color}>{statusText}</Tag>;
      },
    },
    {
      title: '上传时间',
      dataIndex: 'uploadTime',
      key: 'uploadTime',
      width: 120,
      render: (time: string) => {
        try {
          return new Date(time).toLocaleDateString();
        } catch {
          return time;
        }
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record: UploadedFile) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onPreviewFile(record);
            }}
            disabled={!record.url}
            title="预览"
          />
          {onDeleteFile && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFile(record.id);
              }}
              title="删除"
            />
          )}
        </Space>
      ),
    },
  ];

  // 解析结果表格列定义 - 与原始代码保持一致
  const parsedEmissionSourceTableColumns: TableProps<ParsedEmissionSource>['columns'] = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 60,
      render: (text: number) => text,
    },
    {
      title: '生命周期阶段',
      dataIndex: 'lifecycleStage',
      key: 'lifecycleStage',
      width: 150,
    },
    {
      title: '排放源名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '排放源类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: '活动数据数值',
      dataIndex: 'activityData',
      key: 'activityData',
      width: 120,
    },
    {
      title: '活动数据单位',
      dataIndex: 'activityUnit',
      key: 'activityUnit',
      width: 120,
    },
    {
      title: '数据状态',
      dataIndex: 'dataStatus',
      key: 'dataStatus',
      width: 100,
      render: (status: string) => {
        let color = 'default';

        if (status === '已生效') {
          color = 'success';
        } else if (status === '已删除') {
          color = 'error';
        }

        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: '补充信息',
      dataIndex: 'supplementaryInfo',
      key: 'supplementaryInfo',
      ellipsis: true,
    },
  ];

  // 解析结果数据：根据当前选中文件名过滤 nodes
  const parsedNodes = useMemo(() => {
    if (!selectedFileForParse?.name) {
      return [];
    }

    return (nodes || [])
      .filter((node) => node.data?.parse_from_file_name === selectedFileForParse.name)
      .map((node, idx) => ({
        ...node,
        key: node.id || idx,
        index: idx + 1,
        lifecycleStage: node.data.lifecycleStage || '',
        name: node.data.label || '',
        category: node.data.emissionType || '',
        activityData: node.data.quantity || '',
        activityUnit: node.data.activityUnit || '',
        dataStatus: '未生效',
        supplementaryInfo: node.data.supplementaryInfo || '',
      }));
  }, [nodes, selectedFileForParse]);

  const handleClose = () => {
    onSelectedParsedSourceKeysChange([]);
    onClose();
  };

  return (
    <Modal
      title="AI文件解析"
      open={visible}
      onCancel={handleClose}
      width="90%"
      footer={[
        <Button key="close" onClick={handleClose}>
          返回
        </Button>,
      ]}
      destroyOnClose
    >
      <Row gutter={16}>
        <Col span={8}>
          <Card
            title="原始数据文件"
            size="small"
            extra={
              <Space>
                <Button icon={<DownloadOutlined />} onClick={() => message.info('功能待开发')}>
                  下载模板
                </Button>
                <Button icon={<UploadOutlined />} onClick={onOpenUploadModal}>
                  上传
                </Button>
              </Space>
            }
          >
            <div
              className="flex-grow overflow-auto file-upload-table-container"
              style={{ maxHeight: 'calc(80vh - 200px)' }}
            >
              {isLoadingFiles && <Spin tip="加载文件中..." />}
              {!isLoadingFiles && uploadedFiles.length === 0 && <Empty description="暂无文件" />}
              {!isLoadingFiles && uploadedFiles.length > 0 && (
                <Table
                  columns={fileTableColumns}
                  dataSource={[...uploadedFiles].sort(
                    (a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime(),
                  )}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10, size: 'small' }}
                  className="file-upload-table"
                  onRow={(record: UploadedFile) => ({
                    onClick: () => {
                      console.log('Row clicked in AI Parse Modal:', record);
                      onFileSelect(record);
                    },
                  })}
                  rowClassName={(record: UploadedFile) =>
                    record.id === selectedFileForParse?.id ? 'ant-table-row-selected' : ''
                  }
                />
              )}
            </div>
          </Card>
        </Col>

        <Col span={16}>
          {selectedFileForParse ? (
            <div>
              <Typography.Title level={4} style={{ marginBottom: 16 }}>
                {selectedFileForParse.name}
              </Typography.Title>

              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Typography.Text>
                    <strong>上传时间:</strong> {selectedFileForParse.uploadTime}
                  </Typography.Text>
                </Col>
                <Col span={24}>
                  <Typography.Text>
                    <strong>类型:</strong> {selectedFileForParse.type}
                  </Typography.Text>
                </Col>
                <Col span={24}>
                  <Typography.Text>
                    <strong>源文件:</strong>{' '}
                  </Typography.Text>
                  <Button
                    type="link"
                    onClick={() => onPreviewFile(selectedFileForParse)}
                    disabled={!selectedFileForParse.url}
                  >
                    {selectedFileForParse.name} (点击预览)
                  </Button>
                </Col>
              </Row>

              <Typography.Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>
                解析结果
              </Typography.Title>

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Typography.Text>
                    <strong>解析状态:</strong> {getChineseFileStatusMessage(selectedFileForParse.status)}
                  </Typography.Text>
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <Button
                    type="primary"
                    onClick={() => {
                      console.log('[AIFileParseModal] 开始解析按钮被点击', {
                        selectedFile: selectedFileForParse,
                        fileName: selectedFileForParse?.name,
                        fileId: selectedFileForParse?.id,
                        fileStatus: selectedFileForParse?.status,
                        timestamp: new Date().toISOString(),
                      });
                      onParseFile(selectedFileForParse);
                    }}
                    loading={selectedFileForParse?.status === 'parsing'}
                    disabled={selectedFileForParse?.status === 'parsing'}
                  >
                    {selectedFileForParse?.status === 'completed' || selectedFileForParse?.status === 'failed'
                      ? '重新解析'
                      : '开始解析'}
                  </Button>
                </Col>
                <Col span={24}>
                  <Typography.Text>
                    <strong>解析结果概览:</strong>
                  </Typography.Text>
                  <Card
                    size="small"
                    style={{
                      marginTop: 8,
                      backgroundColor: 'var(--bolt-elements-background-depth-1)',
                      borderColor: 'var(--bolt-elements-borderColor)',
                    }}
                  >
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        color: 'var(--bolt-elements-textPrimary)',
                        maxHeight: 100,
                        overflowY: 'auto',
                      }}
                    >
                      {selectedFileForParse?.status === 'parsing'
                        ? '正在解析文件...'
                        : selectedFileForParse?.status === 'pending'
                          ? '等待解析。'
                          : selectedFileForParse?.content || '暂无概览信息。'}
                    </pre>
                  </Card>
                </Col>
              </Row>

              <Divider />

              <Typography.Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>
                解析结果数据
              </Typography.Title>

              {parsedNodes.length > 0 ? (
                <Table
                  rowSelection={{
                    type: 'checkbox',
                    selectedRowKeys: selectedParsedSourceKeys,
                    onChange: onSelectedParsedSourceKeysChange,
                  }}
                  columns={parsedEmissionSourceTableColumns}
                  dataSource={parsedNodes as ParsedEmissionSource[]}
                  rowKey="key"
                  size="small"
                  pagination={{ pageSize: 5, size: 'small' }}
                  scroll={{ y: 200 }}
                />
              ) : (
                <Empty description="解析完成，但未提取到有效数据点。" />
              )}

              <Divider />
            </div>
          ) : (
            <div
              style={{
                border: '1px dashed var(--bolt-elements-borderColor)',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'calc(80vh - 130px)',
                backgroundColor: 'var(--bolt-elements-background-depth-0)',
              }}
            >
              <Empty description="请从左侧选择一个文件以查看详情和解析结果" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          )}
        </Col>
      </Row>
    </Modal>
  );
};

export default AiFileParseModal;
