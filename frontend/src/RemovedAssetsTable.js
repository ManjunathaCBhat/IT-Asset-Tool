import React, { useEffect, useState, useCallback } from 'react';
import { Table, Spin, Alert, Typography, Input, Space } from 'antd';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { Search } = Input;

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

    const fetchRemovedAssets = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('1. Attempting to fetch removed assets...');
            console.log('2. Auth Header:', getAuthHeader());

            const response = await axios.get('http://localhost:5000/api/equipment/removed', {
                headers: getAuthHeader(),
            });

            console.log('3. API Response data:', response.data);

            // *** TEMPORARY CHANGE FOR DEBUGGING THE HANG ***
            // *** COMMENT OUT THE SORTING LOGIC FOR NOW ***
            const unsortedData = response.data; // Use the raw data directly for now

            // You can add a check here for missing dates if you want to be extra safe
            // const cleanedData = unsortedData.map(item => ({
            //     ...item,
            //     removalDate: item.removalDate || null, // Ensure it's null, not undefined, if missing
            //     originalStatus: item.originalStatus || 'Unknown'
            // }));


            // *** USE unsortedData directly to see if the hang disappears ***
            setAllRemovedAssets(unsortedData);
            setFilteredRemovedAssets(unsortedData);
            console.log('4. Data set to state successfully (unsorted).'); // Updated log message

        } catch (err) {
            console.error('X. Failed to fetch removed assets:', err);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                setError('You are not authorized to view removed assets. Please log in with appropriate permissions.');
            } else {
                setError('Failed to load removed asset data. Please ensure the backend is running and you have proper access.');
            }
        } finally {
            console.log('Y. fetchRemovedAssets finally block executed. Setting loading to false.');
            setLoading(false); // This is the line that should stop the spinner
        }
    }, [getAuthHeader]);

    useEffect(() => {
        fetchRemovedAssets();
    }, [fetchRemovedAssets]);


    const handleSearch = (value) => {
        setSearchText(value);
        if (value) {
            const lowercasedValue = value.toLowerCase();
            const filtered = allRemovedAssets.filter(item =>
                (item.category && item.category.toLowerCase().includes(lowercasedValue)) ||
                (item.model && item.model.toLowerCase().includes(lowercasedValue)) ||
                (item.serialNumber && item.serialNumber.toLowerCase().includes(lowercasedValue)) ||
                (item.originalStatus && item.originalStatus.toLowerCase().includes(lowercasedValue)) ||
                (item.removedByEmail && item.removedByEmail.toLowerCase().includes(lowercasedValue)) ||
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
            title: 'Removed By',
            dataIndex: 'removedByEmail',
            key: 'removedByEmail',
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

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
                <p>Loading removed assets...</p>
            </div>
        );
    }

    if (error) {
        return <Alert message="Error" description={error} type="error" showIcon />;
    }

    return (
        <div>
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
        </div>
    );
};

export default RemovedAssetsTable;