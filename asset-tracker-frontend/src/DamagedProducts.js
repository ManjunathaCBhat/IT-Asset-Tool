import React from 'react';
import { Tag, Typography } from 'antd';
// No need for moment or axios imports here, PageShell should handle that
// No need for useState or useEffect for data fetching, PageShell handles it
import PageShell from './PageShell'; // Import the reusable component

const { Text } = Typography; // Import Text for consistency if PageShell doesn't provide it directly in columns render

// Helper function to get status tag color (reused from MasterView/InUse)
const getStatusColor = (status) => {
    const colors = { 'In Use': 'success', 'In Stock': 'blue', 'Damaged': 'warning', 'E-Waste': 'red' };
    return colors[status] || 'default';
};

const DamagedProducts = ({ user }) => {
    // Define the columns specific to the Damaged Products view
    const damagedProductColumns = [
        // 'SL No' will be automatically added by PageShell if it includes it
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            sorter: (a, b) => a.category.localeCompare(b.category),
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
            title: 'Comments', // This was 'comment' in your previous DamagedProducts, ensure it matches your API
            dataIndex: 'comment',
            key: 'comment',
            ellipsis: true, // Useful for potentially long comments
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                // Although all items should be 'Damaged', using getStatusColor provides consistency
                <Tag color={getStatusColor(status)}>
                    {status ? status.toUpperCase() : 'N/A'}
                </Tag>
            ),
            sorter: (a, b) => a.status.localeCompare(b.status),
        },
        // If your damaged items have 'movedBy' and you want to display it:
        // {
        //     title: 'Moved By',
        //     dataIndex: 'movedBy',
        //     key: 'movedBy',
        // },
    ];

    return (
        <PageShell
            pageTitle="Damaged Products"
            apiEndpoint="http://localhost:5000/api/equipment" // Assuming this endpoint can be filtered
            tableColumns={damagedProductColumns}
            user={user}
            initialFilters={{ status: 'Damaged' }} // <-- This is the key: filter for 'Damaged' status
            hideFilters={['status']} // Hide the status filter as it's pre-selected
            // You can also pass a custom function for handling item actions if needed,
            // otherwise PageShell's default actions will apply.
        />
    );
};

export default DamagedProducts;