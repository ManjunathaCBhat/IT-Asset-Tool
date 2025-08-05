import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Button,
  Modal,
  Form,
  Input,
  Row,
  Col,
  message,
  Space,
  Dropdown,
  Popconfirm,
  Tag,
  Typography,
  Table,
} from 'antd';
import {
  WarningOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  MoreOutlined,
  InfoCircleOutlined, UserAddOutlined,
} from '@ant-design/icons';
import moment from 'moment';

const { Text } = Typography;

// Helper for auth header
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'x-auth-token': token } : {};
};

// Render warranty tag with color indicators
const renderWarrantyTag = (date) => {
  if (!date) return <Text disabled>N/A</Text>;
  const warrantyDate = moment(date, 'YYYY-MM-DD');
  if (!warrantyDate.isValid()) return <Text disabled>Invalid Date</Text>;
  const today = moment();
  const thirtyDaysFromNow = moment().add(30, 'days');
  if (warrantyDate.isBefore(today)) {
    return <Tag color="error">Expired: {warrantyDate.format('DD MMM YYYY')}</Tag>;
  }
  if (warrantyDate.isBefore(thirtyDaysFromNow)) {
    return <Tag color="warning">Expires: {warrantyDate.format('DD MMM YYYY')}</Tag>;
  }
  return warrantyDate.format('DD MMM YYYY');
};

// Group assets by model
const groupAssetsByModel = (assets) => {
  const grouped = assets.reduce((acc, asset) => {
    const modelKey = asset.model || 'Unknown Model';
    if (!acc[modelKey]) {
      acc[modelKey] = {
        model: modelKey,
        category: asset.category || '',
        assets: [],
      };
    }
    acc[modelKey].assets.push(asset);
    return acc;
  }, {});
  return Object.values(grouped);
};

