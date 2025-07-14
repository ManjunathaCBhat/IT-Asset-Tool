// src/MasterView.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Tag, message, Card, Dropdown, Typography, Space, Popconfirm, Input, Form, Row, Col, Select, DatePicker, Popover, Badge } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, MoreOutlined, FilterOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const TableStyleInjector = () => {
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
          .custom-table .ant-table-thead > tr > th {
            font-weight: 600;
            background-color: #fafafa;
          }
          .custom-table .ant-table-tbody > tr:hover > td {
            background-color: #e6f7ff !important;
          }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);
    return null;
};

const MasterView = ({ user, setExpiringItems }) => {
    const [equipment, setEquipment] = useState([]);
    const [filteredEquipment, setFilteredEquipment] = useState([]);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [filters, setFilters] = useState({});
    const [popoverVisible, setPopoverVisible] = useState(false);
    const [form] = Form.useForm();
    const [filterForm] = Form.useForm();

    const fetchEquipment = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/equipment');
            const data = response.data;
            setEquipment(data);
            setFilteredEquipment(data);

            const thirtyDaysFromNow = moment().add(30, 'days');
            const alerts = data.filter(item => {
                if (!item.warrantyInfo) return false;
                const warrantyDate = moment(item.warrantyInfo, 'YYYY-MM-DD');
                return warrantyDate.isValid() && warrantyDate.isBefore(thirtyDaysFromNow);
            });
            setExpiringItems(alerts);

        } catch (error) {
            console.error("Error fetching equipment:", error);
            if (error.response?.status === 401) {
                 message.error('Session expired. Please log in again.');
            } else {
                 message.error('Failed to fetch equipment data.');
            }
        }
    };

    useEffect(() => {
        fetchEquipment();
    }, []);

    useEffect(() => {
        let data = [...equipment];
        if (searchText) {
            const lowercasedValue = searchText.toLowerCase();
            data = data.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(lowercasedValue)));
        }
        if (filters.status) {
            data = data.filter(item => item.status === filters.status);
        }
        if (filters.category) {
            data = data.filter(item => item.category === filters.category);
        }
        if (filters.warrantyRange) {
            const [start, end] = filters.warrantyRange;
            data = data.filter(item => {
                if (!item.warrantyInfo) return false;
                const warrantyDate = moment(item.warrantyInfo, 'YYYY-MM-DD');
                return warrantyDate.isBetween(start, end, 'day', '[]');
            });
        }
        setFilteredEquipment(data);
    }, [searchText, filters, equipment]);

    const handleApplyFilters = (values) => {
        setFilters(values);
        setPopoverVisible(false);
    };

    const handleClearFilters = () => {
        setFilters({});
        filterForm.resetFields();
        setPopoverVisible(false);
    };

    const uniqueCategories = [...new Set(equipment.map(item => item.category))];
    const filterCount = Object.values(filters).filter(v => v && v.length > 0).length;

    const filterContent = (
        <div style={{ width: 280 }}>
            <Form form={filterForm} layout="vertical" onFinish={handleApplyFilters}>
                <Form.Item name="status" label="Status"><Select placeholder="Filter by status" allowClear><Option value="In Stock">In Stock</Option><Option value="In Use">In Use</Option><Option value="Damaged">Damaged</Option><Option value="E-Waste">E-Waste</Option></Select></Form.Item>
                <Form.Item name="category" label="Category"><Select placeholder="Filter by category" allowClear>{uniqueCategories.map(cat => <Option key={cat} value={cat}>{cat}</Option>)}</Select></Form.Item>
                <Form.Item name="warrantyRange" label="Warranty Expiry Range"><RangePicker style={{ width: '100%' }} /></Form.Item>
                <Space><Button type="primary" htmlType="submit">Apply</Button><Button onClick={handleClearFilters}>Clear</Button></Space>
            </Form>
        </div>
    );

    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://localhost:5000/api/equipment/${id}`);
            fetchEquipment();
            message.success('Equipment deleted successfully');
        } catch (error) { message.error('Failed to delete equipment.'); }
    };

    const handleEditClick = (record) => {
        setSelectedEquipment(record);
        const formData = { ...record, warrantyInfo: record.warrantyInfo ? moment(record.warrantyInfo, 'YYYY-MM-DD') : null };
        form.setFieldsValue(formData);
        setIsEditModalOpen(true);
    };

    const handleEditCancel = () => {
        setIsEditModalOpen(false);
        form.resetFields();
    };

    const handleEditSave = async () => {
        try {
            const values = await form.validateFields();
            const finalValues = { ...values, warrantyInfo: values.warrantyInfo ? values.warrantyInfo.format('YYYY-MM-DD') : null };
            await axios.put(`http://localhost:5000/api/equipment/${selectedEquipment._id}`, finalValues);
            message.success('Equipment updated successfully!');
            setIsEditModalOpen(false);
            fetchEquipment();
        } catch (error) { message.error('Failed to update equipment.'); }
    };

    const showDetailsModal = (record) => {
        setSelectedEquipment(record);
        setIsDetailsModalOpen(true);
    };

    const handleDetailsCancel = () => setIsDetailsModalOpen(false);

    const getStatusColor = (status) => {
        const colors = { 'In Use': 'success', 'In Stock': 'blue', 'Damaged': 'warning', 'E-Waste': 'red' };
        return colors[status] || 'default';
    };

    const columns = [
        { title: 'Asset ID', dataIndex: 'assetId', key: 'assetId' },
        { title: 'Category', dataIndex: 'category', key: 'category' },
        { title: 'Model', dataIndex: 'model', key: 'model' },
        { title: 'Warranty Expiry', dataIndex: 'warrantyInfo', key: 'warrantyInfo', render: (date) => {
            if (!date) return <Text disabled>N/A</Text>;
            const warrantyDate = moment(date, 'YYYY-MM-DD');
            if (!warrantyDate.isValid()) return <Text disabled>Invalid Date</Text>;
            const isExpired = warrantyDate.isBefore(moment());
            const isExpiringSoon = warrantyDate.isBefore(moment().add(30, 'days'));
            if (isExpired) return <Tag color="error">Expired: {warrantyDate.format('DD MMM YYYY')}</Tag>;
            if (isExpiringSoon) return <Tag color="warning">Expires: {warrantyDate.format('DD MMM YYYY')}</Tag>;
            return warrantyDate.format('DD MMM YYYY');
        }},
        { title: 'Status', dataIndex: 'status', key: 'status', render: (status) => <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag> },
        { title: 'Action', key: 'action', align: 'center', render: (_, record) => {
            const menuItems = [{ key: '1', label: 'View Details', icon: <EyeOutlined />, onClick: () => showDetailsModal(record) }];
            if (user.role === 'Admin' || user.role === 'Editor') {
                menuItems.push({ key: '2', label: 'Edit', icon: <EditOutlined />, onClick: () => handleEditClick(record) });
            }
            return (
                <Space>
                    <Dropdown menu={{ items: menuItems }} trigger={['click']}><Button type="text" icon={<MoreOutlined style={{ fontSize: '20px' }} />} /></Dropdown>
                    {user.role === 'Admin' && (<Popconfirm title="Delete this asset?" onConfirm={() => handleDelete(record._id)} okText="Yes" cancelText="No" placement="topRight"><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>)}
                </Space>
            );
        }},
    ];

    const renderModalContent = () => {
        if (!selectedEquipment) return null;
        return (
            <div>
                <p><strong>Asset ID:</strong> {selectedEquipment.assetId}</p>
                <p><strong>Category:</strong> {selectedEquipment.category}</p>
                <p><strong>Model:</strong> {selectedEquipment.model}</p>
                <p><strong>Serial Number:</strong> {selectedEquipment.serialNumber}</p>
                <p><strong>Status:</strong> <Tag color={getStatusColor(selectedEquipment.status)}>{selectedEquipment.status.toUpperCase()}</Tag></p>
                <p><strong>Location:</strong> {selectedEquipment.location}</p>
                <p><strong>Warranty Info:</strong> {selectedEquipment.warrantyInfo ? moment(selectedEquipment.warrantyInfo).format('DD MMM YYYY') : 'N/A'}</p>
                <p><strong>Comment:</strong> {selectedEquipment.comment}</p>
                {selectedEquipment.status === 'In Use' && (<><hr style={{margin: '12px 0'}}/><p><strong>Assignee:</strong> {selectedEquipment.assigneeName}</p><p><strong>Position:</strong> {selectedEquipment.position}</p><p><strong>Email:</strong> {selectedEquipment.employeeEmail}</p><p><strong>Phone Number:</strong> {selectedEquipment.phoneNumber}</p><p><strong>Department:</strong> {selectedEquipment.department}</p></>)}
                {selectedEquipment.status === 'Damaged' && (<><hr style={{margin: '12px 0'}}/><p><strong>Damage Description:</strong> {selectedEquipment.damageDescription}</p></>)}
            </div>
        );
    };

    return (
        <>
            <TableStyleInjector />
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <Title level={4} style={{ margin: 0 }}>Asset Inventory</Title>
                    <Space>
                        <Search placeholder="Search..." onChange={(e) => setSearchText(e.target.value)} style={{ width: 250 }} />
                        <Popover content={filterContent} title="Filter Options" trigger="click" open={popoverVisible} onOpenChange={setPopoverVisible} placement="bottomRight">
                            <Badge count={filterCount}><Button icon={<FilterOutlined />}>Filters</Button></Badge>
                        </Popover>
                    </Space>
                </div>
                <Table className="custom-table" columns={columns} dataSource={filteredEquipment} rowKey="_id" pagination={{ pageSize: 10 }} />
            </Card>
            <Modal title="Equipment Details" open={isDetailsModalOpen} onCancel={handleDetailsCancel} footer={<Button onClick={handleDetailsCancel}>Close</Button>}>{renderModalContent()}</Modal>
            <Modal title="Edit Equipment" open={isEditModalOpen} onOk={handleEditSave} onCancel={handleEditCancel} width={800}>
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="assetId" label="Asset ID"><Input disabled /></Form.Item></Col>
                        <Col span={12}><Form.Item name="category" label="Category"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="model" label="Model"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="serialNumber" label="Serial Number"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="location" label="Location"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="warrantyInfo" label="Warranty Expiry Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="status" label="Status"><Select><Option value="In Stock">In Stock</Option><Option value="In Use">In Use</Option><Option value="Damaged">Damaged</Option><Option value="E-Waste">E-Waste</Option></Select></Form.Item></Col>
                    </Row>
                    <Title level={5}>Assignee Details</Title>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="assigneeName" label="Assignee Name"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="position" label="Position"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="employeeEmail" label="Employee Email"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="phoneNumber" label="Phone Number"><Input /></Form.Item></Col>
                    </Row>
                    <Form.Item name="comment" label="Comment"><Input.TextArea rows={4} /></Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default MasterView;
