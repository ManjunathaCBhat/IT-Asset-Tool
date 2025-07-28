import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Table,
  Typography,
  Modal,
  Button,
  Space,
  Form,
  Input,
  message,
  Dropdown,
  Popconfirm
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  MoreOutlined,
  EditOutlined,
  WarningOutlined as DamagedIcon,
  DeleteOutlined as EWasteIcon,
} from '@ant-design/icons';
import moment from 'moment';

const { Title } = Typography;

// Helper for status colors
const getStatusColor = (status) => {
  const colors = {
    'In Use': '#7ED321',
    'In Stock': '#FA8C16',
    Damaged: '#D0021B',
    'E-Waste': '#8B572A',
  };
  return colors[status] || 'default';
};

// Group assets by employeeEmail
const groupAssetsByEmail = (assets) => {
  const grouped = assets.reduce((acc, asset) => {
    const emailKey = asset.employeeEmail || 'unknown';
    if (!acc[emailKey]) {
      acc[emailKey] = {
        employeeEmail: emailKey,
        assigneeName: asset.assigneeName || '',
        phoneNumber: asset.phoneNumber || '',
        department: asset.department || '',
        assets: [],
      };
    }
    acc[emailKey].assets.push(asset);
    return acc;
  }, {});
  return Object.values(grouped);
};

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'x-auth-token': token } : {};
};

