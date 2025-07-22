import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Table, Tag, Typography, Modal, Button, Space, Form, Input, Select,
    DatePicker, Row, Col, message
} from 'antd';
import { MoreOutlined, SearchOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;

const InUse = () => {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        return token ? { 'x-auth-token': token } : {};
    };

    const fetchInUseAssets = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/equipment', { headers: getAuthHeader() });
            const inUseAssets = response.data.filter(item => item.status === 'In Use');
            setData(inUseAssets);
            setFilteredData(inUseAssets);
        } catch (error) {
            console.error('Error fetching In Use assets:', error);
            message.error('Failed to fetch assets.');
        }
    };

    useEffect(() => {
        fetchInUseAssets();
    }, []);

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

    const handleEdit = (record) => {
        setSelectedAsset(record);
        form.setFieldsValue({
            ...record,
            warrantyInfo: record.warrantyInfo ? moment(record.warrantyInfo) : null,
        });
        setIsModalVisible(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            const updatedAsset = {
                ...values,
                warrantyInfo: values.warrantyInfo ? values.warrantyInfo.format('YYYY-MM-DD') : null,
            };
            await axios.put(`http://localhost:5000/api/equipment/${selectedAsset._id}`, updatedAsset, { headers: getAuthHeader() });
            message.success('Asset updated successfully.');
            setIsModalVisible(false);
            fetchInUseAssets();
        } catch (error) {
            console.error('Failed to update asset:', error);
            message.error('Failed to update asset.');
        }
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
    };

    const columns = [
        {
            title: 'Sl No',
            key: 'slno',
            render: (_, __, index) => index + 1,
            width: 70,
        },
         { title: 'Assignee', dataIndex: 'assigneeName', key: 'assigneeName' },
         
         { title: 'Position', dataIndex: 'position', key: 'position' },
        { title: 'Model', dataIndex: 'model', key: 'model' },
        { title: 'Serial Number', dataIndex: 'serialNumber', key: 'serialNumber' },
       { title: 'Category', dataIndex: 'category', key: 'category' },
        
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
                const isExpiringSoon = warrantyDate.diff(moment(), 'days') <= 30;

                if (isExpired) return <Tag color="red">Expired: {warrantyDate.format('DD MMM YYYY')}</Tag>;
                if (isExpiringSoon) return <Tag color="orange">Soon: {warrantyDate.format('DD MMM YYYY')}</Tag>;
                return warrantyDate.format('DD MMM YYYY');
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        icon={<MoreOutlined style={{ color: 'black', fontWeight: 'bold', fontSize: '18px' }} />}
                        onClick={() => handleEdit(record)}
                    />
                </Space>
            )
        }
    ];

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>In Use Equipment</Title>
                <Input
                    placeholder="Search ..."
                    prefix={<SearchOutlined />}
                    value={searchTerm}
                    onChange={handleSearch}
                    style={{ width: 200 }}
                    allowClear
                />
            </div>

            <div
                style={{
                    filter: isModalVisible ? 'blur(4px)' : 'none',
                    pointerEvents: isModalVisible ? 'none' : 'auto',
                    userSelect: isModalVisible ? 'none' : 'auto',
                    transition: 'filter 0.3s ease',
                }}
            >
                <Table
                    columns={columns}
                    dataSource={filteredData}
                    rowKey="_id"
                    pagination={{ pageSize: 10 }}
                />
            </div>

            <Modal
                title="Edit Asset"
                open={isModalVisible}
                onCancel={handleCancel}
                onOk={handleSave}
                width={800}
            >
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="category" label="Category" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="model" label="Model" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="serialNumber" label="Serial Number" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="assigneeName" label="Assignee Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="position" label="Position" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="employeeEmail" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="phoneNumber" label="Phone Number" rules={[{ required: true, pattern: /^\d{10}$/, message: 'Phone number must be exactly 10 digits' }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="department" label="Department" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="warrantyInfo" label="Warranty Expiry" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="status" label="Status" rules={[{ required: true }]}><Select placeholder="Select Status">
                            <Option value="Products">Products</Option>
                            <Option value="E-waste">E-waste</Option>
                            <Option value="Damaged">Damaged</Option>
                            <Option value="In Stock">In Stock</Option>
                            <Option value="In Use">In Use</Option>
                        </Select></Form.Item></Col>
                        <Col span={24}><Form.Item name="comment" label="Comment"><Input.TextArea rows={2} /></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>
        </>
    );
};

export default InUse;
