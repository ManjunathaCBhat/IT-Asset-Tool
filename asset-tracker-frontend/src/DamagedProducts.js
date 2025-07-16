import React from 'react';
import { Tag, Typography } from 'antd';
import moment from 'moment'; // Import moment for date formatting
import PageShell from './PageShell'; // Import the reusable component

const { Text } = Typography;

// Helper function to get status tag color (reused from MasterView/InUse)
const getStatusColor = (status) => {
    const colors = { 'In Use': 'success', 'In Stock': 'blue', 'Damaged': 'warning', 'E-Waste': 'red' };
    return colors[status] || 'default';
};

const DamagedProducts = ({ user }) => {
    const damagedProductColumns = [
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            sorter: (a, b) => a.category.localeCompare(b.category),
            width: 150,
        },
        {
            title: 'Model',
            dataIndex: 'model',
            key: 'model',
            width: 180,
        },
        {
            title: 'Serial Number',
            dataIndex: 'serialNumber',
            key: 'serialNumber',
            width: 150,
        },
        // --- NEW COLUMN: Damage Date ---
        {
            title: 'Damage Date', // Column title
            dataIndex: 'updatedAt', // Assuming 'updatedAt' stores the last modification date, which is when status changed to 'Damaged'
            key: 'damageDate',
            render: (date) => date ? moment(date).format('DD MMM YYYY') : 'N/A', // Format the date nicely
            sorter: (a, b) => moment(a.updatedAt).unix() - moment(b.updatedAt).unix(), // Enable sorting
            width: 120,
        },
        {
            title: 'Comments',
            dataIndex: 'comment',
            key: 'comment',
            ellipsis: true,
            width: 250,
        },
        // The 'Status' column is intentionally removed as per your previous request
    ];

    return (
        <PageShell
            pageTitle="Damaged Products"
            apiEndpoint="http://localhost:5000/api/equipment"
            tableColumns={damagedProductColumns}
            user={user}
            initialFilters={{ status: 'Damaged' }}
            hideFilters={['status', 'warrantyInfo']} // Still hide status and warrantyInfo filters
        />
    );
};

export default DamagedProducts;