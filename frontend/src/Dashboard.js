import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, Col, Row, Statistic, Typography, Button, Spin, Alert, Table, Tag, Input, Space } from 'antd';
import {
    DatabaseOutlined, CheckCircleOutlined, ToolOutlined, WarningOutlined, DeleteOutlined,
    PlusOutlined, SearchOutlined, EditOutlined, EyeOutlined,
    // FIX: Ensure all used icons are imported here
    LaptopOutlined, DesktopOutlined, ApiOutlined, AudioOutlined,
    PrinterOutlined, WifiOutlined, MobileOutlined // <<< ADDED THESE MISSING IMPORTS
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;

// Helper for status colors (from your first snippet)
const getStatusColor = (status) => {
    const colors = { 'In Use': '#7ED321', 'In Stock': '#4A90E2', 'Damaged': '#D0021B', 'E-Waste': '#8B572A' };
    return colors[status] || 'default';
};

const getWarrantyTag = (date) => {
    if (!date) return <Text disabled>N/A</Text>;

    const warrantyDate = moment(date);
    if (!warrantyDate.isValid()) return <Text disabled>Invalid Date</Text>;

    const today = moment();
    const thirtyDaysFromNow = moment().add(30, 'days');

    if (warrantyDate.isBefore(today, 'day')) {
        return <Tag color="error">Expired: {warrantyDate.format('DD MMM YYYY')}</Tag>;
    }
    if (warrantyDate.isBefore(thirtyDaysFromNow, 'day')) {
        return <Tag color="warning">Expires: {warrantyDate.format('DD MMM YYYY')}</Tag>;
    }
    return warrantyDate.format('DD MMM YYYY');
};

// Helper for category icons (improved based on specific requests)
const getCategoryIcon = (category) => {
    switch (category.toLowerCase()) {
        case 'laptop': return <LaptopOutlined />;
        case 'monitor': return <DesktopOutlined />;
        case 'mouse': return <ApiOutlined />; // Specific for mouse
        case 'headphone': return <AudioOutlined />; // Specific for headphone
        case 'keyboard': return <ApiOutlined />; // Good for general accessories
        case 'printer': return <PrinterOutlined />;
        case 'router': return <WifiOutlined />;
        case 'server': return <DatabaseOutlined />; // General IT asset / database
        case 'access point': return <WifiOutlined />;
        case 'computer': return <DesktopOutlined />;
        case 'chromebook': return <LaptopOutlined />;
        case 'ipad': return <MobileOutlined />; // Use Mobile for tablet
        case 'mobile': return <MobileOutlined />;
        case 'cisco catos switch': return <WifiOutlined />; // Network gear
        case 'cisco router': return <WifiOutlined />; // Network gear
        case 'firewall': return <DatabaseOutlined />; // Generic IT asset
        case 'network services': return <WifiOutlined />;
        case 'rack': return <DatabaseOutlined />;
        default: return <DatabaseOutlined />; // Default icon
    }
};


const Dashboard = () => {
    const navigate = useNavigate();
    const [totalAssetsCount, setTotalAssetsCount] = useState(0); // For the single total assets card
    const [allAssets, setAllAssets] = useState([]); // Stores all fetched assets
    const [filteredAssets, setFilteredAssets] = useState([]); // Assets currently displayed in table based on status filter
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeFilter, setActiveFilter] = useState('All'); // For the top status filter buttons

    // For Ant Design Table Search
    const [searchText, setSearchText] = useState('');
    const [searchedColumn, setSearchedColumn] = useState('');
    const searchInput = useRef(null); // Ref for search input in table filters


    const getAuthHeader = useCallback(() => {
        const token = localStorage.getItem('token');
        return token ? { 'x-auth-token': token } : {};
    }, []);

    const fetchAllAssets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const assetsRes = await axios.get('http://localhost:5000/api/equipment', { headers: getAuthHeader() });
            const fetchedAssets = assetsRes.data;
            setAllAssets(fetchedAssets);
            setTotalAssetsCount(fetchedAssets.length); // Update total assets count
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
            setError('Failed to load dashboard data. Please check your network and backend server.');
        } finally {
            setLoading(false);
        }
    }, [getAuthHeader]);

    useEffect(() => {
        fetchAllAssets();
    }, [fetchAllAssets]);

    // Effect for filtering assets based on activeFilter (for the table)
    useEffect(() => {
        let currentFiltered = allAssets;

        if (activeFilter !== 'All') {
            currentFiltered = currentFiltered.filter(asset => asset.status === activeFilter);
        }
        setFilteredAssets(currentFiltered);
    }, [allAssets, activeFilter]);


    // --- Table Column Search Functionality (from your initial code) ---
    const handleSearch = (selectedKeys, confirm, dataIndex) => {
        confirm();
        setSearchText(selectedKeys[0]);
        setSearchedColumn(dataIndex);
    };

    const handleReset = (clearFilters) => {
        clearFilters();
        setSearchText('');
    };

    const getColumnSearchProps = (dataIndex) => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
            <div style={{ padding: 8 }}>
                <Input
                    ref={searchInput} // Associate ref here
                    placeholder={`Search ${dataIndex}`}
                    value={selectedKeys[0]}
                    onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
                    style={{ marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
                        icon={<SearchOutlined />}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Search
                    </Button>
                    <Button onClick={() => clearFilters && handleReset(clearFilters)} size="small" style={{ width: 90 }}>
                        Reset
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
        onFilter: (value, record) =>
            record[dataIndex] ? String(record[dataIndex]).toLowerCase().includes(value.toLowerCase()) : '',
        onFilterDropdownOpenChange: (visible) => {
            if (visible) { setTimeout(() => searchInput.current?.select(), 100); } // Use optional chaining
        },
        render: (text) =>
            searchedColumn === dataIndex ? (
                <Text mark>{text}</Text>
            ) : (
                text
            ),
    });

    // --- Table Columns Definition ---
    const dashboardTableColumns = [
        {
            title: 'SI No.',
            key: 'siNo',
            render: (text, record, index) => index + 1,
            width: 70,
            fixed: 'left',
        },
        {
            title: 'Asset ID',
            dataIndex: 'assetId',
            key: 'assetId',
            ...getColumnSearchProps('assetId'),
            sorter: (a, b) => a.assetId.localeCompare(b.assetId),
            width: 120,
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            ...getColumnSearchProps('category'),
            sorter: (a, b) => a.category.localeCompare(b.category),
            width: 150,
        },
        {
            title: 'Model',
            dataIndex: 'model',
            key: 'model',
            ...getColumnSearchProps('model'),
            sorter: (a, b) => (a.model || '').localeCompare(b.model || ''), // Handle nulls for sorting
            width: 180,
        },
        {
            title: 'Serial Number',
            dataIndex: 'serialNumber',
            key: 'serialNumber',
            ...getColumnSearchProps('serialNumber'),
            width: 150,
        },
        {
            title: 'Warranty Expiry',
            dataIndex: 'warrantyInfo',
            key: 'warrantyInfo',
            render: (date) => getWarrantyTag(date),
            sorter: (a, b) => {
                const dateA = moment(a.warrantyInfo);
                const dateB = moment(b.warrantyInfo);
                return (dateA.isValid() ? dateA.unix() : 0) - (dateB.isValid() ? dateB.unix() : 0);
            },
            width: 150,
        },
        {
            title: 'Location',
            dataIndex: 'location',
            key: 'location',
            ...getColumnSearchProps('location'),
            width: 150,
        },
        {
            title: 'Comments',
            dataIndex: 'comment',
            key: 'comment',
            ellipsis: true,
            width: 200,
        },
        {
            title: 'Assignee Name',
            dataIndex: 'assigneeName',
            key: 'assigneeName',
            ...getColumnSearchProps('assigneeName'),
            width: 150,
        },
        {
            title: 'Employee Email',
            dataIndex: 'employeeEmail',
            key: 'employeeEmail',
            ...getColumnSearchProps('employeeEmail'),
            width: 180,
        },
        {
            title: 'Department',
            dataIndex: 'department',
            key: 'department',
            ...getColumnSearchProps('department'),
            width: 150,
        },
        {
            title: 'Damage Description',
            dataIndex: 'damageDescription',
            key: 'damageDescription',
            ...getColumnSearchProps('damageDescription'),
            ellipsis: true,
            width: 200,
        },
        {
            title: 'Status', // Always show status, just filter by it
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={getStatusColor(status)} style={{ color: '#fff', borderColor: getStatusColor(status) }}>
                    {status ? status.toUpperCase() : ''}
                </Tag>
            ),
            filters: [
                { text: 'In Use', value: 'In Use' },
                { text: 'In Stock', value: 'In Stock' },
                { text: 'Damaged', value: 'Damaged' },
                { text: 'E-Waste', value: 'E-Waste' },
            ],
            onFilter: (value, record) => record.status === value,
            sorter: (a, b) => a.status.localeCompare(b.status),
            width: 120,
            fixed: 'right',
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            fixed: 'right',
            render: (text, record) => (
                <Space size="middle">
                    <Button icon={<EyeOutlined />} size="small" title="View Details" onClick={() => navigate(`/view/${record._id}`)} />
                    <Button icon={<EditOutlined />} size="small" title="Edit Asset" onClick={() => navigate(`/edit/${record._id}`)} />
                    {/* Add more actions like Delete here later if needed */}
                </Space>
            ),
        },
    ];

    // Button styles for status filters (from your first snippet)
    const filterButtonStyle = (status) => ({
        width: 'auto', // Allow width to adjust based on content
        minWidth: '100px', // Minimum width for consistency
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '32px', // Standard AntD button height
        fontSize: '13px',
        marginRight: '8px', // Space between buttons
        // Highlight active filter button
        backgroundColor: activeFilter === status ? getStatusColor(status) : '#f0f2f5',
        color: activeFilter === status ? '#fff' : 'rgba(0, 0, 0, 0.85)',
        borderColor: activeFilter === status ? getStatusColor(status) : '#d9d9d9', // AntD default border
        border: '1px solid',
        borderRadius: '4px' // AntD default border radius
    });

    if (loading) {
        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                <Spin size="large" tip="Loading dashboard data..." />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '24px' }}>
                <Alert message="Error" description={error} type="error" showIcon />
            </div>
        );
    }

    return (
        <div style={{ padding: '24px 20px', background: '#f0f2f5', minHeight: '100%', width: '100%' }}> {/* Adjusted padding */}
            {/* Top Bar: Title and Filter Buttons */}
            <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
                <Col>
                    <Title level={3} style={{ margin: 0 }}>IT Asset Management</Title>
                </Col>
                <Col>
                    <Space size={[8, 8]} wrap> {/* Use Space for responsive wrapping of buttons */}
                        <Button
                            style={{ ...filterButtonStyle('All'), backgroundColor: activeFilter === 'All' ? '#1890ff' : '#f0f2f5', color: activeFilter === 'All' ? '#fff' : 'rgba(0, 0, 0, 0.85)', borderColor: '#1890ff' }}
                            onClick={() => setActiveFilter('All')}
                        >
                            <DatabaseOutlined style={{ marginRight: 8 }} /> All Assets
                        </Button>
                        <Button
                            style={{ ...filterButtonStyle('In Use'), backgroundColor: activeFilter === 'In Use' ? getStatusColor('In Use') : '#f0f2f5', color: activeFilter === 'In Use' ? '#fff' : 'rgba(0, 0, 0, 0.85)' }}
                            onClick={() => setActiveFilter('In Use')}
                        >
                            <ToolOutlined style={{ marginRight: 8 }} /> In Use
                        </Button>
                        <Button
                            style={{ ...filterButtonStyle('In Stock'), backgroundColor: activeFilter === 'In Stock' ? getStatusColor('In Stock') : '#f0f2f5', color: activeFilter === 'In Stock' ? '#fff' : 'rgba(0, 0, 0, 0.85)' }}
                            onClick={() => setActiveFilter('In Stock')}
                        >
                            <CheckCircleOutlined style={{ marginRight: 8 }} /> In Stock
                        </Button>
                        <Button
                            style={{ ...filterButtonStyle('Damaged'), backgroundColor: activeFilter === 'Damaged' ? getStatusColor('Damaged') : '#f0f2f5', color: activeFilter === 'Damaged' ? '#fff' : 'rgba(0, 0, 0, 0.85)' }}
                            onClick={() => setActiveFilter('Damaged')}
                        >
                            <WarningOutlined style={{ marginRight: 8 }} /> Damaged
                        </Button>
                        <Button
                            style={{ ...filterButtonStyle('E-Waste'), backgroundColor: activeFilter === 'E-Waste' ? getStatusColor('E-Waste') : '#f0f2f5', color: activeFilter === 'E-Waste' ? '#fff' : 'rgba(0, 0, 0, 0.85)' }}
                            onClick={() => setActiveFilter('E-Waste')}
                        >
                            <DeleteOutlined style={{ marginRight: 8 }} /> E-Waste
                        </Button>
                        {/* Modified Link to prevent a11y warning */}
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            style={{ minWidth: '100px', height: '32px' }}
                            onClick={() => navigate('/add')} // Use navigate directly
                        >
                            Add Asset
                        </Button>
                    </Space>
                </Col>
            </Row>

            {/* Overall "Total Assets" Statistic Card */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card style={{ textAlign: 'center', height: '100%' }}>
                        <Statistic
                            title="Total Assets"
                            value={totalAssetsCount}
                            prefix={<DatabaseOutlined style={{ color: '#4A90E2' }} />}
                            valueStyle={{ fontSize: '30px' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Asset Table */}
            <Card title={<Title level={4}>Asset Details ({activeFilter})</Title>} style={{ marginTop: '0px' }}>
                <Table
                    columns={dashboardTableColumns}
                    dataSource={filteredAssets.map((item, index) => ({ ...item, key: item._id || index }))}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 'max-content' }} // Enable horizontal scroll for many columns
                    loading={loading}
                />
            </Card>
        </div>
    );
};

export default Dashboard;