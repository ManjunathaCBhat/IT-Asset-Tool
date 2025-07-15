import React from 'react';
import { Tag, Typography } from 'antd';
import moment from 'moment';
import PageShell from './PageShell'; // Import the reusable component

const { Text } = Typography;

// Helper function to determine tag color for warranty status
const getWarrantyTag = (date) => {
    if (!date) return <Text disabled>N/A</Text>;

    const warrantyDate = moment(date, 'YYYY-MM-DD');
    if (!warrantyDate.isValid()) return <Text disabled>Invalid Date</Text>;

    const today = moment();
    const thirtyDaysFromNow = moment().add(30, 'days');

    if (warrantyDate.isBefore(today)) {
        return <Tag color="error">Expired: {warrantyDate.format('DD MMM YYYY')}</Tag>;
    }
    if (warrantyDate.isBefore(thirtyDaysFromNow)) {
        return <Tag color="warning">Expires: {warrantyDate.format('DD MMM YYYY')}</Tag>;
    }
    return warrantyDate.format('DD MMM YYYY');
};

// Helper function to get status tag color
const getStatusColor = (status) => {
    const colors = { 'In Use': 'success', 'In Stock': 'blue', 'Damaged': 'warning', 'E-Waste': 'red' };
    return colors[status] || 'default';
};


const MasterView = ({ user, setExpiringItems }) => {

    // Define the columns for the Master View table.
    // The "SI No" and "Action" columns are added automatically by PageShell.
    const masterViewColumns = [
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
            title: 'Warranty Expiry',
            dataIndex: 'warrantyInfo',
            key: 'warrantyInfo',
            render: (date) => getWarrantyTag(date),
            sorter: (a, b) => moment(a.warrantyInfo).unix() - moment(b.warrantyInfo).unix(),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={getStatusColor(status)}>
                    {status ? status.toUpperCase() : ''}
                </Tag>
            ),
            sorter: (a, b) => a.status.localeCompare(b.status),
        },
    ];

    return (
        <PageShell
            pageTitle="Asset Inventory"
            apiEndpoint="http://localhost:5000/api/equipment"
            tableColumns={masterViewColumns}
            user={user}
            setExpiringItems={setExpiringItems}
        />
    );
};

export default MasterView;
