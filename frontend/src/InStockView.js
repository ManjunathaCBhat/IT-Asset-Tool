import React, { useState } from 'react';
import axios from 'axios';
import {
    Button, Modal, Form, Input, Row, Col, message, Space,
    Dropdown, Popconfirm, Tag, Typography
} from 'antd';
import { MoreOutlined, EditOutlined } from '@ant-design/icons';
import moment from 'moment';
import PageShell from './PageShell';

const { Text } = Typography;

// Helper function to get JWT token from localStorage
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'x-auth-token': token } : {};
};

// Helper function to render the warranty tag based on the date
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


const InStockView = ({ user }) => {
    // State for the "Assign" modal, kept local to this component
    const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [form] = Form.useForm();

    // Define the columns specific to the In-Stock view
    const inStockColumns = [
        { title: 'Category', dataIndex: 'category', key: 'category' },
        { title: 'Model', dataIndex: 'model', key: 'model' },
        { title: 'Warranty Expiry', dataIndex: 'warrantyInfo', key: 'warrantyInfo', render: renderWarrantyTag },
    ];

    // --- Custom Action Logic ---
    const handleAssignClick = (record) => {
        setSelectedEquipment(record);
        form.resetFields();
        setIsAssignModalVisible(true);
    };

    const handleAssignSubmit = async () => {
        try {
            const values = await form.validateFields();
            const updatedData = { ...values, status: "In Use" };
            await axios.put(`http://localhost:5000/api/equipment/${selectedEquipment._id}`, updatedData, { headers: getAuthHeader() });
            message.success('Asset assigned successfully!');
            setIsAssignModalVisible(false);
            // The table will be refreshed by the `fetchData` function passed from PageShell
        } catch (error) {
            message.error('Assignment failed. Please check the details.');
        }
    };

    const handleStatusChange = async (id, newStatus, fetchDataCallback) => {
        try {
            await axios.put(`http://localhost:5000/api/equipment/${id}`, { status: newStatus }, { headers: getAuthHeader() });
            message.success(`Moved to ${newStatus}`);
            if (fetchDataCallback) fetchDataCallback(); // Refresh the table
        } catch (err) {
            message.error(`Failed to update status to ${newStatus}`);
        }
    };

    // This function will be passed to PageShell to render the action column
    const renderInStockActions = (record, fetchDataCallback) => {
        const menuItems = [
            { key: 'assign', label: 'Assign', icon: <EditOutlined />, onClick: () => handleAssignClick(record) },
            {
                key: 'damage',
                label: (
                    <Popconfirm
                        title="Move this item to Damaged?"
                        onConfirm={() => handleStatusChange(record._id, 'Damaged', fetchDataCallback)}
                    >
                        <span>Move to Damaged</span>
                    </Popconfirm>
                ),
            },
            {
                key: 'ewaste',
                label: (
                    <Popconfirm
                        title="Move this item to E-Waste?"
                        onConfirm={() => handleStatusChange(record._id, 'E-Waste', fetchDataCallback)}
                    >
                        <span>Move to E-Waste</span>
                    </Popconfirm>
                ),
            },
        ];

        return (
            <Space>
                <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                    <Button type="text" icon={<MoreOutlined style={{ fontSize: '20px' }} />} />
                </Dropdown>
            </Space>
        );
    };

    return (
        <>
            <PageShell
                pageTitle="In-Stock Equipment"
                apiEndpoint="http://localhost:5000/api/equipment"
                tableColumns={inStockColumns}
                user={user}
                initialFilters={{ status: 'In Stock' }} // Pre-filter the data
                hideFilters={['status']} // Hide the status filter since it's redundant
                renderCustomActions={renderInStockActions} // Provide the custom actions
            />

            {/* Assign Modal - kept here as it's specific to this page */}
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
                        <Col span={12}><Form.Item name="assigneeName" label="Assignee Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="position" label="Position" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="employeeEmail" label="Employee Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="phoneNumber" label="Phone Number" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={24}><Form.Item name="department" label="Department" rules={[{ required: true }]}><Input /></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>
        </>
    );
};

export default InStockView;
