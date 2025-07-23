import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Table,
  Tag,
  Typography,
  Modal,
  Button,
  Space,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  message,
  Dropdown,
  Menu,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  RollbackOutlined,
  MoreOutlined,
  EditOutlined,
  WarningOutlined as DamagedIcon,
  DeleteOutlined as EWasteIcon,
} from '@ant-design/icons';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;

// Helper for status colors
const getStatusColor = (status) => {
  const colors = {
    'In Use': '#7ED321', // Green
    'In Stock': '#FA8C16', // Orange
    Damaged: '#D0021B', // Red
    'E-Waste': '#8B572A', // Brown
  };
  return colors[status] || 'default';
};

// Group assets by employeeEmail (fix grouping)
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

const InUse = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit/View Modal
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isEditViewModalVisible, setIsEditViewModalVisible] = useState(false);
  const [isViewOnlyModal, setIsViewOnlyModal] = useState(false);
  const [editViewForm] = Form.useForm();

  // Generic Status Change Modal
  const [isStatusChangeModalVisible, setIsStatusChangeModalVisible] = useState(false);
  const [assetForStatusChange, setAssetForStatusChange] = useState(null);
  const [targetStatus, setTargetStatus] = useState('');
  const [statusChangeForm] = Form.useForm();

  // Modal showing assets for selected employee
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEmployeeAssets, setSelectedEmployeeAssets] = useState(null);

  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { 'x-auth-token': token } : {};
  }, []);

  const fetchInUseAssets = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/equipment', { headers: getAuthHeader() });
      const inUseAssets = response.data.filter((item) => item.status === 'In Use');
      setData(inUseAssets);
      setFilteredData(inUseAssets);
    } catch (error) {
      console.error('Error fetching In Use assets:', error.response ? error.response.data : error.message);
      message.error('Failed to fetch In Use assets.');
    }
  }, [getAuthHeader]);

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

  // Edit/View Modal handlers
  const handleViewDetails = (record) => {
    setSelectedAsset(record);
    editViewForm.setFieldsValue({
      ...record,
      warrantyInfo: record.warrantyInfo ? moment(record.warrantyInfo) : null,
      purchaseDate: record.purchaseDate ? moment(record.purchaseDate) : null,
    });
    setIsViewOnlyModal(true);
    setIsEditViewModalVisible(true);
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
  };

  const handleSaveEditView = async () => {
    try {
      const values = await editViewForm.validateFields();
      const updatedAsset = {
        ...values,
        warrantyInfo: values.warrantyInfo ? values.warrantyInfo.format('YYYY-MM-DD') : null,
        purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : null,
      };
      await axios.put(`http://localhost:5000/api/equipment/${selectedAsset._id}`, updatedAsset, { headers: getAuthHeader() });
      message.success('Asset updated successfully.');
      setIsEditViewModalVisible(false);
      editViewForm.resetFields();
      fetchInUseAssets();
    } catch (error) {
      console.error('Failed to update asset:', error.response ? error.response.data : error.message);
      message.error('Failed to update asset.');
    }
  };

  const handleCancelEditView = () => {
    setIsEditViewModalVisible(false);
    setIsViewOnlyModal(false);
    editViewForm.resetFields();
  };

  // Status Change Modal handlers
  const openStatusChangeModal = (record, status) => {
    setAssetForStatusChange(record);
    setTargetStatus(status);
    statusChangeForm.setFieldsValue({
      ...record,
      warrantyInfo: record.warrantyInfo ? moment(record.warrantyInfo) : null,
      purchaseDate: record.purchaseDate ? moment(record.purchaseDate) : null,
      comment: record.comment || '',
    });
    setIsStatusChangeModalVisible(true);
  };

  const handleCancelStatusChange = () => {
    setIsStatusChangeModalVisible(false);
    setAssetForStatusChange(null);
    setTargetStatus('');
    statusChangeForm.resetFields();
  };

  const handleConfirmStatusChange = async () => {
    try {
      const values = await statusChangeForm.validateFields();
      const updatePayload = {
        status: targetStatus,
        comment: values.comment,
      };
      if (assetForStatusChange.status === 'Damaged' && targetStatus !== 'Damaged') {
        updatePayload.damageDescription = null;
      }
      Modal.confirm({
        title: 'Confirm Status Change',
        content: `Are you sure you want to change the status of ${assetForStatusChange.model} (${assetForStatusChange.serialNumber}) to '${targetStatus}'?`,
        okText: `Yes, ${targetStatus === 'In Stock' ? 'Returned' : 'Confirm'}`,
        cancelText: 'No',
        onOk: async () => {
          try {
            await axios.put(`http://localhost:5000/api/equipment/${assetForStatusChange._id}`, updatePayload, { headers: getAuthHeader() });
            message.success(`Asset successfully moved to '${targetStatus}'!`);
            setIsStatusChangeModalVisible(false);
            statusChangeForm.resetFields();
            fetchInUseAssets();
          } catch (error) {
            console.error(`Failed to update asset status to ${targetStatus}:`, error.response ? error.response.data : error.message);
            message.error(`Failed to update asset status to '${targetStatus}'. Please check backend for details.`);
          }
        },
      });
    } catch (errorInfo) {
      // validation failed
    }
  };

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

      <div
        style={{
          filter: isEditViewModalVisible || isStatusChangeModalVisible ? 'blur(4px)' : 'none',
          pointerEvents: isEditViewModalVisible || isStatusChangeModalVisible ? 'none' : 'auto',
          userSelect: isEditViewModalVisible || isStatusChangeModalVisible ? 'none' : 'auto',
          transition: 'filter 0.3s ease',
        }}
      >
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
        footer={
          isViewOnlyModal
            ? [
                <Button key="close" onClick={handleCancelEditView}>
                  Close
                </Button>,
              ]
            : [
                <Button key="back" onClick={handleCancelEditView}>
                  Cancel
                </Button>,
                <Button key="submit" type="primary" onClick={handleSaveEditView}>
                  Save
                </Button>,
              ]
        }
        width={1000}
        centered
      >
        <Form form={editViewForm} layout="vertical">
          {/* Your form items exactly as before */}
          {/* ... (omitted here for brevity; copy your existing form) ... */}
        </Form>
      </Modal>

      {/* Generic Status Change Modal */}
      <Modal
        title={targetStatus === 'In Stock' ? 'Return Asset' : `Move to ${targetStatus}`}
        open={isStatusChangeModalVisible}
        onCancel={handleCancelStatusChange}
        footer={[
          <Button key="cancel" onClick={handleCancelStatusChange}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmStatusChange}>
            {targetStatus === 'In Stock' ? 'Returned' : 'Confirm'}
          </Button>,
        ]}
        width={1000}
        centered
      >
        {/* Your status change form here (same as your original) */}
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
                title: 'Return',
                key: 'return',
                render: (_, record) =>
                  record.status !== 'In Stock' ? (
                    <Button
                      type="primary"
                      style={{ backgroundColor: getStatusColor('In Stock'), borderColor: getStatusColor('In Stock') }}
                      onClick={() => openStatusChangeModal(record, 'In Stock')}
                    >
                      Return
                    </Button>
                  ) : null,
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_, record) => (
                  <Dropdown
                    overlay={
                      <Menu>
                        <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                          Edit
                        </Menu.Item>
                        <Menu.Item key="move-damaged" icon={<DamagedIcon />} onClick={() => openStatusChangeModal(record, 'Damaged')}>
                          Move to Damaged
                        </Menu.Item>
                        <Menu.Item key="move-ewaste" icon={<EWasteIcon />} onClick={() => openStatusChangeModal(record, 'E-Waste')}>
                          Move to E-Waste
                        </Menu.Item>
                      </Menu>
                    }
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button type="text" icon={<MoreOutlined style={{ color: 'black', fontWeight: 'bold', fontSize: '18px' }} />} />
                  </Dropdown>
                ),
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
