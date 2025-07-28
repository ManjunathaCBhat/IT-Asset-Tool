import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
    Table, Tag, Typography, Modal, Button, Space, Form, Input, Select,
    DatePicker, Row, Col, message, Dropdown, Menu // Removed Popconfirm as it's not needed for new flow
} from 'antd';
import {
    SearchOutlined, EyeOutlined, RollbackOutlined,
    MoreOutlined, EditOutlined, WarningOutlined as DamagedIcon, DeleteOutlined as EWasteIcon
} from '@ant-design/icons';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;

// Helper for status colors (consistent with AppLayout and Dashboard)
const getStatusColor = (status) => {
    const colors = {
        'In Use': '#7ED321', // Green
        'In Stock': '#FA8C16', // Orange
        'Damaged': '#D0021B', // Red
        'E-Waste': '#8B572A'  // Brown
    };
    return colors[status] || 'default';
};

const InUse = () => {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // State for Edit/View Asset Modal
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [isEditViewModalVisible, setIsEditViewModalVisible] = useState(false);
    const [isViewOnlyModal, setIsViewOnlyModal] = useState(false);
    const [editViewForm] = Form.useForm();

    // State for Generic Status Change Modals (Return, Damage, E-Waste)
    const [isStatusChangeModalVisible, setIsStatusChangeModalVisible] = useState(false);
    const [assetForStatusChange, setAssetForStatusChange] = useState(null);
    const [targetStatus, setTargetStatus] = useState('');
    const [statusChangeForm] = Form.useForm();

    const getAuthHeader = useCallback(() => { // Added useCallback for stability
        const token = localStorage.getItem('token');
        return token ? { 'x-auth-token': token } : {};
    }, []);

    const fetchInUseAssets = useCallback(async () => { // Added useCallback for stability
        try {
            const response = await axios.get('http://localhost:5000/api/equipment', { headers: getAuthHeader() });
            const inUseAssets = response.data.filter(item => item.status === 'In Use');
            setData(inUseAssets);
            setFilteredData(inUseAssets);
        } catch (error) {
            console.error('Error fetching In Use assets:', error.response ? error.response.data : error.message);
            message.error('Failed to fetch In Use assets.');
        }
    }, [getAuthHeader]); // Dependency for useCallback

    useEffect(() => {
        fetchInUseAssets();
    }, [fetchInUseAssets]); // Dependency for useEffect

    const [groupedAssets, setGroupedAssets] = React.useState([]);
const [modalVisible, setModalVisible] = React.useState(false);
const [selectedEmployeeAssets, setSelectedEmployeeAssets] = React.useState(null);

const fetchGroupedAssets = React.useCallback(async () => {
  try {
    const response = await axios.get('http://localhost:5000/api/equipment/grouped-by-email', {
      headers: getAuthHeader(),
    });
    setGroupedAssets(response.data);
  } catch (error) {
    message.error('Failed to load grouped assets.');
    console.error(error);
  }
}, [getAuthHeader]);

React.useEffect(() => {
  fetchGroupedAssets();
}, [fetchGroupedAssets]);


    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        const filtered = data.filter(item =>
            Object.values(item).some(field =>
                String(field).toLowerCase().includes(value.toLowerCase())
            )
        );
        setFilteredData(filtered);
    };

    // --- Edit/View Modal Handlers ---
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


    // --- Generic Status Change Modal Handlers ---
    const openStatusChangeModal = (record, status) => {
        setAssetForStatusChange(record);
        setTargetStatus(status);
        statusChangeForm.setFieldsValue({
            ...record, // Pre-fill all fields (will be readOnly)
            // Ensure date fields are moment objects for DatePicker
            warrantyInfo: record.warrantyInfo ? moment(record.warrantyInfo) : null,
            purchaseDate: record.purchaseDate ? moment(record.purchaseDate) : null,
            comment: record.comment || '', // Only comment is editable
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
            const values = await statusChangeForm.validateFields(); // Validate only the editable fields (comment)

            const updatePayload = {
                status: targetStatus,
                comment: values.comment, // Always update comment from the form
            };

            // Remove damageDescription if it's not relevant to the new status
            // Assuming backend logic will clear or handle it if not provided for certain statuses
            if (assetForStatusChange.status === 'Damaged' && targetStatus !== 'Damaged') {
                 // Explicitly set to null/undefined if changing from Damaged status
                 // and the target status is not Damaged.
                 // This depends on your backend schema: is it optional or do you need to send null?
                updatePayload.damageDescription = null; // or undefined;
            }

            Modal.confirm({
                title: 'Confirm Status Change',
                content: `Are you sure you want to change the status of ${assetForStatusChange.model} (${assetForStatusChange.serialNumber}) to '${targetStatus}'?`,
                okText: `Yes, ${targetStatus === 'In Stock' ? 'Returned' : 'Confirm'}`,
                cancelText: 'No',
                onOk: async () => {
                    try {
                        console.log('Sending update payload:', updatePayload); // Debugging payload
                        const response = await axios.put(`http://localhost:5000/api/equipment/${assetForStatusChange._id}`, updatePayload, { headers: getAuthHeader() });
                        console.log('API Response:', response.data); // Debugging response
                        message.success(`Asset successfully moved to '${targetStatus}'!`);
                        setIsStatusChangeModalVisible(false);
                        statusChangeForm.resetFields();
                        fetchInUseAssets(); // Re-fetch data
                    } catch (error) {
                        console.error(`Failed to update asset status to ${targetStatus}:`, error.response ? error.response.data : error.message);
                        message.error(`Failed to update asset status to '${targetStatus}'. Please check backend for details.`);
                    }
                },
                onCancel() {
                    console.log('Status change cancelled by user in confirmation.');
                },
            });
        } catch (errorInfo) { // Catch validation errors specifically
            console.warn('Status change form validation failed:', errorInfo);
            // message.error('Please fill in required fields.'); // This is now handled by AntD's inline validation messages
        }
    };


    const columns = [
        {
            title: 'Sl No',
            key: 'slno',
            render: (_, __, index) => index + 1,
            width: 70,
            fixed: 'left',
        },
        { title: 'Assignee', dataIndex: 'assigneeName', key: 'assigneeName' },
        { title: 'Model', dataIndex: 'model', key: 'model' },
        { title: 'Department', dataIndex: 'department', key: 'department' },
        { title: 'Email', dataIndex: 'employeeEmail', key: 'employeeEmail' },
        { title: 'Phone', dataIndex: 'phoneNumber', key: 'phoneNumber' },
        {
            title: 'Warranty Expiry',
            dataIndex: 'warrantyInfo',
            key: 'warrantyInfo',
            render: (date) => {
                if (!date) return 'N/A';
                const warrantyDate = moment(date);
                const isExpired = warrantyDate.isBefore(moment());
                const isExpiringSoon = warrantyDate.diff(moment(), 'days') <= 30 && !isExpired;

                if (isExpired) return <Tag color="error">Expired: {warrantyDate.format('DD MMM YYYY')}</Tag>;
                if (isExpiringSoon) return <Tag color="warning">Soon: {warrantyDate.format('DD MMM YYYY')}</Tag>;
                return warrantyDate.format('DD MMM YYYY');
            }
        },


        {
  title: 'Details',
  key: 'viewDetails',
  render: function (_, record) {
    return (
      <Button
        type="link"
        icon={<EyeOutlined style={{ color: 'blue', fontSize: '18px' }} />}
        onClick={function () {
          const group = groupedAssets.find(g => g._id === record.employeeEmail);
          setSelectedEmployeeAssets(group);
          setModalVisible(true);
        }}
      />
    );
  }
},


{
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="primary"
                        icon={<RollbackOutlined />}
                        style={{ backgroundColor: getStatusColor('In Stock'), borderColor: getStatusColor('In Stock') }}
                        onClick={() => openStatusChangeModal(record, 'In Stock')}
                    >
                        Return
                    </Button>

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
                        <Button
                            type="text"
                            icon={<MoreOutlined style={{ color: 'black', fontWeight: 'bold', fontSize: '18px' }} />}
                        />
                    </Dropdown>
                </Space>
            )
        }
    ];

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>In Use Equipment</Title>
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
                    filter: (isEditViewModalVisible || isStatusChangeModalVisible) ? 'blur(4px)' : 'none',
                    pointerEvents: (isEditViewModalVisible || isStatusChangeModalVisible) ? 'none' : 'auto',
                    userSelect: (isEditViewModalVisible || isStatusChangeModalVisible) ? 'none' : 'auto',
                    transition: 'filter 0.3s ease',
                }}
            >
                <Table
                    columns={columns}
                    dataSource={filteredData}
                    rowKey="_id"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 'max-content' }}
                />
            </div>

            {/* Edit/View Asset Modal */}
            <Modal
                title={isViewOnlyModal ? "Asset Details" : "Edit Asset"}
                open={isEditViewModalVisible}
                onCancel={handleCancelEditView}
                footer={isViewOnlyModal ? [<Button key="close" onClick={handleCancelEditView}>Close</Button>] : [
                    <Button key="back" onClick={handleCancelEditView}>Cancel</Button>,
                    <Button key="submit" type="primary" onClick={handleSaveEditView}>Save</Button>,
                ]}
                width={1000} // Increased width for more horizontal space
                centered
                // Removed max-height/overflowY from modal body to allow horizontal extension
                // styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
            >
                <Form form={editViewForm} layout="vertical">
                    <Row gutter={16}>
                        {/* Use span={8} for 3 columns per row, or span={6} for 4 columns if fields are short */}
                        <Col span={8}><Form.Item name="assetId" label="Asset ID"><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="category" label="Category" rules={[{ required: true }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="model" label="Model" rules={[{ required: true }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="serialNumber" label="Serial Number" rules={[{ required: false }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="assigneeName" label="Assignee Name" rules={[{ required: true }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="position" label="Position" rules={[{ required: true }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="employeeEmail" label="Email" rules={[{ required: true, type: 'email' }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="phoneNumber" label="Phone Number" rules={[{ required: true, pattern: /^\d{10}$/, message: 'Phone number must be exactly 10 digits' }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="department" label="Department" rules={[{ required: true }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="location" label="Location"><Input readOnly={isViewOnlyModal} /></Form.Item></Col> {/* Added Location */}
                        <Col span={8}><Form.Item name="purchaseDate" label="Purchase Date"><DatePicker style={{ width: '100%' }} disabled={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="warrantyInfo" label="Warranty Expiry" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}>
                            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                                <Select placeholder="Select Status" disabled={isViewOnlyModal}>
                                    <Option value="In Use">In Use</Option>
                                    <Option value="In Stock">In Stock</Option>
                                    <Option value="Damaged">Damaged</Option>
                                    <Option value="E-Waste">E-Waste</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        {/* damageDescription should only be present if current status is Damaged or selected to be damaged */}
                        {selectedAsset?.status === 'Damaged' || (editViewForm.getFieldValue('status') === 'Damaged' && !isViewOnlyModal) ? (
                            <Col span={24}> {/* Span 24 for full width damage description */}
                                <Form.Item name="damageDescription" label="Damage Description">
                                    <Input.TextArea rows={2} readOnly={isViewOnlyModal} />
                                </Form.Item>
                            </Col>
                        ) : null}

                        <Col span={24}><Form.Item name="comment" label="Comment"><Input.TextArea rows={2} readOnly={isViewOnlyModal} /></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>

            {/* Generic Status Change Modal (for Return, Damaged, E-Waste) */}
            <Modal
                title={targetStatus === 'In Stock' ? "Return Asset" : `Move to ${targetStatus}`}
                open={isStatusChangeModalVisible}
                onCancel={handleCancelStatusChange}
                footer={[
                    <Button key="cancel" onClick={handleCancelStatusChange}>Cancel</Button>,
                    <Button key="confirm" type="primary" onClick={handleConfirmStatusChange}>
                        {targetStatus === 'In Stock' ? "Returned" : "Confirm"}
                    </Button>,
                ]}
                width={1000} // Increased width for more horizontal space
                centered
                // Removed max-height/overflowY from modal body to allow horizontal extension
                // styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
            >
                {assetForStatusChange && (
                    <Form form={statusChangeForm} layout="vertical">
                        <Title level={5}>Personal Information</Title>
                        <Row gutter={16}>
                            {/* Personal Info - Using span={8} for 3 columns per row */}
                            <Col span={8}>
                                <Form.Item label="Assignee Name">
                                    <Input value={assetForStatusChange.assigneeName} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Position">
                                    <Input value={assetForStatusChange.position} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Email">
                                    <Input value={assetForStatusChange.employeeEmail} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Phone Number">
                                    <Input value={assetForStatusChange.phoneNumber} readOnly />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Title level={5} style={{ marginTop: 20 }}>Asset Information</Title>
                        <Row gutter={16}>
                            {/* Asset Info - Using span={8} for 3 columns per row */}
                            <Col span={8}>
                                <Form.Item label="Asset ID">
                                    <Input value={assetForStatusChange.assetId} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Category">
                                    <Input value={assetForStatusChange.category} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Model">
                                    <Input value={assetForStatusChange.model} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Serial Number">
                                    <Input value={assetForStatusChange.serialNumber} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Location">
                                    <Input value={assetForStatusChange.location} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Purchase Date">
                                    <Input value={assetForStatusChange.purchaseDate ? moment(assetForStatusChange.purchaseDate).format('YYYY-MM-DD') : 'N/A'} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Warranty Expiry">
                                    <Input value={assetForStatusChange.warrantyInfo ? moment(assetForStatusChange.warrantyInfo).format('YYYY-MM-DD') : 'N/A'} readOnly />
                                </Form.Item>
                            </Col>
                            {/* Only the comment field is editable */}
                            <Col span={24}> {/* Full width for comment */}
                                <Form.Item name="comment" label="Comments">
                                    <Input.TextArea rows={3} placeholder={`Add comments related to this status change (e.g., condition on return, reason for damage/e-waste).`} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                )}
            </Modal>

            <Modal
  title={`Assets assigned to ${selectedEmployeeAssets ? selectedEmployeeAssets._id : ''}`}
  open={modalVisible}
  onCancel={function () {
    setModalVisible(false);
    setSelectedEmployeeAssets(null);
  }}
  footer={[
    <Button
      key="close"
      onClick={function () {
        setModalVisible(false);
        setSelectedEmployeeAssets(null);
      }}
    >
      Close
    </Button>
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
          render: function (date) {
            return date ? moment(date).format('YYYY-MM-DD') : 'N/A';
          }
        },
        {
          title: 'Warranty Expiry',
          dataIndex: 'warrantyInfo',
          key: 'warrantyInfo',
          render: function (date) {
            return date ? moment(date).format('YYYY-MM-DD') : 'N/A';
          }
        }
      ]}
      size="small"
      scroll={{ x: 'max-content' }}
    />
  ) : (
    React.createElement('p', null, 'No assets found.')
  )}
</Modal>

        </>
    );
};

export default InUse;