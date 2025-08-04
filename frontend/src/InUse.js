import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {  Table, Tag,Typography,Modal,Button,Space,Form,Input,message,Dropdown,Popconfirm,Menu,DatePicker,Row,Col} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  MoreOutlined,
  EditOutlined,
  WarningOutlined as DamagedIcon,
  DeleteOutlined as EWasteIcon,
  RollbackOutlined,
  InfoCircleOutlined
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
    Removed: '#555555'
  };
  return colors[status] || 'default';
};

// Render Warranty Tag (used in table columns)
const renderWarrantyTag = (date) => {
  if (!date) return 'N/A';
  const warrantyDate = moment(date);
  if (!warrantyDate.isValid()) return 'Invalid Date';

  const today = moment();
  const thirtyDaysFromNow = moment().add(30, 'days');

  if (warrantyDate.isBefore(today, 'day')) {
    return <Tag color="error">Expired: {warrantyDate.format('DD MMM YYYY')}</Tag>;
  }
  if (warrantyDate.isBefore(thirtyDaysFromNow, 'day')) {
    return <Tag color="warning">Soon: {warrantyDate.format('DD MMM YYYY')}</Tag>;
  }
  return warrantyDate.format('DD MMM YYYY');
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

  // Main Modal for View/Edit Individual Asset (Existing modal, now 2-column)
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isEditViewModalVisible, setIsEditViewModalVisible] = useState(false);
  const [isViewOnlyModal, setIsViewOnlyModal] = useState(false);
  const [editViewForm] = Form.useForm();

  // NEW: State for Dedicated Full Info Modal (Read-Only, triggered by Info icon in nested table)
  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
  const [assetForInfoDetails, setAssetForInfoDetails] = useState(null);
  const [infoForm] = Form.useForm(); // New form instance for the info modal

  // Modal for displaying assets grouped by employeeEmail (Main table's 'Details' button)
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEmployeeAssets, setSelectedEmployeeAssets] = useState(null);

  // For blur effect
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);

  // --- Data Fetching ---
  const fetchInUseAssets = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/equipment', { headers: getAuthHeader() });
      const inUseAssets = response.data.filter((item) => item.status === 'In Use');
      setData(inUseAssets);
      setFilteredData(inUseAssets);
    } catch (error) {
      message.error('Failed to fetch In Use assets.');
      console.error('Error fetching In Use assets:', error);
    }
  }, []);

  useEffect(() => {
    fetchInUseAssets();
  }, [fetchInUseAssets]);

  // Update isAnyModalOpen when any modal state changes
  useEffect(() => {
    setIsAnyModalOpen(isEditViewModalVisible || modalVisible || isInfoModalVisible);
  }, [isEditViewModalVisible, modalVisible, isInfoModalVisible]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    const filtered = data.filter((item) =>
      Object.values(item).some((field) => String(field).toLowerCase().includes(value.toLowerCase()))
    );
    setFilteredData(filtered);
  };

  const groupedList = groupAssetsByEmail(filteredData);


  // handleInfoDetails for individual asset full info (read-only)
  const handleInfoDetails = (record) => {
      setAssetForInfoDetails(record);
      infoForm.setFieldsValue({
          ...record,
          purchaseDate: record.purchaseDate ? moment(record.purchaseDate) : null,
          warrantyInfo: record.warrantyInfo ? moment(record.warrantyInfo) : null,
      });
      setIsInfoModalVisible(true);
  };

  const handleEdit = (record) => {
    setSelectedAsset(record);
    editViewForm.setFieldsValue({
      ...record,
      warrantyInfo: record.warrantyInfo ? moment(record.warrantyInfo) : null,
      purchaseDate: record.purchaseDate ? moment(record.purchaseDate) : null,
    });
    setIsViewOnlyModal(false); // Enable editing
    setIsEditViewModalVisible(true);
  };

  const handleSaveEditView = async () => {
    try {
      const values = await editViewForm.validateFields();
      const updatedAsset = { ...values };
      // Explicitly format date fields before sending to backend
      if (updatedAsset.warrantyInfo) {
          updatedAsset.warrantyInfo = moment(updatedAsset.warrantyInfo).format('YYYY-MM-DD');
      }
      if (updatedAsset.purchaseDate) {
          updatedAsset.purchaseDate = moment(updatedAsset.purchaseDate).format('YYYY-MM-DD');
      }

      const payloadToSend = {
          category: updatedAsset.category,
          model: updatedAsset.model,
          serialNumber: updatedAsset.serialNumber,
          warrantyInfo: updatedAsset.warrantyInfo,
          location: updatedAsset.location,
          comment: updatedAsset.comment,
          assigneeName: updatedAsset.assigneeName,
          position: updatedAsset.position,
          employeeEmail: updatedAsset.employeeEmail,
          phoneNumber: updatedAsset.phoneNumber,
          department: updatedAsset.department,
          damageDescription: updatedAsset.status === 'Damaged' ? updatedAsset.damageDescription : null,
          purchaseDate: updatedAsset.purchaseDate,
          status: updatedAsset.status,
          purchasePrice: updatedAsset.purchasePrice,
      };
      // Convert empty strings to null for optional fields for backend consistency
      if (payloadToSend.assigneeName === '') payloadToSend.assigneeName = null;
      if (payloadToSend.position === '') payloadToSend.position = null;
      if (payloadToSend.employeeEmail === '') payloadToSend.employeeEmail = null;
      if (payloadToSend.phoneNumber === '') payloadToSend.phoneNumber = null;
      if (payloadToSend.department === '') payloadToSend.department = null;
      if (payloadToSend.comment === '') payloadToSend.comment = null;
      if (payloadToSend.damageDescription === '') payloadToSend.damageDescription = null;

      await axios.put(
        `http://localhost:5000/api/equipment/${selectedAsset._id}`,
        payloadToSend,
        { headers: getAuthHeader() }
      );
      message.success('Asset updated successfully.');
      handleCancelEditView();
      fetchInUseAssets();
    } catch (error) {
      message.error('Failed to update asset.');
      console.error('Failed to update asset:', error.response ? error.response.data : error.message);
    }
  };

  const handleCancelEditView = () => {
    setIsEditViewModalVisible(false);
    setIsViewOnlyModal(false);
    setSelectedAsset(null);
    editViewForm.resetFields();
  };

  const handleCancelInfoModal = () => {
      setIsInfoModalVisible(false);
      setAssetForInfoDetails(null);
      infoForm.resetFields();
  };


  const handleMoveStatus = async (record, newStatus) => {
    try {
      await axios.put(
        `http://localhost:5000/api/equipment/${record._id}`,
        { status: newStatus },
        { headers: getAuthHeader() }
      );
      message.success(`Moved to ${newStatus}`);
      setModalVisible(false); // Close grouped assets modal if open
      setIsEditViewModalVisible(false); // Close edit/view modal if open
      setIsInfoModalVisible(false); // Close info modal if open
      fetchInUseAssets();
    } catch (error) {
      message.error(`Failed to update status to ${newStatus}`);
      console.error(`Failed to update status to ${newStatus}:`, error.response ? error.response.data : error.message);
    }
  };

  // Actions column for the assets (per-employee asset table)
  const renderAssetActions = (record) => (
    <Space size="middle">
      {/* NEW: Return to Stock Button (First Option) */}
      <Popconfirm
        title={`Move asset "${record.model} (${record.serialNumber})" to In Stock?`}
        onConfirm={() => handleMoveStatus(record, 'In Stock')}
        okText="Yes"
        cancelText="No"
        placement="top"
      >
        <Button
          type="primary"
          icon={<RollbackOutlined />}
          style={{ backgroundColor: getStatusColor('In Stock'), borderColor: getStatusColor('In Stock') }}
          disabled={record.status === 'In Stock'} // Disable if already In Stock
          title="Return to Stock"
        >
        </Button>
      </Popconfirm>

      {/* NEW: Info Icon for full details of individual asset */}
      <Button
        type="text"
        icon={<InfoCircleOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
        onClick={() => handleInfoDetails(record)}
        title="View Full Details"
      />

      <Button
        type="text"
        icon={<EditOutlined style={{ fontSize: 20 }} />}
        onClick={() => handleEdit(record)}
        title="Edit"
      />

      <Dropdown
        overlay={
          <Menu>
            <Menu.Item key="damage">
              <Popconfirm
                title={`Move asset "${record.model} (${record.serialNumber})" to Damaged?`}
                onConfirm={() => handleMoveStatus(record, 'Damaged')}
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
                title={`Move asset "${record.model} (${record.serialNumber})" to E-Waste?`}
                onConfirm={() => handleMoveStatus(record, 'E-Waste')}
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
        <Button type="text" icon={<MoreOutlined style={{ fontSize: 20 }} />} />
      </Dropdown>
    </Space>
  );

  // Table columns for grouping by email (Main Table)
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
      title: 'Actions', // Actions for the main grouped table
      key: 'actions',
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

  // Columns for the nested table (individual assets within an employee's list)
  const employeeAssetListColumns = [
      {
        title: 'Sl No',
        key: 'nestedSlNo',
        render: (_, __, index) => index + 1,
        width: 70,
      },
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
        render: (date) => renderWarrantyTag(date),
      },
      {
        title: 'Actions',
        key: 'individualAssetActions',
        align : 'center',
        render: (_, record) => renderAssetActions(record),
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
        filter: isAnyModalOpen ? 'blur(4px)' : 'none', // Apply blur when ANY modal is open
        pointerEvents: isAnyModalOpen ? 'none' : 'auto',
        userSelect: isAnyModalOpen ? 'none' : 'auto',
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

      {/* Edit/View Modal (for individual assets, now 2-column) */}
      <Modal
        title={isViewOnlyModal ? 'Asset Details' : 'Edit Asset - Hardware & General Information'}
        open={isEditViewModalVisible}
        onCancel={handleCancelEditView}
        afterClose={() => setSelectedAsset(null)}
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
        width={1000} // Increased width for 2 columns
        centered
        destroyOnClose // Ant Design warning: `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.
      >
        <Form form={editViewForm} layout="vertical">
          <Row gutter={16}> {/* Use Row/Col for 2 columns */}

            <Col span={12}><Form.Item label="Model" name="model" rules={[{ required: true }]}><Input disabled={isViewOnlyModal} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Category" name="category" rules={[{ required: true }]}><Input disabled={isViewOnlyModal} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Serial Number" name="serialNumber" rules={[{ required: true }]}><Input disabled={isViewOnlyModal} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Status" name="status" rules={[{ required: true }]}><Input disabled={isViewOnlyModal ? true : false} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Location" name="location" rules={[{ required: true }]}><Input disabled={isViewOnlyModal} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Purchase Price" name="purchasePrice"><Input disabled={isViewOnlyModal} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Purchase Date" name="purchaseDate"><DatePicker style={{ width: '100%' }} disabled={isViewOnlyModal} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Warranty Info" name="warrantyInfo"><DatePicker style={{ width: '100%' }} disabled={isViewOnlyModal} /></Form.Item></Col>

            <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Assignee & Contact Information</Title>
            <Col span={12}><Form.Item label="Assignee Name" name="assigneeName" rules={[{ required: true }]}><Input disabled={isViewOnlyModal} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Employee Email" name="employeeEmail" rules={[{ required: true, type: 'email' }]}><Input disabled={isViewOnlyModal} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Position" name="position" rules={[{ required: true }]}><Input disabled={isViewOnlyModal} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Department" name="department" rules={[{ required: true }]}><Input disabled={isViewOnlyModal} /></Form.Item></Col>
            <Col span={12}><Form.Item label="Phone" name="phoneNumber" rules={[{ required: true }]}><Input disabled={isViewOnlyModal} /></Form.Item></Col>

            <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Comments & Damage</Title>
            <Col span={24}><Form.Item label="Comment" name="comment"><Input.TextArea rows={2} disabled={isViewOnlyModal} /></Form.Item></Col>
            {(selectedAsset?.status === 'Damaged' || editViewForm.getFieldValue('status') === 'Damaged') && !isViewOnlyModal && (
                <Col span={24}>
                    <Form.Item label="Damage Description" name="damageDescription">
                        <Input.TextArea rows={2} disabled={isViewOnlyModal} />
                    </Form.Item>
                </Col>
            )}
          </Row>
        </Form>
      </Modal>

      {/* NEW: Full Info Modal (Read-Only, 4-column layout) */}
      <Modal
        title="Asset Full Details"
        open={isInfoModalVisible}
        onCancel={handleCancelInfoModal}
        footer={[<Button key="close" onClick={handleCancelInfoModal}>Close</Button>]}
        width={800} // Set width to 800 for 4 columns
        centered
        destroyOnClose // Ant Design warning: `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.
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

                  <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Assignee & Contact Information</Title>
                  <Row gutter={16}>
                      <Col span={6}><Form.Item label="Assignee Name"><Input value={assetForInfoDetails.assigneeName || 'N/A'} readOnly /></Form.Item></Col>
                      <Col span={6}><Form.Item label="Position"><Input value={assetForInfoDetails.position || 'N/A'} readOnly /></Form.Item></Col>
                      <Col span={6}><Form.Item label="Employee Email"><Input value={assetForInfoDetails.employeeEmail || 'N/A'} readOnly /></Form.Item></Col>
                      <Col span={6}><Form.Item label="Phone Number"><Input value={assetForInfoDetails.phoneNumber || 'N/A'} readOnly /></Form.Item></Col>
                      <Col span={6}><Form.Item label="Department"><Input value={assetForInfoDetails.department || 'N/A'} readOnly /></Form.Item></Col>
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

      {/* Modal with Asset List for selected employee */}
      <Modal
        title={`Assets assigned to ${selectedEmployeeAssets ? selectedEmployeeAssets.assigneeName : ''}`}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedEmployeeAssets(null);
        }}
        afterClose={() => setIsAnyModalOpen(false)}
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
        width={1000}
        centered
        destroyOnClose // Ant Design warning: `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.
      >
        {selectedEmployeeAssets ? (
          <Table
            dataSource={selectedEmployeeAssets.assets}
            rowKey="_id"
            pagination={false}
            columns={employeeAssetListColumns} // Use dedicated columns for nested table
            size="small"
            scroll={{ x: 'max-content' }}
          />
        ) : (
          <p>No assets found.</p>
        )}
      </Modal>

      {/* Popconfirm is rendered directly in renderAssetActions. */}
    </>
  );
};

export default InUse;