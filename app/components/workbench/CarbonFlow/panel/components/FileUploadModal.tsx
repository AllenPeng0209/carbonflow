import React, { useRef } from 'react';
import { Modal, Form, Upload, Table, Select, Button, Tooltip } from 'antd';
import { InboxOutlined, DeleteOutlined, ClearOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type { UploadProps } from 'antd/es/upload';
import type { ModalUploadFile } from '~/types/files';

const RawFileTypes = [
  'BOM',
  '能耗数据',
  '运输数据',
  '废弃物',
  '原材料运输',
  '成品运输',
  '产品使用数据',
  '成品废弃数据',
];

interface FileUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onOk: () => Promise<void>;
  modalFileList: ModalUploadFile[];
  onUploadChange: UploadProps['onChange'];
  onRemoveFile: (fileUid: string) => void;
  onClearList: () => void;
  isUploading: boolean;
  formRef?: React.RefObject<FormInstance>;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  visible,
  onClose,
  onOk,
  modalFileList,
  onUploadChange,
  onRemoveFile,
  onClearList,
  isUploading,
  formRef,
}) => {
  const internalFormRef = useRef<FormInstance>(null);
  const uploadModalFormRef = formRef || internalFormRef;

  const fileTableColumns = [
    {
      title: '文件名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: ModalUploadFile) => (
        <Tooltip title="删除">
          <Button danger type="link" icon={<DeleteOutlined />} onClick={() => onRemoveFile(record.uid)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <Modal
      title="上传原始文件"
      open={visible}
      onOk={onOk}
      onCancel={onClose}
      width={600}
      okText="确认"
      cancelText="取消"
      destroyOnClose
      confirmLoading={isUploading}
      className="upload-modal"
    >
      <Form layout="vertical" ref={uploadModalFormRef}>
        <Form.Item label="添加文件:" className="upload-modal-upload-item">
          <Upload.Dragger
            name="files"
            multiple={true}
            onChange={onUploadChange}
            fileList={modalFileList}
            showUploadList={false}
            className="upload-modal-dragger"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">支持单次或批量上传。</p>
          </Upload.Dragger>
        </Form.Item>

        {modalFileList.length > 0 && (
          <Form.Item label="已选文件列表:">
            <Table
              dataSource={modalFileList}
              columns={fileTableColumns}
              rowKey="uid"
              size="small"
              pagination={false}
              scroll={{ y: 200 }}
              className="upload-modal-file-table"
            />
            <div style={{ marginTop: '10px', textAlign: 'right' }}>
              <Button icon={<ClearOutlined />} onClick={onClearList} disabled={modalFileList.length === 0}>
                清空列表
              </Button>
            </div>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default FileUploadModal;
