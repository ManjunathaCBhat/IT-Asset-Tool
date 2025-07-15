import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Table, Button, Modal, Tag, message, Card, Dropdown,
    Typography, Space, Popconfirm, Input, Form, Row, Col,
    Select, DatePicker, Popover, Badge
} from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, MoreOutlined, FilterOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

// --- Reusable Helper Functions ---
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'x-auth-token': token } : {};
};

const getStatusColor = (status) => {
    const colors = { 'In Use': 'success', 'In Stock': 'blue', 'Damaged': 'warning', 'E-Waste': 'red' };
    return colors[status] || 'default';
};

// --- Style Injector ---
const TableStyleInjector = () => {
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
          .custom-table .ant-table-thead > tr > th {
            font-weight: 600;
            background-color: #fafafa;
            color: #333;
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

const EMPTY_OBJECT = {};
const EMPTY_ARRAY = [];

// --- The Main Reusable Component ---
const PageShell = ({
    pageTitle,
    apiEndpoint,
    tableColumns,
    user,
    setExpiringItems,
    initialFilters = EMPTY_OBJECT,
    hideFilters = EMPTY_ARRAY
}) => {
    // --- State Management ---
    const [allData, setAllData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [userFilters, setUserFilters] = useState({});
    const [popoverVisible, setPopoverVisible] = useState(false);
    
    // --- EDIT 1: Add state to manage pagination ---
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        showSizeChanger: true,
    });

    const [editForm] = Form.useForm();
    const [filterForm] = Form.useForm();

    // --- Data Fetching (unchanged) ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(apiEndpoint, { headers: getAuthHeader() });
            const data = response.data;
            setAllData(data);

            if (setExpiringItems) {
                const thirtyDaysFromNow = moment().add(30, 'days');
                const alerts = data.filter(item => {
                    if (!item.warrantyInfo) return false;
                    const warrantyDate = moment(item.warrantyInfo, 'YYYY-MM-DD');
                    return warrantyDate.isValid() && warrantyDate.isBefore(thirtyDaysFromNow);
                });
                setExpiringItems(alerts);
            }
        } catch (error) {
            console.error(`Error fetching data from ${apiEndpoint}:`, error);
            message.error('Failed to fetch data. Your session might have expired.');
        } finally {
            setLoading(false);
        }
    }, [apiEndpoint, setExpiringItems]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    // --- Filtering Logic (unchanged) ---
    useEffect(() => {
        let data = [...allData];
        const combinedFilters = { ...initialFilters, ...userFilters };

        Object.entries(combinedFilters).forEach(([key, value]) => {
            if (!value) return;

            if (key === 'warrantyRange') {
                const [start, end] = value;
                data = data.filter(item => {
                    if (!item.warrantyInfo) return false;
                    const warrantyDate = moment(item.warrantyInfo, 'YYYY-MM-DD');
                    return warrantyDate.isBetween(start, end, 'day', '[]');
                });
            } else {
                data = data.filter(item => item[key] === value);
            }
        });

        if (searchText) {
            const lowercasedValue = searchText.toLowerCase();
            data = data.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(lowercasedValue)
                )
            );
        }

        setFilteredData(data);
    }, [searchText, userFilters, allData, initialFilters]);


    // --- Modal and Action Handlers (unchanged) ---
    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://localhost:5000/api/equipment/${id}`, { headers: getAuthHeader() });
            message.success('Equipment deleted successfully');
            fetchData();
        } catch (error) {
            message.error('Failed to delete equipment.');
        }
    };

    const handleEditClick = (record) => {
        setSelectedItem(record);
        const formData = {
            ...record,
            warrantyInfo: record.warrantyInfo ? moment(record.warrantyInfo, 'YYYY-MM-DD') : null
        };
        editForm.setFieldsValue(formData);
        setIsEditModalOpen(true);
    };

    const handleEditSave = async () => {
        try {
            const values = await editForm.validateFields();
            const finalValues = {
                ...values,
                warrantyInfo: values.warrantyInfo ? values.warrantyInfo.format('YYYY-MM-DD') : null
            };
            await axios.put(`http://localhost:5000/api/equipment/${selectedItem._id}`, finalValues, { headers: getAuthHeader() });
            message.success('Equipment updated successfully!');
            setIsEditModalOpen(false);
            fetchData();
        } catch (error) {
            message.error('Failed to update equipment.');
        }
    };

    const showDetailsModal = (record) => {
        setSelectedItem(record);
        setIsDetailsModalOpen(true);
    };

    // --- EDIT 2: Add a handler for table changes (pagination, sorting, filtering) ---
    const handleTableChange = (paginationConfig) => {
        setPagination(paginationConfig);
    };

    // --- EDIT 3: Dynamically create the SI No. and Action columns ---
    const siNoColumn = {
        title: 'SI No',
        key: 'siNo',
        width: 80,
        render: (text, record, index) => {
            // Calculate the correct serial number based on page and page size
            return (pagination.current - 1) * pagination.pageSize + index + 1;
        },
    };

    const actionColumn = {
        title: 'Action',
        key: 'action',
        align: 'center',
        width: 120,
        render: (_, record) => {
            const menuItems = [{
                key: '1',
                label: 'View Details',
                icon: <EyeOutlined />,
                onClick: () => showDetailsModal(record)
            }];

            if (user.role === 'Admin' || user.role === 'Editor') {
                menuItems.push({
                    key: '2',
                    label: 'Edit',
                    icon: <EditOutlined />,
                    onClick: () => handleEditClick(record)
                });
            }

            return (
                <Space>
                    <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                        <Button type="text" icon={<MoreOutlined style={{ fontSize: '20px' }} />} />
                    </Dropdown>
                    {user.role === 'Admin' && (
                        <Popconfirm
                            title="Delete this asset?"
                            onConfirm={() => handleDelete(record._id)}
                            okText="Yes"
                            cancelText="No"
                            placement="topRight"
                        >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            );
        },
    };
    
    // Combine the dynamic SI No, the columns from props, and the dynamic Action column
    const finalColumns = [siNoColumn, ...tableColumns, actionColumn];


    // --- Filter Popover Content (unchanged) ---
    const handleApplyFilters = (values) => {
        setUserFilters(values);
        setPopoverVisible(false);
    };

    const handleClearFilters = () => {
        setUserFilters({});
        filterForm.resetFields();
        setPopoverVisible(false);
    };

    const uniqueCategories = [...new Set(allData.map(item => item.category))];
    const filterCount = Object.values(userFilters).filter(v => v && (!Array.isArray(v) || v.length > 0)).length;

    const filterContent = (
        <div style={{ width: 280, padding: 8 }}>
            <Form form={filterForm} layout="vertical" onFinish={handleApplyFilters}>
                {!hideFilters.includes('status') && (
                    <Form.Item name="status" label="Status">
                        <Select placeholder="Filter by status" allowClear>
                            <Option value="In Stock">In Stock</Option>
                            <Option value="In Use">In Use</Option>
                            <Option value="Damaged">Damaged</Option>
                            <Option value="E-Waste">E-Waste</Option>
                        </Select>
                    </Form.Item>
                )}
                {!hideFilters.includes('category') && (
                     <Form.Item name="category" label="Category">
                        <Select placeholder="Filter by category" allowClear>
                            {uniqueCategories.map(cat => <Option key={cat} value={cat}>{cat}</Option>)}
                        </Select>
                    </Form.Item>
                )}
                <Form.Item name="warrantyRange" label="Warranty Expiry Range">
                    <RangePicker style={{ width: '100%' }} />
                </Form.Item>
                <Space>
                    <Button type="primary" htmlType="submit">Apply</Button>
                    <Button onClick={handleClearFilters}>Clear</Button>
                </Space>
            </Form>
        </div>
    );


    // --- Modal Content Renderers (unchanged) ---
    const renderDetailsModalContent = () => {
        if (!selectedItem) return null;
        return (
            <div>
                <p><strong>Category:</strong> {selectedItem.category}</p>
                <p><strong>Model:</strong> {selectedItem.model}</p>
                <p><strong>Serial Number:</strong> {selectedItem.serialNumber}</p>
                <p><strong>Status:</strong> <Tag color={getStatusColor(selectedItem.status)}>{selectedItem.status?.toUpperCase()}</Tag></p>
                <p><strong>Location:</strong> {selectedItem.location}</p>
                <p><strong>Warranty Info:</strong> {selectedItem.warrantyInfo ? moment(selectedItem.warrantyInfo).format('DD MMM YYYY') : 'N/A'}</p>
                <p><strong>Comment:</strong> {selectedItem.comment}</p>
                {selectedItem.status === 'In Use' && (<><hr style={{margin: '12px 0'}}/><p><strong>Assignee:</strong> {selectedItem.assigneeName}</p><p><strong>Position:</strong> {selectedItem.position}</p><p><strong>Email:</strong> {selectedItem.employeeEmail}</p><p><strong>Phone Number:</strong> {selectedItem.phoneNumber}</p><p><strong>Department:</strong> {selectedItem.department}</p></>)}
                {selectedItem.status === 'Damaged' && (<><hr style={{margin: '12px 0'}}/><p><strong>Damage Description:</strong> {selectedItem.damageDescription}</p></>)}
            </div>
        );
    };

    // --- Main JSX ---
    return (
        <>
            <TableStyleInjector />
            <Card bordered={false}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <Title level={4} style={{ margin: 0 }}>{pageTitle}</Title>
                    <Space>
                        <Search
                            placeholder="Search..."
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 250 }}
                            allowClear
                        />
                        <Popover
                            content={filterContent}
                            title="Filter Options"
                            trigger="click"
                            open={popoverVisible}
                            onOpenChange={setPopoverVisible}
                            placement="bottomRight"
                        >
                            <Badge count={filterCount}>
                                <Button icon={<FilterOutlined />}>Filters</Button>
                            </Badge>
                        </Popover>
                    </Space>
                </div>
                <Table
                    className="custom-table"
                    columns={finalColumns}
                    dataSource={filteredData}
                    rowKey="_id"
                    loading={loading}
                    // --- EDIT 4: Control the pagination and listen for changes ---
                    pagination={pagination}
                    onChange={handleTableChange}
                />
            </Card>

            <Modal
                title="Equipment Details"
                open={isDetailsModalOpen}
                onCancel={() => setIsDetailsModalOpen(false)}
                footer={<Button onClick={() => setIsDetailsModalOpen(false)}>Close</Button>}
            >
                {renderDetailsModalContent()}
            </Modal>

            <Modal
                title="Edit Equipment"
                open={isEditModalOpen}
                onOk={handleEditSave}
                onCancel={() => setIsEditModalOpen(false)}
                width={800}
                destroyOnClose
            >
                <Form form={editForm} layout="vertical" name="edit_form">
                     <Row gutter={16}>
                        <Col span={12}><Form.Item name="category" label="Category" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="model" label="Model"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="serialNumber" label="Serial Number"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="location" label="Location"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="warrantyInfo" label="Warranty Expiry Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="status" label="Status" rules={[{ required: true }]}><Select><Option value="In Stock">In Stock</Option><Option value="In Use">In Use</Option><Option value="Damaged">Damaged</Option><Option value="E-Waste">E-Waste</Option></Select></Form.Item></Col>
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

export default PageShell;

