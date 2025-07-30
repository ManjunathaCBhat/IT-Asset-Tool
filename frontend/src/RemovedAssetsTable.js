// src/RemovedAssetsTable.js
import React, { useEffect, useState } from 'react';
import { Table, Spin, Alert, Typography, Input, Space, Tag } from 'antd'; // Added Tag for renderWarrantyTag
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { Search } = Input;

// Re-using renderWarrantyTag (or ensure it's in a shared utils file)
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


const RemovedAssetsTable = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allRemovedAssets, setAllRemovedAssets] = useState([]);
    const [filteredRemovedAssets, setFilteredRemovedAssets] = useState([]);
    const [searchText, setSearchText] = useState('');

    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        return token ? { 'x-auth-token': token } : {};
    };

    const fetchRemovedAssets = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Attempting to fetch removed assets from /api/equipment/removed');
            const response = await axios.get('http://localhost:5000/api/equipment/removed', {
                headers: getAuthHeader(),
            });

            const receivedData = response.data;
            console.log('Received removed assets data:', receivedData);
            setAllRemovedAssets(receivedData);
            setFilteredRemovedAssets(receivedData);

        } catch (err) {
            console.error('Failed to fetch removed assets:', err.response ? err.response.data : err.message);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                setError('You are not authorized to view removed assets. Please log in with appropriate permissions.');
            } else if (err.response && err.response.status === 404) {
                 setError('Removed assets endpoint not found. Please ensure your backend has /api/equipment/removed route.');
            } else {
                setError('Failed to load removed asset data. Please ensure the backend is running and you have proper access.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRemovedAssets();
    }, []);

    const handleSearch = (value) => {
        setSearchText(value);
        if (value) {
            const lowercasedValue = value.toLowerCase();
            const filtered = allRemovedAssets.filter(item =>
                (item.category && item.category.toLowerCase().includes(lowercasedValue)) ||
                (item.model && item.model.toLowerCase().includes(lowercasedValue)) ||
                (item.serialNumber && item.serialNumber.toLowerCase().includes(lowercasedValue)) ||
                (item.originalStatus && item.originalStatus.toLowerCase().includes(lowercasedValue)) ||
                (item.comment && item.comment.toLowerCase().includes(lowercasedValue)) ||
                (item.assigneeName && item.assigneeName.toLowerCase().includes(lowercasedValue)) // Added assigneeName search
            );
            setFilteredRemovedAssets(filtered);
        } else {
            setFilteredRemovedAssets(allRemovedAssets);
        }
    };

    const columns = [
        {
            title: 'Sl No',
            key: 'slno',
            render: (_, __, index) => index + 1,
            width: 70,
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            filters: [...new Set(allRemovedAssets.map(item => item.category))].map(cat => ({ text: cat, value: cat })),
            onFilter: (value, record) => record.category.indexOf(value) === 0,
        },
        {
            title: 'Model',
            dataIndex: 'model',
            key: 'model',
        },
        {
            title: 'Serial Number',
            dataIndex: 'serialNumber',
            key: 'serialNumber',
        },
        {
            title: 'Assignee Name', // Added Assignee Name
            dataIndex: 'assigneeName',
            key: 'assigneeName',
        },
        {
            title: 'Original Status', // Renamed from Last Status for clarity
            dataIndex: 'status', // Assuming 'status' now stores the original status upon removal
            key: 'originalStatus',
            render: (status) => <Text strong>{status}</Text>,
            filters: [
                { text: 'Damaged', value: 'Damaged' },
                { text: 'E-Waste', value: 'E-Waste' },
                { text: 'In Use', value: 'In Use' }, // Assuming it could have been in use when removed
                { text: 'In Stock', value: 'In Stock' }, // Assuming it could have been in stock when removed
            ].filter(filter => allRemovedAssets.some(item => item.status === filter.value)), // Only show filters for statuses actually present
            onFilter: (value, record) => record.status === value,
        },
        {
            title: 'Removal Date',
            dataIndex: 'updatedAt', // Assuming 'updatedAt' captures the removal date
            key: 'removalDate',
            render: (date) => date ? moment(date).format('DD MMM YYYY HH:mm') : 'N/A',
        },
        {
            title: 'Comment', // Display comment for context
            dataIndex: 'comment',
            key: 'comment',
            ellipsis: true, // Truncate long comments
        }
    ];

    return (
        // Spin component wraps the entire content, controlled by 'loading' state
        <Spin spinning={loading} size="large" tip="Loading removed assets...">
            <div style={{ padding: '20px' }}>
                {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}

                <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Title level={3}>Removed Assets -</Title>
                    <div style={{ marginTop: 14,  marginLeft: 1, color: '#888', fontSize: 14 }}>
                    Implies the asset has left the organization's control, either through sale, donation, or disposal.
                    </div>
                    <Search
                        placeholder="Search removed assets..."
                        onSearch={handleSearch}
                        onChange={(e) => handleSearch(e.target.value)}
                        value={searchText}
                        allowClear
                        style={{ width: 300 }}
                    />
                </Space>

                <Table
                    columns={columns}
                    dataSource={filteredRemovedAssets}
                    rowKey="_id"
                    pagination={{ pageSize: 10 }}
                    // Fixed Ant Design warning: `bordered` is deprecated. Please use `variant` instead.
                    // This warning doesn't explicitly appear in your provided code for Table, but good to note.
                />
            </div>
        </Spin>
    );
};

export default RemovedAssetsTable;