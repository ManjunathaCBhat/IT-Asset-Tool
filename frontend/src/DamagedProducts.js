import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Table, Typography, Modal, Button, Space, Popconfirm, Input, message
} from 'antd';
import {
  SearchOutlined, EyeOutlined, InfoCircleOutlined, RollbackOutlined, DeleteOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title } = Typography;

// Blur effect for modal open
const inlineStyles = (
  <style>
    {`
    .instock-blur {
      filter: blur(3px);
      pointer-events: none;
      user-select: none;
      transition: filter 0.15s;
    }
    `}
  </style>
);

// Info modal asset table
const InfoTable = ({ asset }) => (
  <Table
    style={{ margin: 0, marginBottom: 20 }}
    bordered
    dataSource={[
      ['Asset ID', asset.assetId || 'N/A'],
      ['Category', asset.category || 'N/A'],
      ['Model', asset.model || 'N/A'],
      ['Serial Number', asset.serialNumber || 'N/A'],
      ['Location', asset.location || 'N/A'],
      ['Purchase Price', asset.purchasePrice || 'N/A'],
      ['Comment', asset.comment || 'N/A'],
      ['Damage Description', asset.damageDescription || 'N/A'],
      ['Created At', asset.createdAt ? moment(asset.createdAt).format('DD MMM YYYY HH:mm') : 'N/A'],
      ['Updated At', asset.updatedAt ? moment(asset.updatedAt).format('DD MMM YYYY HH:mm') : 'N/A'],
    ].map(([label, value], idx) => ({ key: idx, label, value }))}
    pagination={false}
    showHeader={false}
    columns={[
      { dataIndex: 'label', key: 'label', width: 180, render: text => <strong>{text}</strong> },
      { dataIndex: 'value', key: 'value' },
    ]}
    size="middle"
  />
);

const groupAssetsByModel = (assets) => {
  const grouped = assets.reduce((acc, asset) => {
    const key = asset.model || 'Unknown Model';
    if (!acc[key]) {
      acc[key] = {
        model: key,
        category: asset.category || '',
        assets: [],
      };
    }
    acc[key].assets.push(asset);
    return acc;
  }, {});
  return Object.values(grouped);
};

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'x-auth-token': token } : {};
};

