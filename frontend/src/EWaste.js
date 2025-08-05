import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Typography, message, Input, Space, Popconfirm, Button } from 'antd'; // Import Popconfirm and Button
import { DeleteOutlined } from '@ant-design/icons'; // Import DeleteOutlined icon
import moment from 'moment'; // Import moment for handling dates

const { Title } = Typography;
const { Search } = Input;

const EWaste = () => {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchText, setSearchText] = useState('');

    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        return token ? { 'x-auth-token': token } : {};
    };

    const fetchEWasteAssets = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/equipment', {
                headers: getAuthHeader(),
            });
            const ewasteAssets = response.data.filter(item => item.status === 'E-Waste');
            setData(ewasteAssets);
            setFilteredData(ewasteAssets); // initialize filtered data
        } catch (error) {
            console.error('Error fetching E-Waste assets:', error);
            message.error('Failed to fetch E-Waste assets.');
        }
    };

    useEffect(() => {
        fetchEWasteAssets();
    }, []);

    const onSearch = (value) => {
        setSearchText(value);
        const filtered = data.filter((item) =>
            item.category?.toLowerCase().includes(value.toLowerCase()) ||
            item.model?.toLowerCase().includes(value.toLowerCase()) ||
            item.serialNumber?.toLowerCase().includes(value.toLowerCase()) ||
            item.comment?.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredData(filtered);
    };

    // --- New: Handle Delete (Move to Removed) ---
    const handleDelete = async (record) => {
        try {
            // API call to update the asset's status to 'Removed'
            await axios.put(`http://localhost:5000/api/equipment/${record._id}`, {
                status: 'Removed',
                removalDate: moment().toISOString(), // Capture the removal date
                originalStatus: 'E-Waste', // To track where it was removed from
            }, {
                headers: getAuthHeader(),
            });

            message.success(`Asset "${record.model}" (${record.serialNumber}) moved to Removed.`);

            // Update local state to remove the item from the E-Waste list
            const updatedData = data.filter(item => item._id !== record._id);
            setData(updatedData);
            setFilteredData(updatedData.filter(item =>
                item.category?.toLowerCase().includes(searchText.toLowerCase()) ||
                item.model?.toLowerCase().includes(searchText.toLowerCase()) ||
                item.serialNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
                item.comment?.toLowerCase().includes(searchText.toLowerCase())
            )); // Re-apply search filter

            // You might want to navigate to the "Removed" page or just let the user click the button.
            // If you want to auto-navigate, you'd need `useNavigate` from `react-router-dom` here.
            // Example if you choose to navigate:
            // import { useNavigate } from 'react-router-dom';
            // const navigate = useNavigate();
            // navigate('/removed');

        } catch (error) {
            console.error('Error moving asset to Removed:', error);
            message.error('Failed to move asset to Removed. Please try again.');
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
            title: 'Comment',
            dataIndex: 'comment',
            key: 'comment',
        },
        // --- New: Action Column with Delete Button ---
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Popconfirm
                    title="Are you sure to move this asset to Removed?"
                    onConfirm={() => handleDelete(record)}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button type="link" danger icon={<DeleteOutlined />}>
                        Remove
                    </Button>
                </Popconfirm>
            ),
            width: 100,
            align: 'center',
        },
    ];

    return (
        <>
            <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4}>E-Waste Assets</Title>
                <Search
                    placeholder="Search"
                    onSearch={onSearch}
                    onChange={(e) => onSearch(e.target.value)}
                    value={searchText}
                    allowClear
                    style={{ width: 200 }}
                />
            </Space>
            <Table
                columns={columns}
                dataSource={filteredData}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
            />
        </>
    );
};

export default EWaste;