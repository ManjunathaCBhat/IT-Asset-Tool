import React, { useEffect, useState } from 'react';
import { Table, Spin, Alert, Typography, Input, Space } from 'antd';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { Search } = Input;

const RemovedAssetsTable = () => {
    // Debug log removed as it was for initial state
    // console.log('RemovedAssetsTable: Component Rendered. Initial/Current loading state:', loading);

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
            setLoading(true); // Ensure it's true at start
            setError(null);
            // Debug logs removed as problem solved
            // console.log('1. Fetch started. Loading state set to TRUE.');

            const response = await axios.get('http://localhost:5000/api/equipment/removed', {
                headers: getAuthHeader(),
            });

            // Debug logs removed as problem solved
            // console.log('2. API Response data received (raw):', response.data);

            const receivedData = response.data;

            setAllRemovedAssets(receivedData);
            setFilteredRemovedAssets(receivedData);
            // Debug logs removed as problem solved
            // console.log('3. Data set to state successfully.');

        } catch (err) {
            console.error('Failed to fetch removed assets:', err); // Keep this for actual errors
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                setError('You are not authorized to view removed assets. Please log in with appropriate permissions.');
            } else {
                setError('Failed to load removed asset data. Please ensure the backend is running and you have proper access.');
            }
        } finally {
            // Debug logs removed as problem solved
            // console.log('Y. Fetch finally block executed. Setting loading to false.');
            setLoading(false); // Set loading to false when fetch finishes (success or error)
            // Debug logs removed as problem solved
            // console.log('Z. Loading state immediately AFTER setLoading(false) call:', loading);
        }
    };

    useEffect(() => {
        // Debug log removed
        // console.log('RemovedAssetsTable: useEffect ran.');
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
                (item.comment && item.comment.toLowerCase().includes(lowercasedValue))
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
            title: 'Last Status',
            dataIndex: 'originalStatus',
            key: 'originalStatus',
            render: (status) => <Text strong>{status}</Text>,
            filters: [
                { text: 'Damaged', value: 'Damaged' },
                { text: 'E-Waste', value: 'E-Waste' },
            ],
            onFilter: (value, record) => record.originalStatus === value,
        },
        {
            title: 'Removal Date',
            dataIndex: 'removalDate',
            key: 'removalDate',
            render: (date) => date ? moment(date).format('DD MMM YYYY HH:mm') : 'N/A',
        },
    ];

    return (
        // Spin component wraps the entire content, controlled by 'loading' state
        <Spin spinning={loading} size="large" tip="Loading removed assets...">
            <div style={{ padding: '20px' }}>
                {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}

                <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Title level={3}>Removed Assets</Title>
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
                />

                {/* --- DEBUGGING TEXT REMOVED --- */}
            </div>
        </Spin>
    );
};

export default RemovedAssetsTable;