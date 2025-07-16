import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Typography, message } from 'antd';

const { Title } = Typography;

const EWaste = () => {
    const [data, setData] = useState([]);

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
        } catch (error) {
            console.error('Error fetching E-Waste assets:', error);
            message.error('Failed to fetch E-Waste assets.');
        }
    };

    useEffect(() => {
        fetchEWasteAssets();
    }, []);

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
        }
    ];

    return (
        <>
            <Title level={4}>E-Waste Assets</Title>
            <Table columns={columns} dataSource={data} rowKey="_id" pagination={{ pageSize: 10 }} />
        </>
    );
};

export default EWaste;