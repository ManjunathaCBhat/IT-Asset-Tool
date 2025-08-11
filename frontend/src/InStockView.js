import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Table, Tag, Typography, Modal, Button, Space, Form,
  Input, message, Dropdown, Popconfirm, Menu, Row, Col,
  DatePicker, Select
} from 'antd';
import {
  SearchOutlined, EyeOutlined, MoreOutlined, InfoCircleOutlined, UserAddOutlined,
  WarningOutlined as DamagedIcon, DeleteOutlined as EWasteIcon, EditOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;

/* ──────────────────────────  inline styles  ────────────────────────── */
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

const infoTableCompactStyles = (
  <style>
    {`
      .asset-info-table .ant-table-cell,
      .asset-info-table .ant-table-thead > tr > th,
      .asset-info-table .ant-table-tbody > tr > td {
        font-size: 15px !important;
        padding: 6px 12px !important;
        line-height: 1.4 !important;
      }
    `}
  </style>
);

/* ───────────────────────────  helpers  ─────────────────────────── */
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'x-auth-token': token } : {};
};

const renderWarrantyTag = (date) => {
  if (!date) return 'N/A';
  const warrantyDate = moment(date);
  if (!warrantyDate.isValid()) return 'Invalid Date';
  const today = moment();
  const thirty = moment().add(30, 'days');
  if (warrantyDate.isBefore(today, 'day')) {
    return <Tag color="error">Expired: {warrantyDate.format('DD MMM YYYY')}</Tag>;
  }
  if (warrantyDate.isBefore(thirty, 'day')) {
    return <Tag color="warning">Soon: {warrantyDate.format('DD MMM YYYY')}</Tag>;
  }
  return warrantyDate.format('DD MMM YYYY');
};

const getStatusColor = (status) => ({
  'In Use': '#7ED321',
  'In Stock': '#FA8C16',
  Damaged: '#D0021B',
  'E-Waste': '#8B572A',
  Removed: '#555555',
}[status] || 'default');

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

const assetToRows = (asset) => [
  ['Asset ID', asset.assetId || 'N/A'],
  ['Category', asset.category || 'N/A'],
  ['Model', asset.model || 'N/A'],
  ['Serial Number', asset.serialNumber || 'N/A'],
  ['Location', asset.location || 'N/A'],
  ['Status', asset.status || 'N/A'],
  ['Purchase Price', asset.purchasePrice || 'N/A'],
  ['Warranty Expiry', asset.warrantyInfo ? moment(asset.warrantyInfo).format('DD MMM YYYY') : 'N/A'],
  ['Comment', asset.comment || 'N/A'],
  ['Damage Description', asset.damageDescription || 'N/A'],
  ['Created At', asset.createdAt ? moment(asset.createdAt).format('DD MMM YYYY HH:mm') : 'N/A'],
  ['Updated At', asset.updatedAt ? moment(asset.updatedAt).format('DD MMM YYYY HH:mm') : 'N/A'],
];

const InfoTable = ({ asset }) => (
  <Table
    style={{ margin: 0, marginBottom: 20 }}
    bordered
    dataSource={assetToRows(asset).map(([label, value], idx) => ({ key: idx, label, value }))}
    pagination={false}
    showHeader={false}
    columns={[
      { dataIndex: 'label', key: 'label', width: 200, render: (text) => <strong>{text}</strong> },
      { dataIndex: 'value', key: 'value' },
    ]}
    size="middle"
  />
);

