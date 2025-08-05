import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Typography, message, Input, Space, Popconfirm, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Title } = Typography;
const { Search } = Input;

const EWaste = () => {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        pageSizeOptions: ['10', '20', '50', '100'],
        showSizeChanger: true,
    });

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
            setFilteredData(ewasteAssets);
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
        setPagination(p => ({ ...p, current: 1 }));
    };

    const handleTableChange = (pag) => {
        setPagination({
            ...pagination,
            current: pag.current,
            pageSize: pag.pageSize,
        });
    };

    const handleDelete = async (record) => {
        try {
            await axios.put(`http://localhost:5000/api/equipment/${record._id}`, {
                status: 'Removed',
                removalDate: moment().toISOString(),
                originalStatus: 'E-Waste',
            }, {
                headers: getAuthHeader(),
            });

            message.success(`Asset "${record.model}" (${record.serialNumber}) moved to Removed.`);
            // Full reload (hard refresh), or remove manually from filteredData for a soft update:
            // window.location.reload(); // If you want a HARD refresh
            // Soft update (recommended for UX):
            fetchEWasteAssets();
        } catch (error) {
            console.error('Error moving asset to Removed:', error);
            message.error('Failed to move asset to Removed. Please try again.');
        }
    };

    const columns = [
        {
            title: 'Sl No',
            key: 'slno',
            render: (_, __, index) => (
                (pagination.current - 1) * pagination.pageSize + index + 1
            ),
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
                pagination={{
                    ...pagination,
                    total: filteredData.length,
                    showTotal: total => `Total ${total} items`,
                }}
                onChange={handleTableChange}
            />
        </>
    );
};

export default EWaste;
