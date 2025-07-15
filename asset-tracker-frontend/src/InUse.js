import React from 'react';
import PageShell from './PageShell';
import { Tag, Typography } from 'antd';
import moment from 'moment';

const { Text } = Typography;

// Helper function to render the warranty tag based on the date
const renderWarrantyTag = (date) => {
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


const InUse = ({ user }) => {
    // Define the columns specific to the In-Use view
    const inUseColumns = [
        { title: 'Model', dataIndex: 'model', key: 'model' },
        { title: 'Assignee', dataIndex: 'assigneeName', key: 'assigneeName' },
        { title: 'Position', dataIndex: 'position', key: 'position' },
        { title: 'Department', dataIndex: 'department', key: 'department' },
        { title: 'Email', dataIndex: 'employeeEmail', key: 'employeeEmail' },
        { title: 'Warranty Expiry', dataIndex: 'warrantyInfo', key: 'warrantyInfo', render: renderWarrantyTag },
    ];

    return (
        <PageShell
            pageTitle="In-Use Assets"
            apiEndpoint="http://localhost:5000/api/equipment"
            tableColumns={inUseColumns}
            user={user}
            initialFilters={{ status: 'In Use' }} // Pre-filter the data
            hideFilters={['status']} // Hide the status filter
            // No renderCustomActions needed, so PageShell will use its default actions
        />
    );
};

export default InUse;