/* ───────────────────────────  main view  ─────────────────────────── */
const InStockView = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [modalAssetsVisible, setModalAssetsVisible] = useState(false);
  const [selectedModelAssets, setSelectedModelAssets] = useState(null);

  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [assetToAssign, setAssetToAssign] = useState(null);
  const [assignForm] = Form.useForm();

  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
  const [assetForInfo, setAssetForInfo] = useState(null);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState(null);
  const [editForm] = Form.useForm();

  /* pagination */
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    pageSizeOptions: ['10', '20', '50'],
    showSizeChanger: true,
  });

  /* ───── fetch data ───── */
  const fetchAssets = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/equipment', { headers: getAuthHeader() });
      const list = res.data.filter((a) => a.status === 'In Stock');
      setData(list);
      setFilteredData(list);
    } catch {
      message.error('Failed to fetch In Stock assets.');
    }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  /* ───── search ───── */
  const handleSearch = (e) => {
    const { value } = e.target;
    setSearchTerm(value);
    const lower = value.trim().toLowerCase();
    if (!lower) {
      setFilteredData(data);
      return;
    }
    setFilteredData(data.filter((item) =>
      Object.values(item).some((field) =>
        String(field || '').toLowerCase().includes(lower)
      )
    ));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const groupedList = groupAssetsByModel(filteredData);

  const handleTableChange = (pag) => {
    setPagination((prev) => ({
      ...prev,
      current: pag.current,
      pageSize: pag.pageSize,
    }));
  };

  /* ───── assign asset ───── */
  const handleAssign = (asset) => {
    setAssetToAssign(asset);
    assignForm.resetFields();
    setIsAssignModalVisible(true);
  };

  const handleAssignSubmit = async () => {
    try {
      const values = await assignForm.validateFields();
      await axios.put(
        `http://localhost:5000/api/equipment/${assetToAssign._id}`,
        { ...values, status: 'In Use' },
        { headers: getAuthHeader() }
      );
      message.success('Asset assigned.');
      window.location.reload();
    } catch {
      message.error('Failed to assign.');
    }
  };

  /* ───── edit asset ───── */
  const handleEdit = (asset) => {
    setAssetToEdit(asset);
    editForm.setFieldsValue({
      ...asset,
      warrantyInfo: asset.warrantyInfo ? moment(asset.warrantyInfo) : null,
      purchaseDate: asset.purchaseDate ? moment(asset.purchaseDate) : null,
    });
    setIsEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      await axios.put(
        `http://localhost:5000/api/equipment/${assetToEdit._id}`,
        {
          ...values,
          warrantyInfo: values.warrantyInfo && moment(values.warrantyInfo).format('YYYY-MM-DD'),
          purchaseDate: values.purchaseDate && moment(values.purchaseDate).format('YYYY-MM-DD'),
        },
        { headers: getAuthHeader() }
      );
      message.success('Asset updated.');
      window.location.reload();
    } catch {
      message.error('Update failed!');
    }
  };

  /* ───── status change ───── */
  const handleMoveStatus = async (asset, newStatus) => {
    try {
      await axios.put(
        `http://localhost:5000/api/equipment/${asset._id}`,
        { status: newStatus },
        { headers: getAuthHeader() }
      );
      message.success(`Moved to ${newStatus}`);
      fetchAssets();
    } catch {
      message.error('Status update failed.');
    }
  };

  /* ───── info modal ───── */
  const handleInfo = (asset) => {
    setAssetForInfo(asset);
    setIsInfoModalVisible(true);
  };

  /* ───── table helpers ───── */
  const renderAssetActions = (asset) => (
    <Space>
      <Button icon={<UserAddOutlined />} onClick={() => handleAssign(asset)} title="Assign to user" />
      <Button icon={<EditOutlined />} onClick={() => handleEdit(asset)} title="Edit asset" />
      <Button icon={<InfoCircleOutlined style={{ color: '#1890ff' }} />} onClick={() => handleInfo(asset)} title="Full Details" />
      <Dropdown
        overlay={
          <Menu>
            <Menu.Item key="damage">
              <Popconfirm
                title="Move asset to Damaged?"
                onConfirm={() => handleMoveStatus(asset, 'Damaged')}
                okText="Yes"
                cancelText="No"
                placement="top"
              >
                <span style={{ color: 'red' }}>
                  <DamagedIcon /> Move to Damaged
                </span>
              </Popconfirm>
            </Menu.Item>
            <Menu.Item key="ewaste">
              <Popconfirm
                title="Move asset to E-Waste?"
                onConfirm={() => handleMoveStatus(asset, 'E-Waste')}
                okText="Yes"
                cancelText="No"
                placement="top"
              >
                <span style={{ color: '#8B572A' }}>
                  <EWasteIcon /> Move to E-Waste
                </span>
              </Popconfirm>
            </Menu.Item>
          </Menu>
        }
        trigger={['click']}
        placement="bottomRight"
      >
        <Button icon={<MoreOutlined />} />
      </Dropdown>
    </Space>
  );

  const getSerialNumber = (i) =>
    (pagination.current - 1) * pagination.pageSize + i + 1;

  /* ───── columns ───── */
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
      sorter: (a, b) =>
        (a.model || '').toLowerCase() > (b.model || '').toLowerCase() ? 1 :
        (a.model || '').toLowerCase() < (b.model || '').toLowerCase() ? -1 : 0,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      sorter: (a, b) =>
        (a.category || '').toLowerCase() > (b.category || '').toLowerCase() ? 1 :
        (a.category || '').toLowerCase() < (b.category || '').toLowerCase() ? -1 : 0,
    },
    {
      title: 'Asset Count',
      key: 'assetCount',
      render: (_, record) => record.assets.length,
      sorter: (a, b) => a.assets.length - b.assets.length,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, rec) => (
        <Button
          type="link"
          icon={<EyeOutlined style={{ color: 'blue', fontSize: '18px' }} />}
          onClick={() => { setSelectedModelAssets(rec); setModalAssetsVisible(true); }}
          title="View Assets"
        />
      ),
    },
  ];

  const modelAssetColumns = [
    {
      title: 'Sl No',
      key: 'assetNo',
      render: (_, __, i) => i + 1,
      width: 60,
    },
    { title: 'Serial Number', dataIndex: 'serialNumber', key: 'serialNumber' },
    { title: 'Warranty', dataIndex: 'warrantyInfo', key: 'warrantyInfo', render: renderWarrantyTag },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    {
      title: 'Actions',
      key: 'assetActions',
      render: (_, a) => renderAssetActions(a),
      align: 'center',
    },
  ];

  /* ──────────────────────────  render  ────────────────────────── */
  return (
    <>
      {inlineStyles}
      {infoTableCompactStyles}

      {/* list view */}
      <div className={modalAssetsVisible ? 'instock-blur' : ''}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>In Stock Equipment</Title>
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
            showTotal: (total) => `Total ${total} items`,
            showSizeChanger: true,
          }}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
        />
      </div>

      {/* model → assets modal */}
      <Modal
        title={`Assets under Model: ${selectedModelAssets?.model || ''}`}
        open={modalAssetsVisible}
        onCancel={() => { setModalAssetsVisible(false); setSelectedModelAssets(null); }}
        width={950}
        centered
        destroyOnClose
        footer={[
          <Button key="close" onClick={() => { setModalAssetsVisible(false); setSelectedModelAssets(null); }}>Close</Button>,
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

      {/* assign modal */}
      <Modal
        title={`Assign: ${assetToAssign?.model || ''}`}
        open={isAssignModalVisible}
        onCancel={() => { setIsAssignModalVisible(false); assignForm.resetFields(); setAssetToAssign(null); }}
        width={450}
        centered
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => { setIsAssignModalVisible(false); assignForm.resetFields(); setAssetToAssign(null); }}>Cancel</Button>,
          <Button key="assign" type="primary" onClick={handleAssignSubmit}>Assign</Button>,
        ]}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item name="assigneeName" label="Assignee Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="position" label="Position" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="employeeEmail" label="Employee Email" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phoneNumber" label="Phone Number" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="department" label="Department" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* edit modal */}
      <Modal
        title={`Edit: ${assetToEdit?.model || ''}`}
        open={isEditModalVisible}
        onCancel={() => { setIsEditModalVisible(false); setAssetToEdit(null); }}
        width={800}
        centered
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => { setIsEditModalVisible(false); setAssetToEdit(null); }}>Cancel</Button>,
          <Button key="save" type="primary" onClick={handleEditSubmit}>Save</Button>,
        ]}
      >
        {assetToEdit && (
          <Form form={editForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Model" name="model" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Category" name="category" rules={[{ required: true }]}>
                  <Select placeholder="Select Category">
                    <Option value="Laptop">Laptop</Option>
                    <Option value="Headset">Headset</Option>
                    <Option value="Keyboard">Keyboard</Option>
                    <Option value="Mouse">Mouse</Option>
                    <Option value="Monitor">Monitor</Option>
                    <Option value="Other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Serial Number" name="serialNumber" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Location" name="location" rules={[{ required: true }]}>
                  <Select placeholder="Select Location">
                    <Option value="Bangalore">Bangalore</Option>
                    <Option value="Mangalore">Mangalore</Option>
                    <Option value="Hyderabad">Hyderabad</Option>
                    <Option value="USA">USA</Option>
                    <Option value="Canada">Canada</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Purchase Price" name="purchasePrice">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Purchase Date" name="purchaseDate">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Warranty" name="warrantyInfo">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Status" name="status" rules={[{ required: true }]}>
                  <Select placeholder="Select Status">
                    <Option value="In Use">In Use</Option>
                    <Option value="In Stock">In Stock</Option>
                    <Option value="Damaged">Damaged</Option>
                    <Option value="Removed">Removed</Option>
                    <Option value="E-Waste">E-Waste</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="Comment" name="comment">
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Modal>

      {/* info modal */}
      <Modal
        title={`Full Asset Details (${assetForInfo?.model || ''})`}
        open={isInfoModalVisible}
        onCancel={() => { setIsInfoModalVisible(false); setAssetForInfo(null); }}
        width={700}
        centered
        destroyOnClose
        footer={[
          <Button key="close" onClick={() => { setIsInfoModalVisible(false); setAssetForInfo(null); }}>Close</Button>,
        ]}
      >
        {assetForInfo && (
          <div className="asset-info-table">
            <InfoTable asset={assetForInfo} />
          </div>
        )}
      </Modal>
    </>
  );
};

export default InStockView;