const InStockView = ({ user }) => {
  // State for asset data and UI
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedList, setGroupedList] = useState([]);
const [assetForInfoDetails, setAssetForInfoDetails] = useState(null);
  // Modal and form states
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [form] = Form.useForm();
   const [infoForm] = Form.useForm();
   const { Title } = Typography;

  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [detailsEquipment, setDetailsEquipment] = useState(null);

  const [isModelAssetsModalVisible, setIsModelAssetsModalVisible] = useState(false);
  const [selectedModelAssets, setSelectedModelAssets] = useState(null);

  // State controlling external Popconfirm for status changes
  const [confirmationConfig, setConfirmationConfig] = useState(null);

  // Fetch in-stock assets from API
  const fetchInStockAssets = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/equipment', {
        headers: getAuthHeader(),
      });
      const inStockAssets = response.data.filter((item) => item.status === 'In Stock');
      setData(inStockAssets);
      setFilteredData(inStockAssets);
    } catch (error) {
      message.error('Failed to fetch In Stock assets.');
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchInStockAssets();
  }, [fetchInStockAssets]);

  // Filter assets based on search input
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    const filtered = data.filter((asset) =>
      Object.values(asset).some((val) =>
        val ? String(val).toLowerCase().includes(value.toLowerCase()) : false
      )
    );
    setFilteredData(filtered);
  };

  // Update grouped list whenever filteredData changes
  useEffect(() => {
    setGroupedList(groupAssetsByModel(filteredData));
  }, [filteredData]);

  // When clicking on a grouped row 'View' icon, open modal showing nested assets
  const handleViewModelAssets = (record) => {
    setSelectedModelAssets(record);
    setIsModelAssetsModalVisible(true);
  };

  // Handle assign modal open
  const handleAssignClick = (record) => {
    setSelectedEquipment(record);
    form.resetFields();
    setIsAssignModalVisible(true);
    setConfirmationConfig(null);
  };

  // Submit assignment form
  const handleAssignSubmit = async () => {
    try {
      const values = await form.validateFields();
      const updatedData = { ...values, status: 'In Use' };
      await axios.put(
        `http://localhost:5000/api/equipment/${selectedEquipment._id}`,
        updatedData,
        { headers: getAuthHeader() }
      );
      message.success('Asset assigned successfully!');
      setIsAssignModalVisible(false);
      fetchInStockAssets();
    } catch (error) {
      message.error('Assignment failed. Please check the details.');
      console.error(error);
    }
  };

  // Show details modal
  const handleViewDetails = (record) => {
    setAssetForInfoDetails(record);
    setDetailsEquipment(record);
    setIsDetailsModalVisible(true);
  };

  // Show confirmation popup for status changes
  const confirmStatusChange = (record, newStatus, fetchDataCallback) => {
    setConfirmationConfig({
      visible: true,
      title: `Move asset "${record.model} (${record.serialNumber})" to ${newStatus}?`,
      onConfirm: async () => {
        try {
          await axios.put(
            `http://localhost:5000/api/equipment/${record._id}`,
            { status: newStatus },
            { headers: getAuthHeader() }
          );
          message.success(`Moved to ${newStatus}`);
          setConfirmationConfig(null);
          if (fetchDataCallback) fetchDataCallback();
        } catch (err) {
          message.error(`Failed to update status to ${newStatus}`);
          setConfirmationConfig(null);
          console.error(err);
        }
      },
      onCancel: () => setConfirmationConfig(null),
    });
  };

  // Render actions for individual assets in nested modal
  const renderInStockActions = (record) => {
    const handleMoveStatus = async (record, newStatus) => {
      try {
        await axios.put(
          `http://localhost:5000/api/equipment/${record._id}`,
          { status: newStatus },
          { headers: getAuthHeader() }
        );
        message.success(`Moved to ${newStatus}`);
        fetchInStockAssets();
      } catch (error) {
        message.error(`Failed to update status to ${newStatus}`);
        console.error(error);
      }
    };

    const menuItems = [
      {
        key: 'damage',
        label: (
          <Popconfirm
            title={`Move asset "${record.model} (${record.serialNumber})" to Damaged?`}
            onConfirm={() => handleMoveStatus(record, 'Damaged')}
            okText="Yes"
            cancelText="No"
            placement="top"
            popupAlign={{ offset: [10, -40] }}
          >
            <span style={{ color: 'red' }}>
              <WarningOutlined /> Move to Damaged
            </span>
          </Popconfirm>
        ),
      },
      {
        key: 'ewaste',
        label: (
          <Popconfirm
            title={`Move asset "${record.model} (${record.serialNumber})" to E-Waste?`}
            onConfirm={() => handleMoveStatus(record, 'E-Waste')}
            okText="Yes"
            cancelText="No"
            placement="top"
            popupAlign={{ offset: [10, -70] }}
          >
            <span style={{ color: '#8B572A' }}>
              <DeleteOutlined /> Move to E-Waste
            </span>
          </Popconfirm>
        ),
      },
    ];

    return (
      <Space>
        <Button
          type="text"
          icon={<InfoCircleOutlined style={{ color: '#1890ff', fontSize: '18px' }} />}
          onClick={() => handleViewDetails(record)}
          title="View Details"
        />
        <Button
          type="text"
          icon={<UserAddOutlined style={{ fontSize: '18px' }} />}
          onClick={() => handleAssignClick(record)}
          title="Assign"
        />
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined style={{ fontSize: '20px' }} />} />
        </Dropdown>
      </Space>
    );
  };

  // Columns of main grouped table by model
  const columns = [
    {
      title: 'Sl No',
      key: 'slno',
      render: (_, __, index) => index + 1,
      width: 70,
      fixed: 'left',
    },
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
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined style={{ color: 'blue', fontSize: '18px' }} />}
          onClick={() => handleViewModelAssets(record)}
          title="View Assets"
        />
      ),
    },
  ];

  // Columns of nested asset table inside modal
  const modelAssetListColumns = [
    {
      title: 'Sl No',
      key: 'nestedSlNo',
      render: (_, __, index) => index + 1,
      width: 70,
    },
    { title: 'Serial Number', dataIndex: 'serialNumber', key: 'serialNumber' },
    {
      title: 'Purchase Date',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      render: (date) => (date ? moment(date).format('YYYY-MM-DD') : 'N/A'),
    },
    {
      title: 'Warranty Expiry',
      dataIndex: 'warrantyInfo',
      key: 'warrantyInfo',
      render: renderWarrantyTag,
    },
    {
      title: 'Actions',
      key: 'individualAssetActions',
      render: (_, record) => renderInStockActions(record),
    },
  ];

  return (
    <>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Typography.Title level={4} style={{ margin: 0 }}>
            In-Stock Equipment
          </Typography.Title>
        </Col>
        <Col>
          <Input.Search
            placeholder="Search all fields..."
            value={searchTerm}
            onChange={handleSearch}
            allowClear
            style={{ width: 300 }}
          />
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={groupedList}
        rowKey="model"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
      />

      {/* Modal for nested assets of selected model */}
      <Modal
        title={`Assets under Model: ${selectedModelAssets?.model || ''}`}
        visible={isModelAssetsModalVisible}
        onCancel={() => {
          setIsModelAssetsModalVisible(false);
          setSelectedModelAssets(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsModelAssetsModalVisible(false);
              setSelectedModelAssets(null);
            }}
          >
            Close
          </Button>,
        ]}
        width={1000}
        centered
        destroyOnClose
      >
        {selectedModelAssets ? (
          <Table
            dataSource={selectedModelAssets.assets}
            rowKey="_id"
            columns={modelAssetListColumns}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        ) : (
          <p>No assets found.</p>
        )}
      </Modal>

      {/* Assign Modal */}
      <Modal
        title={`Assign: ${selectedEquipment?.model || ''}`}
        open={isAssignModalVisible}
        onOk={handleAssignSubmit}
        onCancel={() => setIsAssignModalVisible(false)}
        okText="Assign"
        destroyOnClose
      >
        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="assigneeName" label="Assignee Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="position" label="Position" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="employeeEmail"
                label="Employee Email"
                rules={[{ required: true, type: 'email' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phoneNumber" label="Phone Number" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="department" label="Department" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Details Modal */}
      <Modal
        title={`Equipment Details: ${detailsEquipment?.model || ''}`}
        open={isDetailsModalVisible}
        onCancel={() => setIsDetailsModalVisible(false)}
        footer={null}
        width={800}       // <-- add this line
        centered   
      >
        {assetForInfoDetails && (
                      <Form form={infoForm} layout="vertical">
                          <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Hardware & General Information</Title>
                          <Row gutter={16}>
                              {/* All fields here will be readOnly, arranged in 4 columns (span=6) */}
                              <Col span={6}><Form.Item label="Asset ID"><Input value={assetForInfoDetails.assetId || 'N/A'} readOnly /></Form.Item></Col>
                              <Col span={6}><Form.Item label="Category"><Input value={assetForInfoDetails.category || 'N/A'} readOnly /></Form.Item></Col>
                              <Col span={6}><Form.Item label="Model"><Input value={assetForInfoDetails.model || 'N/A'} readOnly /></Form.Item></Col>
                              <Col span={6}><Form.Item label="Serial Number"><Input value={assetForInfoDetails.serialNumber || 'N/A'} readOnly /></Form.Item></Col>
                              <Col span={6}><Form.Item label="Location"><Input value={assetForInfoDetails.location || 'N/A'} readOnly /></Form.Item></Col>
                              <Col span={6}><Form.Item label="Purchase Price"><Input value={assetForInfoDetails.purchasePrice || 'N/A'} readOnly /></Form.Item></Col>
                              <Col span={6}><Form.Item label="Status"><Input value={assetForInfoDetails.status || 'N/A'} readOnly /></Form.Item></Col>
                              <Col span={6}><Form.Item label="Purchase Date">
                                  <Input value={assetForInfoDetails.purchaseDate ? moment(assetForInfoDetails.purchaseDate).format('YYYY-MM-DD') : 'N/A'} readOnly />
                              </Form.Item></Col>
                              <Col span={6}><Form.Item label="Warranty Expiry">
                                  <Input value={assetForInfoDetails.warrantyInfo ? moment(assetForInfoDetails.warrantyInfo).format('DD MMM YYYY') : 'N/A'} readOnly />
                              </Form.Item></Col>
                          </Row>
        
                         
                          <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Comments & Audit Trail</Title>
                          <Row gutter={16}>
                              {assetForInfoDetails.damageDescription && (
                                  <Col span={12}> {/* Damage Description takes 2 columns for better readability in 4-col context */}
                                      <Form.Item label="Damage Description">
                                          <Input.TextArea value={assetForInfoDetails.damageDescription || 'N/A'} rows={2} readOnly />
                                      </Form.Item>
                                  </Col>
                              )}
                              <Col span={12}> {/* Comment takes 2 columns for better readability */}
                                  <Form.Item label="Comment">
                                      <Input.TextArea value={assetForInfoDetails.comment || 'N/A'} rows={2} readOnly />
                                  </Form.Item>
                              </Col>
                              <Col span={12}><Form.Item label="Created At"><Input value={assetForInfoDetails.createdAt ? moment(assetForInfoDetails.createdAt).format('DD MMM YYYY HH:mm') : 'N/A'} readOnly /></Form.Item></Col>
                              <Col span={12}><Form.Item label="Updated At"><Input value={assetForInfoDetails.updatedAt ? moment(assetForInfoDetails.updatedAt).format('DD MMM YYYY HH:mm') : 'N/A'} readOnly /></Form.Item></Col>
                          </Row>
                      </Form>
                  )}
      </Modal>

      {/* External Popconfirm for status change */}
      {confirmationConfig && (
        <Popconfirm
          title={confirmationConfig.title}
          open={confirmationConfig.visible}
          onConfirm={confirmationConfig.onConfirm}
          onCancel={confirmationConfig.onCancel}
          okText="Yes"
          cancelText="No"
          placement="top"
        >
          {/* Dummy element required for Popconfirm */}
          <span style={{ display: 'none' }} />
        </Popconfirm>
      )}
    </>
  );
};

export default InStockView;
