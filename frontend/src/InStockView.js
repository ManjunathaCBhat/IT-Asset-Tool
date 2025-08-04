import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Table, Tag, Typography, Modal, Button, Space, Form,
  Input, message, Dropdown, Popconfirm, Menu, Row, Col, DatePicker, Select
} from 'antd';
import {
  SearchOutlined, EyeOutlined, MoreOutlined, InfoCircleOutlined, UserAddOutlined,
  WarningOutlined as DamagedIcon, DeleteOutlined as EWasteIcon, EditOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;

// Auth header helper
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'x-auth-token': token } : {};
};

// Warranty tag logic
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

// Status color helper
const getStatusColor = (status) => ({
  'In Use': '#7ED321',
  'In Stock': '#FA8C16',
  Damaged: '#D0021B',
  'E-Waste': '#8B572A',
  Removed: '#555555'
}[status] || 'default');

// Group assets by model
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

const InStockView = () => {
  // Data and state
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals and form states
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
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

  // Fetch all In Stock assets
  const fetchAssets = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/equipment', { headers: getAuthHeader() });
      const list = response.data.filter(a => a.status === 'In Stock');
      setData(list);
      setFilteredData(list);
    } catch (err) {
      message.error('Failed to fetch In Stock assets.');
    }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  useEffect(() => {
    setIsAnyModalOpen(isAssignModalVisible || modalAssetsVisible || isInfoModalVisible || isEditModalVisible);
  }, [isAssignModalVisible, modalAssetsVisible, isInfoModalVisible, isEditModalVisible]);

  // Filtering logic
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
  };

  const groupedList = groupAssetsByModel(filteredData);

  // Assign modal open/submit
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
      setIsAssignModalVisible(false);
      setAssetToAssign(null);
      message.success('Asset assigned.');
      setTimeout(fetchAssets, 250); // Wait for DB
    } catch {
      message.error('Failed to assign.');
    }
  };

  // Edit modal open/save (2 columns)
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
      setIsEditModalVisible(false);
      setAssetToEdit(null);
      message.success('Asset updated.');
      setTimeout(fetchAssets, 200);
    } catch {
      message.error('Update failed!');
    }
  };

  // Actions: Move asset to status
  const handleMoveStatus = async (asset, newStatus) => {
    try {
      await axios.put(
        `http://localhost:5000/api/equipment/${asset._id}`,
        { status: newStatus },
        { headers: getAuthHeader() }
      );
      setIsAssignModalVisible(false);
      setIsEditModalVisible(false);
      setIsInfoModalVisible(false);
      setModalAssetsVisible(false);
      message.success(`Moved to ${newStatus}`);
      setTimeout(fetchAssets, 250);
    } catch {
      message.error('Status update failed.');
    }
  };

  // Info view WITHOUT assignee details per your request
  const handleInfo = (asset) => {
    setAssetForInfo(asset);
    setIsInfoModalVisible(true);
  };

  // Actions for asset in nested modal
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

  // Main grouped table columns
  const columns = [
    { title: 'Sl No', key: 'slno', render: (_, __, i) => i + 1, width: 70 },
    { title: 'Model', dataIndex: 'model', key: 'model' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
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
          title='View Assets'
        />
      ),
    }
  ];

  // Nested individual asset columns WITHOUT purchase date column
  const modelAssetColumns = [
    {
      title: 'Sl No',
      key: 'assetNo',
      render: (_, __, i) => i + 1,
      width: 60,
    },
    { title: 'Serial #', dataIndex: 'serialNumber', key: 'serialNumber' },
    { title: 'Warranty', dataIndex: 'warrantyInfo', key: 'warrantyInfo', render: renderWarrantyTag },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    {
      title: 'Actions',
      key: 'assetActions',
      render: (_, a) => renderAssetActions(a),
      align: 'center'
    }
  ];

  // Asset info table WITHOUT assignee details
  const assetToRows = asset => [
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
      style={{ margin: 0 }}
      bordered
      dataSource={assetToRows(asset).map(([label, value], idx) => ({ key: idx, label, value }))}
      pagination={false}
      showHeader={false}
      columns={[
        { dataIndex: 'label', key: 'label', width: 200, render: text => <strong>{text}</strong> },
        { dataIndex: 'value', key: 'value' },
      ]}
      size="middle"
    />
  );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
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

      <div className={isAnyModalOpen ? "instock-blur" : ""}>
        <Table
          columns={columns}
          dataSource={groupedList}
          rowKey={(rec) => rec.model}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </div>

      {/* Modal: Assets under this Model */}
      <Modal
        title={`Assets under Model: ${selectedModelAssets?.model || ''}`}
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

      {/* Assign Modal with Select dropdowns */}
      <Modal
        title={`Assign: ${assetToAssign?.model || ''}`}
        open={isAssignModalVisible}
        onCancel={() => { setIsAssignModalVisible(false); assignForm.resetFields(); setAssetToAssign(null); }}
        width={450}
        centered
        destroyOnClose
        onOk={handleAssignSubmit}
        okText="Assign"
        footer={[
          <Button key="close" onClick={() => { setIsAssignModalVisible(false); assignForm.resetFields(); setAssetToAssign(null); }}>Cancel</Button>,
          <Button key="assign" type="primary" onClick={handleAssignSubmit}>Assign</Button>
        ]}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item name="assigneeName" label="Assignee Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="position" label="Position" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {/* Removed email validation */}
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

      {/* Asset Edit Modal with 2 Columns and Select dropdowns */}
      <Modal
        title={`Edit: ${assetToEdit?.model || ''}`}
        open={isEditModalVisible}
        onCancel={() => { setIsEditModalVisible(false); setAssetToEdit(null); }}
        width={800}
        centered
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => { setIsEditModalVisible(false); setAssetToEdit(null); }}>Cancel</Button>,
          <Button key="save" type="primary" onClick={handleEditSubmit}>Save</Button>
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

      {/* Full Info Modal */}
      <Modal
        title={`Full Asset Details (${assetForInfo?.model || ''})`}
        open={isInfoModalVisible}
        onCancel={() => { setIsInfoModalVisible(false); setAssetForInfo(null); }}
        width={700}
        centered
        destroyOnClose
        footer={[
          <Button key="close" onClick={() => { setIsInfoModalVisible(false); setAssetForInfo(null); }}>Close</Button>
        ]}
      >
        {assetForInfo && <InfoTable asset={assetForInfo} />}
      </Modal>
    </>
  );
};

export default InStockView;
