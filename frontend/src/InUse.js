import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
    Table, Tag, Typography, Modal, Button, Space, Form, Input, Select,
    DatePicker, Row, Col, message, Dropdown, Menu
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
    const [targetStatus, setTargetStatus] = useState(''); // 'In Stock', 'Damaged', 'E-Waste'
    const [statusChangeForm] = Form.useForm();

    const getAuthHeader = useCallback(() => {
        const token = localStorage.getItem('token');
        return token ? { 'x-auth-token': token } : {};
    }, []);

    const fetchInUseAssets = useCallback(async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/equipment', { headers: getAuthHeader() });
            const inUseAssets = response.data.filter(item => item.status === 'In Use');
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
            // Pre-fill all fields (will be readOnly)
            ...record,
            // Ensure date fields are moment objects for DatePicker (even if readOnly)
            warrantyInfo: record.warrantyInfo ? moment(record.warrantyInfo) : null,
            purchaseDate: record.purchaseDate ? moment(record.purchaseDate) : null,
            // Comment is editable, pre-fill with existing comment
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
        if (!assetForStatusChange?._id) {
            message.error("No asset selected for status change.");
            console.error("Error: assetForStatusChange._id is null or undefined.");
            return;
        }

        try {
            // Validate only the 'comment' field. If it's empty and should be required, AntD will show inline error.
            const values = await statusChangeForm.validateFields();
            const newComment = values.comment; // Get the potentially updated comment from the form

            const updatePayload = {
                status: targetStatus,
                comment: newComment, // Use the comment from the form
            };

            // If the asset was damaged and is now changing status, clear damageDescription on backend
            // assuming your backend clears this if it's not provided or null for non-damaged statuses.
            // If backend needs explicit null, include: damageDescription: null
            if (assetForStatusChange.status === 'Damaged' && targetStatus !== 'Damaged') {
                updatePayload.damageDescription = null; // Explicitly clear if moving from Damaged
            }


            Modal.confirm({
                title: 'Confirm Status Change',
                content: `Are you sure you want to change the status of ${assetForStatusChange.model} (S/N: ${assetForStatusChange.serialNumber}) to '${targetStatus}'?`,
                okText: `Yes, ${targetStatus === 'In Stock' ? 'Returned' : 'Confirm'}`,
                cancelText: 'No',
                onOk: async () => {
                    console.log(`Attempting to update asset ${assetForStatusChange._id} to status: ${targetStatus} with comment: "${newComment}"`);
                    console.log('Update payload being sent:', updatePayload);

                    try {
                        const response = await axios.put(
                            `http://localhost:5000/api/equipment/${assetForStatusChange._id}`,
                            updatePayload,
                            { headers: getAuthHeader() }
                        );
                        console.log('API Response received:', response.data);
                        message.success(`Asset successfully moved to '${targetStatus}'!`);
                        setIsStatusChangeModalVisible(false);
                        statusChangeForm.resetFields();
                        fetchInUseAssets(); // Re-fetch data to update the table
                    } catch (error) {
                        console.error(`API Error updating asset status to ${targetStatus}:`, error.response ? error.response.data : error.message);
                        message.error(`Failed to update asset status to '${targetStatus}'. Check console for details.`);
                        // Optional: if error.response.data contains a user-friendly message, display that.
                        if (error.response && error.response.data && error.response.data.message) {
                            message.error(`Error: ${error.response.data.message}`);
                        }
                    }
                },
                onCancel() {
                    console.log('Status change confirmation cancelled by user.');
                },
            });
        } catch (errorInfo) {
            console.warn('Form validation failed or error during confirmation setup:', errorInfo);
            // Ant Design's Form.validateFields() will display inline errors, so no general message.error is needed here.
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
            render: (_, record) => (
                <Button
                    type="link"
                    icon={<EyeOutlined style={{ color: 'blue', fontSize: '18px' }} />}
                    onClick={() => handleViewDetails(record)}
                />
            )
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
                        onClick={() => openStatusChangeModal(record, 'In Stock')} // Trigger Return flow
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
                width={1000} // Increased width
                centered
                // Removed explicit body styling for scrollbars
            >
                <Form form={editViewForm} layout="vertical">
                    <Row gutter={16}>
                        {/* Fields arranged to be wider */}
                        <Col span={8}><Form.Item name="assetId" label="Asset ID"><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="category" label="Category" rules={[{ required: true }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="model" label="Model" rules={[{ required: true }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="serialNumber" label="Serial Number" rules={[{ required: true }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="assigneeName" label="Assignee Name" rules={[{ required: true }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="position" label="Position" rules={[{ required: true }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="employeeEmail" label="Email" rules={[{ required: true, type: 'email' }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="phoneNumber" label="Phone Number" rules={[{ required: true, pattern: /^\d{10}$/, message: 'Phone number must be exactly 10 digits' }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="department" label="Department" rules={[{ required: true }]}><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="location" label="Location"><Input readOnly={isViewOnlyModal} /></Form.Item></Col>
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
                        {/* damageDescription is part of the original data, but might be cleared if status changes */}
                        {selectedAsset?.status === 'Damaged' || (editViewForm.getFieldValue('status') === 'Damaged' && !isViewOnlyModal) ? (
                            <Col span={24}>
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
                width={1000} // Increased width
                centered
                // Removed explicit body styling for scrollbars
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
                            {/* Only the comment field is editable, damageDescription is now removed */}
                            <Col span={24}>
                                <Form.Item name="comment" label="Comments">
                                    <Input.TextArea rows={3} placeholder={`Add comments related to this status change (e.g., condition on return, reason for ${targetStatus.toLowerCase()}).`} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                )}
            </Modal>
        </>
    );
};

export default InUse;