const InUse = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal and form state
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isEditViewModalVisible, setIsEditViewModalVisible] = useState(false);
  const [isViewOnlyModal, setIsViewOnlyModal] = useState(false);
  const [editViewForm] = Form.useForm();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEmployeeAssets, setSelectedEmployeeAssets] = useState(null);

  // Confirmation dialog for status changes
  const [confirmationConfig, setConfirmationConfig] = useState(null);

  // For blur effect
  const [isAssetModalVisible, setIsAssetModalVisible] = useState(false);

  // Fetch in-use assets
  const fetchInUseAssets = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/equipment', { headers: getAuthHeader() });
      const inUseAssets = response.data.filter((item) => item.status === 'In Use');
      setData(inUseAssets);
      setFilteredData(inUseAssets);
    } catch (error) {
      message.error('Failed to fetch In Use assets.');
    }
  }, []);

  useEffect(() => {
    fetchInUseAssets();
  }, [fetchInUseAssets]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    const filtered = data.filter((item) =>
      Object.values(item).some((field) => String(field).toLowerCase().includes(value.toLowerCase()))
    );
    setFilteredData(filtered);
  };

  // Group filteredData by employeeEmail
  const groupedList = groupAssetsByEmail(filteredData);

  // Modal logic
  const handleViewDetails = (record) => {
    setSelectedAsset(record);
    editViewForm.setFieldsValue({
      ...record,
      warrantyInfo: record.warrantyInfo ? moment(record.warrantyInfo) : null,
      purchaseDate: record.purchaseDate ? moment(record.purchaseDate) : null,
    });
    setIsViewOnlyModal(true);
    setIsEditViewModalVisible(true);
    setIsAssetModalVisible(true); // Blur
  };

  const handleEdit = (record) => {
    setSelectedAsset(record);
    editViewForm.setFieldsValue({
      ...record,
      warrantyInfo: record.warrantyInfo ? moment(record.warrantyInfo) : null,
      purchaseDate: record.purchaseDate ? moment(record.purchaseDate) : null,
    });
    setIsViewOnlyModal(false);
    setIsEditViewModalVisible(true);
    setIsAssetModalVisible(true); // Blur
  };

  const handleSaveEditView = async () => {
    try {
      const values = await editViewForm.validateFields();
      const updatedAsset = {
        ...values,
        warrantyInfo: values.warrantyInfo ? values.warrantyInfo.format('YYYY-MM-DD') : null,
        purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : null,
      };
      await axios.put(
        `http://localhost:5000/api/equipment/${selectedAsset._id}`,
        updatedAsset,
        { headers: getAuthHeader() }
      );
      message.success('Asset updated successfully.');
      setIsEditViewModalVisible(false);
      setIsAssetModalVisible(false);
      editViewForm.resetFields();
      fetchInUseAssets();
    } catch {
      message.error('Failed to update asset.');
    }
  };

  const handleCancelEditView = () => {
    setIsEditViewModalVisible(false);
    setIsViewOnlyModal(false);
    setIsAssetModalVisible(false);
    editViewForm.resetFields();
  };

  // Confirmation dialog for status changes
  const confirmStatusChange = (record, newStatus) => {
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
          fetchInUseAssets();
          setModalVisible(false); // close asset list modal after action
        } catch {
          message.error(`Failed to update status to ${newStatus}`);
        }
      },
      onCancel: () => setConfirmationConfig(null),
    });
  };

  // Actions column for the assets (per-employee asset table)
  const renderAssetActions = (record) => (
    <Space>
      <Button
        type="text"
        icon={<EyeOutlined style={{ fontSize: 20 }} />}
        onClick={() => handleViewDetails(record)}
        title="View Details"
      />
      <Button
        type="text"
        icon={<EditOutlined style={{ fontSize: 20 }} />}
        onClick={() => handleEdit(record)}
        title="Edit"
      />
      <Dropdown
        menu={{
          items: [
            {
              key: 'damage',
              label: 'Move to Damaged',
              danger: true,
              icon: <DamagedIcon />,
              onClick: () => confirmStatusChange(record, 'Damaged'),
            },
            {
              key: 'ewaste',
              label: 'Move to E-Waste',
              danger: true,
              icon: <EWasteIcon />,
              onClick: () => confirmStatusChange(record, 'E-Waste'),
            },
          ],
        }}
        trigger={['click']}
        placement="bottomRight"
      >
        <Button type="text" icon={<MoreOutlined style={{ fontSize: 20 }} />} />
      </Dropdown>
      <Button
        type="primary"
        style={{
          backgroundColor: getStatusColor('In Stock'),
          borderColor: getStatusColor('In Stock'),
        }}
        onClick={() => confirmStatusChange(record, 'In Stock')}
        disabled={record.status === 'In Stock'}
      >
        Return
      </Button>
      {/* Only one Popconfirm is shown per time */}
      {confirmationConfig?.visible && (
        <Popconfirm
          open={true}
          title={confirmationConfig.title}
          onConfirm={confirmationConfig.onConfirm}
          onCancel={confirmationConfig.onCancel}
          okText="Yes"
          cancelText="No"
        >
          <span />
        </Popconfirm>
      )}
    </Space>
  );

  // Table columns for grouping by email
  const columns = [
    {
      title: 'Sl No',
      key: 'slno',
      render: (_, __, index) => index + 1,
      width: 70,
      fixed: 'left',
    },
    { title: 'Assignee', dataIndex: 'assigneeName', key: 'assigneeName' },
    { title: 'Email', dataIndex: 'employeeEmail', key: 'employeeEmail' },
    { title: 'Phone', dataIndex: 'phoneNumber', key: 'phoneNumber' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    {
      title: 'Asset Count',
      key: 'assetCount',
      render: (_, record) => record.assets.length,
    },
    {
      title: 'Details',
      key: 'viewDetails',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined style={{ color: 'blue', fontSize: '18px' }} />}
          onClick={() => {
            setSelectedEmployeeAssets(record);
            setModalVisible(true);
          }}
        />
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          In Use Equipment
        </Title>
        <Input
          placeholder="Search all fields..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={handleSearch}
          style={{ width: 250 }}
          allowClear
        />
      </div>

      <div style={{
        filter: isAssetModalVisible ? 'blur(4px)' : 'none',
        transition: 'filter 0.3s ease',
      }}>
        <Table
          columns={columns}
          dataSource={groupedList}
          rowKey={(record) => record.employeeEmail}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </div>

      {/* Edit/View Modal */}
      <Modal
        title={isViewOnlyModal ? 'Asset Details' : 'Edit Asset'}
        open={isEditViewModalVisible}
        onCancel={handleCancelEditView}
        afterClose={() => setIsAssetModalVisible(false)}
        footer={isViewOnlyModal
          ? [
            <Button key="close" onClick={handleCancelEditView}>
              Close
            </Button>,
          ] : [
            <Button key="back" onClick={handleCancelEditView}>
              Cancel
            </Button>,
            <Button key="submit" type="primary" onClick={handleSaveEditView}>
              Save
            </Button>,
          ]}
        width={700}
        centered
        destroyOnClose
      >
        <Form form={editViewForm} layout="vertical">
          <Form.Item label="Asset ID" name="assetId">
            <Input disabled />
          </Form.Item>
          <Form.Item label="Model" name="model">
            <Input disabled={isViewOnlyModal} />
          </Form.Item>
          <Form.Item label="Category" name="category">
            <Input disabled={isViewOnlyModal} />
          </Form.Item>
          <Form.Item label="Serial Number" name="serialNumber">
            <Input disabled={isViewOnlyModal} />
          </Form.Item>
          <Form.Item label="Status" name="status">
            <Input disabled />
          </Form.Item>
          <Form.Item label="Purchase Date" name="purchaseDate">
            <Input value={
              editViewForm.getFieldValue("purchaseDate")
                ? moment(editViewForm.getFieldValue("purchaseDate")).format("YYYY-MM-DD")
                : ""
            } disabled />
          </Form.Item>
          <Form.Item label="Warranty Info" name="warrantyInfo">
            <Input value={
              editViewForm.getFieldValue("warrantyInfo")
                ? moment(editViewForm.getFieldValue("warrantyInfo")).format("YYYY-MM-DD")
                : ""
            } disabled />
          </Form.Item>
          <Form.Item label="Assignee Name" name="assigneeName">
            <Input disabled={isViewOnlyModal} />
          </Form.Item>
          <Form.Item label="Employee Email" name="employeeEmail">
            <Input disabled={isViewOnlyModal} />
          </Form.Item>
          <Form.Item label="Phone" name="phoneNumber">
            <Input disabled={isViewOnlyModal} />
          </Form.Item>
          <Form.Item label="Department" name="department">
            <Input disabled={isViewOnlyModal} />
          </Form.Item>
          <Form.Item label="Comment" name="comment">
            <Input.TextArea rows={2} disabled={isViewOnlyModal} />
          </Form.Item>
          {/* Add more if needed */}
        </Form>
      </Modal>

      {/* Modal with Asset List for selected employee */}
      <Modal
        title={`Assets assigned to ${selectedEmployeeAssets ? selectedEmployeeAssets.assigneeName : ''}`}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedEmployeeAssets(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setModalVisible(false);
              setSelectedEmployeeAssets(null);
            }}
          >
            Close
          </Button>,
        ]}
        width={900}
        centered
        destroyOnClose
      >
        {selectedEmployeeAssets ? (
          <Table
            dataSource={selectedEmployeeAssets.assets}
            rowKey="_id"
            pagination={false}
            columns={[
              { title: 'Asset ID', dataIndex: 'assetId', key: 'assetId' },
              { title: 'Model', dataIndex: 'model', key: 'model' },
              { title: 'Category', dataIndex: 'category', key: 'category' },
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
                render: (date) => (date ? moment(date).format('YYYY-MM-DD') : 'N/A'),
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_, record) => renderAssetActions(record),
              },
            ]}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        ) : (
          <p>No assets found.</p>
        )}
      </Modal>
    </>
  );
};

export default InUse;
