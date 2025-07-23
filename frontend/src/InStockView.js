import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
    Table, Tag, Typography, Modal, Button, Space, Form, Input, Select,
    DatePicker, Row, Col, message, Dropdown, Menu
} from 'antd';
import {
    MoreOutlined, EditOutlined, EyeOutlined, // DeleteOutlined (if needed elsewhere)
    WarningOutlined as DamagedIcon, DeleteOutlined as EWasteIcon, // Re-aliasing for visual icons
    ToolOutlined as AssignIcon
} from '@ant-design/icons';
import moment from 'moment';
import PageShell from './PageShell';

const { Text, Title } = Typography;
const { Option } = Select;

// Helper for status colors (consistent across the app)
const getStatusColor = (status) => {
    const colors = {
        'In Use': '#7ED321', // Green
        'In Stock': '#FA8C16', // Orange
        'Damaged': '#D0021B', // Red
        'E-Waste': '#8B572A'  // Brown
    };
    return colors[status] || 'default';
};

const renderWarrantyTag = (date) => {
    if (!date) return <Text disabled>N/A</Text>;
    const warrantyDate = moment(date);
    if (!warrantyDate.isValid()) return <Text disabled>Invalid Date</Text>;
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

const InStockView = ({ user }) => {
    // --- States for Assign Modal ---
    const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
    const [assetToAssign, setAssetToAssign] = useState(null);
    const [assignForm] = Form.useForm();

    // --- States for View Details / Edit Modal (consistent with InUse) ---
    const [isEditViewModalVisible, setIsEditViewModalVisible] = useState(false);
    const [assetForEditView, setAssetForEditView] = useState(null);
    const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
    const [editViewForm] = Form.useForm();

    // --- States for Generic Status Change Modals (Damaged, E-Waste - consistent with InUse) ---
    const [isStatusChangeModalVisible, setIsStatusChangeModalVisible] = useState(false);
    const [assetForStatusChange, setAssetForStatusChange] = useState(null);
    const [targetStatus, setTargetStatus] = useState('');
    const [statusChangeForm] = Form.useForm();

    const getAuthHeader = useCallback(() => {
        const token = localStorage.getItem('token');
        return token ? { 'x-auth-token': token } : {};
    }, []);

    // --- Data Refresh Callback for PageShell ---
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const forcePageShellRefresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    // --- Assign Modal Handlers ---
    const handleAssignClick = (record) => {
        setAssetToAssign(record);
        assignForm.resetFields();
        assignForm.setFieldsValue({
            assigneeName: record.assigneeName || '',
            position: record.position || '',
            employeeEmail: record.employeeEmail || '',
            phoneNumber: record.phoneNumber || '',
            department: record.department || '',
            comment: record.comment || '',
        });
        setIsAssignModalVisible(true);
    };

    const handleAssignSubmit = async () => {
        if (!assetToAssign?._id) {
            message.error("No asset selected for assignment. Please re-select the asset.");
            console.error("Error: assetToAssign._id is null or undefined when attempting assignment.");
            return;
        }
        try {
            const values = await assignForm.validateFields();
            const updatePayload = {
                assigneeName: values.assigneeName,
                position: values.position,
                employeeEmail: values.employeeEmail,
                phoneNumber: values.phoneNumber,
                department: values.department,
                comment: values.comment,
                status: 'In Use',
            };

            Modal.confirm({
                title: 'Confirm Assignment',
                content: `Are you sure you want to assign ${assetToAssign.model} (S/N: ${assetToAssign.serialNumber}) to ${values.assigneeName}?`,
                okText: 'Yes, Assign',
                cancelText: 'No',
                onOk: async () => {
                    console.log('Assigning asset with payload:', updatePayload);
                    try {
                        const response = await axios.put(
                            `http://localhost:5000/api/equipment/${assetToAssign._id}`,
                            updatePayload,
                            { headers: getAuthHeader() }
                        );
                        console.log('API Response:', response.data);
                        message.success('Asset assigned successfully!');
                        setIsAssignModalVisible(false);
                        assignForm.resetFields();
                        forcePageShellRefresh();
                    } catch (error) {
                        console.error('Failed to assign asset:', error.response ? error.response.data : error.message);
                        message.error('Assignment failed. Please check the details and backend logs.');
                        if (error.response && error.response.data && error.response.data.message) {
                            message.error(`Server Error: ${error.response.data.message}`);
                        }
                    }
                },
                onCancel() {
                    console.log('Assignment cancelled by user in confirmation.');
                },
            });
        } catch (errorInfo) {
            console.warn('Assignment form validation failed:', errorInfo);
        }
    };

    const handleCancelAssign = () => {
        setIsAssignModalVisible(false);
        setAssetToAssign(null);
        assignForm.resetFields();
    };

    // --- Edit/View Details Modal Handlers (Consolidated) ---
    const handleViewDetails = (record) => {
        setAssetForEditView(record);
        editViewForm.setFieldsValue({
            ...record,
            warrantyInfo: record.warrantyInfo ? moment(record.warrantyInfo) : null,
            purchaseDate: record.purchaseDate ? moment(record.purchaseDate) : null,
        });
        setIsViewOnlyMode(true);
        setIsEditViewModalVisible(true);
    };

    const handleEditFullAsset = (record) => {
        setAssetForEditView(record);
        editViewForm.setFieldsValue({
            ...record,
            warrantyInfo: record.warrantyInfo ? moment(record.warrantyInfo) : null,
            purchaseDate: record.purchaseDate ? moment(record.purchaseDate) : null,
        });
        setIsViewOnlyMode(false);
        setIsEditViewModalVisible(true);
    };

    const handleSaveEditView = async () => {
        if (!assetForEditView?._id) {
            message.error("No asset selected for editing. Please re-select the asset.");
            console.error("Error: assetForEditView._id is null or undefined when attempting save.");
            return;
        }
        try {
            const values = await editViewForm.validateFields();
            const updatedAsset = {
                ...values,
                warrantyInfo: values.warrantyInfo ? values.warrantyInfo.format('YYYY-MM-DD') : null,
                purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : null,
            };
            console.log('Updating asset with payload:', updatedAsset);
            const response = await axios.put(`http://localhost:5000/api/equipment/${assetForEditView._id}`, updatedAsset, { headers: getAuthHeader() });
            console.log('API Response:', response.data);
            message.success('Asset updated successfully!');
            setIsEditViewModalVisible(false);
            editViewForm.resetFields();
            forcePageShellRefresh();
        } catch (error) {
            console.error('Failed to update asset:', error.response ? error.response.data : error.message);
            message.error('Failed to update asset.');
            if (error.response && error.response.data && error.response.data.message) {
                message.error(`Server Error: ${error.response.data.message}`);
            }
        }
    };

    const handleCancelEditView = () => {
        setIsEditViewModalVisible(false);
        setAssetForEditView(null);
        setIsViewOnlyMode(false);
        editViewForm.resetFields();
    };

    // --- Delete Asset Handler ---
    // This function is currently not triggered from UI anymore as Delete is not in the dropdown
    const handleDeleteAsset = async (recordId) => {
        Modal.confirm({
            title: 'Confirm Delete',
            content: 'Are you sure you want to delete this asset? This action cannot be undone.',
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'No',
            onOk: async () => {
                console.log(`Attempting to delete asset with ID: ${recordId}`);
                try {
                    await axios.delete(`http://localhost:5000/api/equipment/${recordId}`, { headers: getAuthHeader() });
                    message.success('Asset deleted successfully!');
                    forcePageShellRefresh();
                } catch (error) {
                    console.error('Failed to delete asset:', error.response ? error.response.data : error.message);
                    message.error('Failed to delete asset. Please check backend logs.');
                    if (error.response && error.response.data && error.response.data.message) {
                        message.error(`Server Error: ${error.response.data.message}`);
                    }
                }
            },
            onCancel() {
                console.log('Delete cancelled by user.');
            },
        });
    };


    // --- Generic Status Change Modal Handlers ---
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
        if (!assetForStatusChange?._id) {
            message.error("No asset selected for status change. Please re-select the asset.");
            console.error("Error: assetForStatusChange._id is null or undefined.");
            return;
        }

        try {
            const values = await statusChangeForm.validateFields();
            const newComment = values.comment;

            const updatePayload = {
                status: targetStatus,
                comment: newComment,
            };

            if (assetForStatusChange.status === 'Damaged' && targetStatus !== 'Damaged') {
                updatePayload.damageDescription = null;
            }

            Modal.confirm({
                title: 'Confirm Status Change',
                content: `Are you sure you want to change the status of ${assetForStatusChange.model} (S/N: ${assetForStatusChange.serialNumber}) to '${targetStatus}'?`,
                okText: `Yes, Confirm`,
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
                        forcePageShellRefresh();
                    } catch (error) {
                        console.error(`API Error updating asset status to ${targetStatus}:`, error.response ? error.response.data : error.message);
                        message.error(`Failed to update asset status to '${targetStatus}'. Check console for details.`);
                        if (error.response && error.response.data && error.response.data.message) {
                            message.error(`Server Error: ${error.response.data.message}`);
                        }
                    }
                },
                onCancel() {
                    console.log('Status change confirmation cancelled by user.');
                },
            });
        } catch (errorInfo) {
            console.warn('Form validation failed or error during confirmation setup:', errorInfo);
        }
    };


    const inStockColumns = [
        {
            // Re-added Sl No here, as it appears in the screenshot.
            // If it's duplicated, check PageShell for its Sl No handling.
            title: 'Sl No',
            key: 'slno',
            render: (_, __, index) => index + 1,
            width: 70,
            fixed: 'left',
        },
        { title: 'Model', dataIndex: 'model', key: 'model' },
        { title: 'Category', dataIndex: 'category', key: 'category' },
        { title: 'Serial Number', dataIndex: 'serialNumber', key: 'serialNumber' },
        { title: 'Location', dataIndex: 'location', key: 'location' },
        {
            title: 'Warranty Expiry',
            dataIndex: 'warrantyInfo',
            key: 'warrantyInfo',
            render: renderWarrantyTag,
        },
        {
            title: 'Actions', // The single Actions column
            key: 'actions',
            render: (text, record) => (
                <Space size="middle">
                    {/* Assign Button */}
                    <Button
                        type="primary"
                        icon={<AssignIcon />}
                        style={{ backgroundColor: getStatusColor('In Use'), borderColor: getStatusColor('In Use') }}
                        onClick={() => handleAssignClick(record)}
                    >
                        Assign
                    </Button>

                    {/* Eye Icon (View Details) */}
                    <Button
                        type="link"
                        icon={<EyeOutlined style={{ color: 'blue', fontSize: '18px' }} />}
                        onClick={() => handleViewDetails(record)}
                        title="View Details"
                    />

                    {/* The 3 dots Dropdown */}
                    <Dropdown
                        overlay={
                            <Menu>
                                <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => handleEditFullAsset(record)}>
                                    Edit
                                </Menu.Item>
                                <Menu.Item key="move-damaged" icon={<DamagedIcon />} onClick={() => openStatusChangeModal(record, 'Damaged')}>
                                    Move to Damaged
                                </Menu.Item>
                                <Menu.Item key="move-ewaste" icon={<EWasteIcon />} onClick={() => openStatusChangeModal(record, 'E-Waste')}>
                                    Move to E-Waste
                                </Menu.Item>
                                {/* Removed Delete from this dropdown based on previous request for now */}
                                {/* If you need Delete back, add:
                                <Menu.Divider />
                                <Menu.Item key="delete" icon={<DeleteOutlined />} danger onClick={() => handleDeleteAsset(record._id)}>
                                    Delete
                                </Menu.Item>
                                */}
                            </Menu>
                        }
                        trigger={['click']}
                        placement="bottomRight"
                    >
                        <Button type="text" icon={<MoreOutlined style={{ fontSize: '20px' }} />} />
                    </Dropdown>
                </Space>
            ),
        },
    ];

    return (
        <>
            {/* The main table and search are handled by PageShell */}
            <PageShell
                pageTitle="In-Stock Equipment"
                apiEndpoint="http://localhost:5000/api/equipment"
                tableColumns={inStockColumns}
                user={user}
                initialFilters={{ status: 'In Stock' }}
                hideFilters={['status']}
                refreshTrigger={refreshTrigger}
            />

            {/* Assign Modal */}
            <Modal
                title={`Assign: ${assetToAssign?.model || ''}`}
                open={isAssignModalVisible}
                onOk={handleAssignSubmit}
                onCancel={handleCancelAssign}
                okText="Assign"
                destroyOnClose
                width={1000}
                centered
            >
                <Form layout="vertical" form={assignForm}>
                    <Title level={5}>Assignee Details</Title>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="assigneeName" label="Assignee Name" rules={[{ required: true, message: 'Please enter assignee name!' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="position" label="Position" rules={[{ required: true, message: 'Please enter position!' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="employeeEmail" label="Employee Email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email!' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="phoneNumber" label="Phone Number" rules={[{ required: true, pattern: /^\d{10}$/, message: 'Phone number must be exactly 10 digits!' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="department" label="Department" rules={[{ required: true, message: 'Please enter department!' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name="comment" label="Comments (Optional)">
                                <Input.TextArea rows={2} placeholder="Add any comments related to this assignment." />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* Edit/View Asset Modal (Consolidated) */}
            <Modal
                title={isViewOnlyMode ? "Asset Details" : "Edit Asset"}
                open={isEditViewModalVisible}
                onCancel={handleCancelEditView}
                footer={isViewOnlyMode ? [<Button key="close" onClick={handleCancelEditView}>Close</Button>] : [
                    <Button key="back" onClick={handleCancelEditView}>Cancel</Button>,
                    <Button key="submit" type="primary" onClick={handleSaveEditView}>Save</Button>,
                ]}
                width={1000}
                centered
            >
                {assetForEditView && (
                    <Form form={editViewForm} layout="vertical">
                        <Row gutter={16}>
                            {/* Form fields for full asset details */}
                            <Col span={8}><Form.Item name="assetId" label="Asset ID" rules={[{ required: true }]}><Input readOnly={isViewOnlyMode} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="category" label="Category" rules={[{ required: true }]}><Input readOnly={isViewOnlyMode} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="model" label="Model" rules={[{ required: true }]}><Input readOnly={isViewOnlyMode} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="serialNumber" label="Serial Number" rules={[{ required: true }]}><Input readOnly={isViewOnlyMode} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="assigneeName" label="Assignee Name"><Input readOnly={isViewOnlyMode} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="position" label="Position"><Input readOnly={isViewOnlyMode} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="employeeEmail" label="Email"><Input readOnly={isViewOnlyMode} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="phoneNumber" label="Phone Number"><Input readOnly={isViewOnlyMode} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="department" label="Department"><Input readOnly={isViewOnlyMode} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="location" label="Location" rules={[{ required: true }]}><Input readOnly={isViewOnlyMode} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="purchaseDate" label="Purchase Date"><DatePicker style={{ width: '100%' }} disabled={isViewOnlyMode} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="warrantyInfo" label="Warranty Expiry" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} disabled={isViewOnlyMode} /></Form.Item></Col>
                            <Col span={8}>
                                <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                                    <Select placeholder="Select Status" disabled={isViewOnlyMode}>
                                        <Option value="In Use">In Use</Option>
                                        <Option value="In Stock">In Stock</Option>
                                        <Option value="Damaged">Damaged</Option>
                                        <Option value="E-Waste">E-Waste</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            {assetForEditView.status === 'Damaged' && !isViewOnlyMode ? (
                                <Col span={24}>
                                    <Form.Item name="damageDescription" label="Damage Description">
                                        <Input.TextArea rows={2} readOnly={isViewOnlyMode} />
                                    </Form.Item>
                                </Col>
                            ) : null}
                            <Col span={24}><Form.Item name="comment" label="Comment"><Input.TextArea rows={2} readOnly={isViewOnlyMode} /></Form.Item></Col>
                        </Row>
                    </Form>
                )}
            </Modal>


            {/* Generic Status Change Modal (Damaged, E-Waste) */}
            <Modal
                title={`Move to ${targetStatus}`}
                open={isStatusChangeModalVisible}
                onCancel={handleCancelStatusChange}
                footer={[
                    <Button key="cancel" onClick={handleCancelStatusChange}>Cancel</Button>,
                    <Button key="confirm" type="primary" onClick={handleConfirmStatusChange}>Confirm</Button>,
                ]}
                width={1000}
                centered
            >
                {assetForStatusChange && (
                    <Form form={statusChangeForm} layout="vertical">
                        <Title level={5}>Personal Information</Title>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item label="Assignee Name">
                                    <Input value={assetForStatusChange.assigneeName || 'N/A'} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Position">
                                    <Input value={assetForStatusChange.position || 'N/A'} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Email">
                                    <Input value={assetForStatusChange.employeeEmail || 'N/A'} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Phone Number">
                                    <Input value={assetForStatusChange.phoneNumber || 'N/A'} readOnly />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Title level={5} style={{ marginTop: 20 }}>Asset Information</Title>
                        <Row gutter={16}>
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
                                    <Input value={assetForStatusChange.location || 'N/A'} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Purchase Date">
                                    <Input value={assetForStatusChange.purchaseDate ? moment(assetForStatusChange.purchaseDate).format('YYYY-MM-DD') : 'N/A'} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Warranty Expiry">
                                    <Input value={assetForStatusChange.warrantyInfo ? moment(assetForStatusChange.warrantyInfo).format('DD MMM YYYY') : 'N/A'} readOnly />
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item name="comment" label="Comments">
                                    <Input.TextArea rows={3} placeholder={`Add comments related to moving to ${targetStatus.toLowerCase()}.`} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                )}
            </Modal>
        </>
    );
};

export default InStockView;