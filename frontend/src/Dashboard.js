import React, { useEffect, useState, useCallback } from 'react';
import { Card, Col, Row, Statistic, Typography, List, Button, Spin, Alert, Table, Tag, Input, Space } from 'antd';
import {
    DatabaseOutlined, CheckCircleOutlined, ToolOutlined, WarningOutlined, DeleteOutlined,
    PlusOutlined, SearchOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment'; // Import moment for date formatting and sorting

const { Title, Text } = Typography;

// Helper functions (could be moved to a utils file)
const getStatusColor = (status) => {
    const colors = { 'In Use': '#7ED321', 'In Stock': '#4A90E2', 'Damaged': '#D0021B', 'E-Waste': '#8B572A' };
    return colors[status] || 'default'; // Use hex codes for background color
};

const getWarrantyTag = (date) => {
    if (!date) return <Text disabled>N/A</Text>;

    const warrantyDate = moment(date); // Moment automatically handles various date string formats
    if (!warrantyDate.isValid()) return <Text disabled>Invalid Date</Text>;

    const today = moment();
    const thirtyDaysFromNow = moment().add(30, 'days');

    if (warrantyDate.isBefore(today, 'day')) { // 'day' to compare just the date part
        return <Tag color="error">Expired: {warrantyDate.format('DD MMM YYYY')}</Tag>;
    }
    if (warrantyDate.isBefore(thirtyDaysFromNow, 'day')) {
        return <Tag color="warning">Expires: {warrantyDate.format('DD MMM YYYY')}</Tag>;
    }
    return warrantyDate.format('DD MMM YYYY');
};

const Dashboard = () => {
    const [summaryData, setSummaryData] = useState({
        totalAssets: 0,
        inUse: 0,
        available: 0,
        damaged: 0,
        eWaste: 0,
    });
    const [allAssets, setAllAssets] = useState([]); // All assets fetched from API
    const [filteredAssets, setFilteredAssets] = useState([]); // Assets currently displayed in table
    const [activeFilter, setActiveFilter] = useState('All'); // 'All', 'In Use', 'In Stock', 'Damaged', 'E-Waste'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [searchedColumn, setSearchedColumn] = useState('');

    const getAuthHeader = useCallback(() => {
        const token = localStorage.getItem('token');
        return token ? { 'x-auth-token': token } : {};
    }, []);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch summary counts
            const summaryRes = await axios.get('http://localhost:5000/api/equipment/summary', { headers: getAuthHeader() });
            const fetchedSummary = summaryRes.data;
            setSummaryData(fetchedSummary);

            // Fetch ALL assets for client-side filtering
            const assetsRes = await axios.get('http://localhost:5000/api/equipment', { headers: getAuthHeader() });
            setAllAssets(assetsRes.data);

        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
            setError('Failed to load dashboard data. Please check your network and backend server.');
        } finally {
            setLoading(false);
        }
    }, [getAuthHeader]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Effect for filtering assets based on activeFilter or search text
    useEffect(() => {
        let currentFiltered = allAssets;

        // Apply status filter
        if (activeFilter !== 'All') {
            currentFiltered = currentFiltered.filter(asset => asset.status === activeFilter);
        }

        // Apply search filter (if searchText is not empty)
        if (searchText) {
            currentFiltered = currentFiltered.filter(asset =>
                Object.keys(asset).some(key =>
                    String(asset[key]).toLowerCase().includes(searchText.toLowerCase())
                )
            );
        }

        setFilteredAssets(currentFiltered);
    }, [allAssets, activeFilter, searchText]);


    // --- Table Column Search Functionality ---
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
            // if (visible) { setTimeout(() => searchInput.select(), 100); } // Re-add if you have searchInput ref
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
            sorter: (a, b) => a.model.localeCompare(b.model),
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
            sorter: (a, b) => moment(a.warrantyInfo).unix() - moment(b.warrantyInfo).unix(),
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
        // Conditional columns based on activeFilter (for clarity, all relevant columns are defined, but their values might be null)
        {
            title: 'Assignee Name',
            dataIndex: 'assigneeName',
            key: 'assigneeName',
            ...getColumnSearchProps('assigneeName'),
            width: 150,
            // render: (text) => activeFilter === 'In Use' ? text : 'N/A', // Can apply this if you want to hide data for other statuses
        },
        {
            title: 'Employee Email',
            dataIndex: 'employeeEmail',
            key: 'employeeEmail',
            ...getColumnSearchProps('employeeEmail'),
            width: 180,
            // render: (text) => activeFilter === 'In Use' ? text : 'N/A',
        },
        {
            title: 'Department',
            dataIndex: 'department',
            key: 'department',
            ...getColumnSearchProps('department'),
            width: 150,
            // render: (text) => activeFilter === 'In Use' ? text : 'N/A',
        },
        {
            title: 'Damage Description',
            dataIndex: 'damageDescription',
            key: 'damageDescription',
            ...getColumnSearchProps('damageDescription'),
            ellipsis: true,
            width: 200,
            // render: (text) => activeFilter === 'Damaged' ? text : 'N/A',
        },
        {
            title: 'Status', // Always show status, just filter by it
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={getStatusColor(status)} style={{color: '#fff', borderColor: getStatusColor(status)}}>
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
    ];


    // Button styles for status filters
    const filterButtonStyle = (status) => ({
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '40px',
        fontSize: '14px',
        marginBottom: '10px',
        backgroundColor: activeFilter === status ? getStatusColor(status) : '#f0f2f5', // Highlight active
        color: activeFilter === status ? '#fff' : 'rgba(0, 0, 0, 0.85)',
        borderColor: getStatusColor(status),
        // Adding hover styles via inline style is tricky, AntD handles this normally
        // We ensure the background color and text color are set for active state
        // For inactive, default AntD button styles apply
    });


    return (
        <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100%' }}>
            <Title level={3} style={{ marginBottom: '24px' }}>Dashboard</Title>

            {/* Top Row for Summary Statistics */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card>
                        <Statistic
                            title="Total Assets"
                            value={summaryData.totalAssets}
                            prefix={<DatabaseOutlined style={{ color: '#4A90E2' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card>
                        <Statistic
                            title="In Use"
                            value={summaryData.inUse}
                            prefix={<ToolOutlined style={{ color: '#7ED321' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card>
                        <Statistic
                            title="In Stock"
                            value={summaryData.available} // Renamed from "Available" to "In Stock" to match common terminology
                            prefix={<CheckCircleOutlined style={{ color: '#F5A623' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card>
                        <Statistic
                            title="Damaged"
                            value={summaryData.damaged}
                            prefix={<WarningOutlined style={{ color: '#D0021B' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card>
                        <Statistic
                            title="E-Waste"
                            value={summaryData.eWaste}
                            prefix={<DeleteOutlined style={{ color: '#8B572A' }} />}
                        />
                    </Card>
                </Col>
                {/* Total Value / Cost Removed as per request */}
            </Row>

            {/* Quick Actions / Filter Buttons */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} md={6} lg={4}>
                    <Button
                        style={{...filterButtonStyle('All'), backgroundColor: activeFilter === 'All' ? '#1890ff' : '#f0f2f5', color: activeFilter === 'All' ? '#fff' : 'rgba(0, 0, 0, 0.85)', borderColor: '#1890ff'}}
                        onClick={() => setActiveFilter('All')}
                    >
                        <DatabaseOutlined style={{ marginRight: 8 }} /> All Assets
                    </Button>
                </Col>
                <Col xs={24} sm={12} md={6} lg={4}>
                    <Button
                        style={{...filterButtonStyle('In Use'), backgroundColor: activeFilter === 'In Use' ? getStatusColor('In Use') : '#f0f2f5', color: activeFilter === 'In Use' ? '#fff' : 'rgba(0, 0, 0, 0.85)'}}
                        onClick={() => setActiveFilter('In Use')}
                    >
                        <ToolOutlined style={{ marginRight: 8 }} /> In Use
                    </Button>
                </Col>
                <Col xs={24} sm={12} md={6} lg={4}>
                    <Button
                        style={{...filterButtonStyle('In Stock'), backgroundColor: activeFilter === 'In Stock' ? getStatusColor('In Stock') : '#f0f2f5', color: activeFilter === 'In Stock' ? '#fff' : 'rgba(0, 0, 0, 0.85)'}}
                        onClick={() => setActiveFilter('In Stock')}
                    >
                        <CheckCircleOutlined style={{ marginRight: 8 }} /> In Stock
                    </Button>
                </Col>
                <Col xs={24} sm={12} md={6} lg={4}>
                    <Button
                        style={{...filterButtonStyle('Damaged'), backgroundColor: activeFilter === 'Damaged' ? getStatusColor('Damaged') : '#f0f2f5', color: activeFilter === 'Damaged' ? '#fff' : 'rgba(0, 0, 0, 0.85)'}}
                        onClick={() => setActiveFilter('Damaged')}
                    >
                        <WarningOutlined style={{ marginRight: 8 }} /> Damaged
                    </Button>
                </Col>
                <Col xs={24} sm={12} md={6} lg={4}>
                    <Button
                        style={{...filterButtonStyle('E-Waste'), backgroundColor: activeFilter === 'E-Waste' ? getStatusColor('E-Waste') : '#f0f2f5', color: activeFilter === 'E-Waste' ? '#fff' : 'rgba(0, 0, 0, 0.85)'}}
                        onClick={() => setActiveFilter('E-Waste')}
                    >
                        <DeleteOutlined style={{ marginRight: 8 }} /> E-Waste
                    </Button>
                </Col>
                <Col xs={24} sm={12} md={6} lg={4}>
                    <Link to="/add">
                        <Button type="primary" icon={<PlusOutlined />} style={{ width: '100%', height: '40px', fontSize: '14px', backgroundColor: '#1890ff', borderColor: '#1890ff' }}>
                            Add New Asset
                        </Button>
                    </Link>
                </Col>
            </Row>

            {/* Asset Table */}
            <Card title={<Title level={4}>Asset List ({activeFilter})</Title>} style={{ marginTop: '24px' }}>
                <Table
                    columns={dashboardTableColumns}
                    dataSource={filteredAssets.map((item, index) => ({ ...item, key: item._id || index }))}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 'max-content' }}
                    loading={loading}
                />
            </Card>
        </div>
    );
};

export default Dashboard;