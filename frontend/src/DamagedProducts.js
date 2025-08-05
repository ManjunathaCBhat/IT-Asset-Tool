import React, { useState } from 'react';
import { Button, Modal, Form, Input, message, Space, Popconfirm } from 'antd';
import { EditOutlined, InfoCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import moment from 'moment';
import axios from 'axios';
import PageShell from './PageShell';

// Helper: Asset Info Table for Detail Modal
const InfoTable = ({ asset }) => (
  <table style={{ width: '100%' }}>
    <tbody>
      {[
        ['Asset ID', asset.assetId || 'N/A'],
        ['Category', asset.category || 'N/A'],
        ['Model', asset.model || 'N/A'],
        ['Serial Number', asset.serialNumber || 'N/A'],
        ['Damage Date', asset.updatedAt ? moment(asset.updatedAt).format('DD MMM YYYY') : 'N/A'],
        ['Comment', asset.comment || 'N/A'],
        ['Damage Description', asset.damageDescription || 'N/A'],
        ['Created At', asset.createdAt ? moment(asset.createdAt).format('DD MMM YYYY HH:mm') : 'N/A'],
      ].map(([label, value], i) => (
        <tr key={i}><td style={{fontWeight: 600, width: 140}}>{label}:</td><td>{value}</td></tr>
      ))}
    </tbody>
  </table>
);

const DamagedProducts = ({ user }) => {
  // Modal state
  const [infoAsset, setInfoAsset] = useState(null);
  const [editAsset, setEditAsset] = useState(null);
  const [editForm] = Form.useForm();
  const [deletingAsset, setDeletingAsset] = useState(null);

  // Forcing table refresh: increment after operations to refetch data (optional)
  const [refreshKey, setRefreshKey] = useState(0);

  // ---- Table Columns ----
  const damagedProductColumns = [
    { title: 'Category', dataIndex: 'category', key: 'category', width: 150 },
    { title: 'Model', dataIndex: 'model', key: 'model', width: 180 },
    { title: 'Serial Number', dataIndex: 'serialNumber', key: 'serialNumber', width: 150 },
    {
      title: 'Damage Date',
      dataIndex: 'updatedAt',
      key: 'damageDate',
      render: date => date ? moment(date).format('DD MMM YYYY') : 'N/A',
      width: 120,
    },
    { title: 'Comments', dataIndex: 'comment', key: 'comment', ellipsis: true, width: 250 },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: asset => (
        <Space>
          <Button icon={<EditOutlined />} title="Mark repaired / Edit"
            onClick={() => { setEditAsset(asset); editForm.setFieldsValue(asset); }} />
          <Button icon={<InfoCircleOutlined />} title="Full Details"
            onClick={() => setInfoAsset(asset)} />
          <Popconfirm
            title="Are you sure to delete this asset?"
            onConfirm={async () => {
              try {
                await axios.delete(`http://localhost:5000/api/equipment/${asset._id}`,
                  { headers: { 'x-auth-token': localStorage.getItem('token') || undefined } });
                message.success('Asset deleted');
                setRefreshKey(x => x + 1);
              } catch {
                message.error('Delete failed');
              }
            }}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button icon={<DeleteOutlined />} danger title="Delete" />
          </Popconfirm>
        </Space>
      ),
    }
  ];

  // ---- Edit/Repaired Modal ----
  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      await axios.put(`http://localhost:5000/api/equipment/${editAsset._id}`,
        { ...values, status: 'In Stock' },
        { headers: { 'x-auth-token': localStorage.getItem('token') || undefined } }
      );
      message.success('Asset marked as repaired and moved to In Stock.');
      setEditAsset(null);
      setRefreshKey(x => x + 1);
    } catch {
      message.error('Update failed!');
    }
  };

  return (
    <>
      <PageShell
        key={refreshKey}
        pageTitle="Damaged Products"
        apiEndpoint="http://localhost:5000/api/equipment"
        tableColumns={damagedProductColumns}
        user={user}
        initialFilters={{ status: 'Damaged' }}
        hideFilters={['status', 'warrantyInfo']}
      />

      {/* Info Modal */}
      <Modal
        open={!!infoAsset}
        title={`Asset Details (${infoAsset?.model || ''})`}
        onCancel={() => setInfoAsset(null)}
        width={540}
        footer={[<Button key="close" onClick={() => setInfoAsset(null)}>Close</Button>]}
        centered
        destroyOnClose
      >
        {infoAsset && <InfoTable asset={infoAsset} />}
      </Modal>

      {/* Repaired/Edit Modal */}
      <Modal
        open={!!editAsset}
        title={`Mark as Repaired / Edit (${editAsset?.model || ''})`}
        onCancel={() => setEditAsset(null)}
        width={500}
        destroyOnClose
        centered
        footer={[
          <Button key="close" onClick={() => setEditAsset(null)}>Cancel</Button>,
          <Button key="save" type="primary" onClick={handleEditSubmit}>Mark as Repaired</Button>
        ]}
      >
        {editAsset && (
          <Form form={editForm} layout="vertical" initialValues={editAsset}>
            <Form.Item label="Model" name="model" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Category" name="category" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Serial Number" name="serialNumber" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Comments" name="comment">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item label="Damage Description" name="damageDescription">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
};

export default DamagedProducts;