const DamagedProducts = ({ user }) => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalAssetsVisible, setModalAssetsVisible] = useState(false);
  const [selectedModelAssets, setSelectedModelAssets] = useState(null);

  const [assetForInfo, setAssetForInfo] = useState(null);

  // For custom repaired confirmation modal:
  const [assetToRepair, setAssetToRepair] = useState(null);
  const [repairConfirmVisible, setRepairConfirmVisible] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    pageSizeOptions: ['10', '20', '50'],
    showSizeChanger: true,
  });

  // Fetch assets with status Damaged
  const fetchAssets = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/equipment', { headers: getAuthHeader() });
      const list = response.data.filter(a => a.status === 'Damaged');
      setData(list);
      setFilteredData(list);
    } catch (err) {
      message.error('Failed to fetch Damaged assets.');
    }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleSearch = (e) => {
    const { value } = e.target;
    setSearchTerm(value);
    const lower = value.trim().toLowerCase();
    if (!lower) {
      setFilteredData(data);
      return;
    }
    setFilteredData(data.filter(item =>
      Object.values(item).some(field =>
        String(field || '').toLowerCase().includes(lower)
      )
    ));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const groupedList = groupAssetsByModel(filteredData);

  // Table Pagination Change Handler
  const handleTableChange = (pag) => {
    setPagination(prev => ({
      ...prev,
      current: pag.current,
      pageSize: pag.pageSize,
    }));
  };

  // Repairs (to 'In Stock')
  const handleStartRepair = (asset) => {
    setAssetToRepair(asset);
    setRepairConfirmVisible(true);
  };
  // On confirm, HARD reload
  const handleRepairConfirm = async () => {
    if (!assetToRepair) return;
    try {
      await axios.put(
        `http://localhost:5000/api/equipment/${assetToRepair._id}`,
        { status: 'In Stock' },
        { headers: getAuthHeader() }
      );
      message.success('Asset marked as repaired.');
      setRepairConfirmVisible(false);
      setAssetToRepair(null);
      window.location.reload(); // HARD reload
    } catch {
      message.error('Failed to mark as repaired.');
    }
  };
  const handleRepairCancel = () => {
    setAssetToRepair(null);
    setRepairConfirmVisible(false);
  };

  // Delete (to 'Removed'), HARD reload
  const handleDelete = async (asset) => {
    try {
      await axios.put(
        `http://localhost:5000/api/equipment/${asset._id}`,
        { status: 'Removed' },
        { headers: getAuthHeader() }
      );
      message.success('Asset moved to Removed.');
      window.location.reload(); // HARD reload
    } catch {
      message.error('Failed to move to Removed.');
    }
  };

  // Serial number by pagination
  const getSerialNumber = (i) => {
    return (pagination.current - 1) * pagination.pageSize + i + 1;
  };

  // Parent table (by model)
  const columns = [
    {
      title: 'Sl No',
      key: 'slno',
      render: (_, __, i) => getSerialNumber(i),
      width: 70,
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: 'Asset Count',
      key: 'assetCount',
      render: (_, record) => record.assets.length,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, rec) => (
        <Button
          type="link"
          icon={<EyeOutlined style={{ color: 'blue', fontSize: '18px' }} />}
          onClick={() => { setSelectedModelAssets(rec); setModalAssetsVisible(true); }}
          title='View Damaged Assets'
        />
      ),
    }
  ];

  // Sub-table for all assets of a model
  const modelAssetColumns = [
    {
      title: 'Sl No',
      key: 'assetNo',
      render: (_, __, i) => i + 1,
      width: 60,
    },
    { title: 'Serial Number', dataIndex: 'serialNumber', key: 'serialNumber' },
    {
      title: 'Damage Date',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: d => (d ? moment(d).format('DD MMM YYYY') : 'N/A'),
      width: 120,
    },
    { title: 'Comment', dataIndex: 'comment', key: 'comment' },
    {
      title: 'Actions',
      key: 'assetActions',
      render: (_, asset) => (
        <Space>
          <Button
            icon={<InfoCircleOutlined style={{ color: '#1890ff' }} />}
            onClick={() => setAssetForInfo(asset)}
            title="Full Details"
          />
          <Button
            icon={<RollbackOutlined />}
            type="primary"
            onClick={() => handleStartRepair(asset)}
            title="Repaired & Return to In Stock"
            disabled={user?.role === "Viewer"}
          >
            Repaired
          </Button>
          <Popconfirm
            title="Really remove this asset from Damaged?"
            onConfirm={() => handleDelete(asset)}
            okText="Delete"
            cancelText="Cancel"
            disabled={user?.role === "Viewer"}
          >
            <Button
              icon={<DeleteOutlined />}
              danger
              title="Remove from Damaged"
              disabled={user?.role === "Viewer"}
            />
          </Popconfirm>
        </Space>
      ),
      align: 'center'
    }
  ];

  return (
    <>
      {inlineStyles}
      <div className={modalAssetsVisible ? "instock-blur" : ""}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>Damaged Products</Title>
          <Input
            placeholder="Search all fields..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={handleSearch}
            style={{ width: 250 }}
            allowClear
          />
        </div>
        <Table
          columns={columns}
          dataSource={groupedList}
          rowKey={(rec) => rec.model}
          pagination={{
            ...pagination,
            total: groupedList.length,
            showTotal: total => `Total ${total} items`,
            showSizeChanger: true,
          }}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
        />
      </div>

      <Modal
        title={`Damaged Assets: ${selectedModelAssets?.model || ''}`}
        open={modalAssetsVisible}
        onCancel={() => { setModalAssetsVisible(false); setSelectedModelAssets(null); }}
        width={950}
        centered
        destroyOnClose
        footer={[
          <Button key="close" onClick={() => { setModalAssetsVisible(false); setSelectedModelAssets(null); }}>Close</Button>
        ]}
      >
        {selectedModelAssets && (
          <Table
            dataSource={selectedModelAssets.assets}
            rowKey="_id"
            pagination={false}
            columns={modelAssetColumns}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        )}
      </Modal>

      {/* Info Modal for asset details */}
      <Modal
        open={!!assetForInfo}
        title={`Asset Details (${assetForInfo?.model || ''})`}
        onCancel={() => setAssetForInfo(null)}
        width={540}
        footer={[<Button key="close" onClick={() => setAssetForInfo(null)}>Close</Button>]}
        centered
        destroyOnClose
      >
        {assetForInfo && (
          <div className="asset-info-table">
            <InfoTable asset={assetForInfo} />
          </div>
        )}
      </Modal>

      {/* Repaired confirmation modal with a table layout */}
      <Modal
        open={repairConfirmVisible}
        title="Confirm Asset Repair"
        onCancel={handleRepairCancel}
        width={400}
        footer={[
          <Button key="cancel" onClick={handleRepairCancel}>Cancel</Button>,
          <Button key="confirm" type="primary" onClick={handleRepairConfirm}>Confirm</Button>,
        ]}
        centered
        destroyOnClose
      >
        {assetToRepair && (
          <Table
            dataSource={[
              { label: 'Category', value: assetToRepair.category || 'N/A' },
              { label: 'Model', value: assetToRepair.model || 'N/A' },
              { label: 'Serial Number', value: assetToRepair.serialNumber || 'N/A' },
            ]}
            columns={[
              { title: '', dataIndex: 'label', key: 'label', width: 110, render: text => <strong>{text}</strong> },
              { title: '', dataIndex: 'value', key: 'value' },
            ]}
            pagination={false}
            showHeader={false}
            bordered
            size="small"
            style={{ marginBottom: 16 }}
          />
        )}
        <div style={{ marginTop: 10 }}>
          Are you sure you want to mark this asset as repaired and move to In Stock?
        </div>
      </Modal>
    </>
  );
};

export default DamagedProducts;
