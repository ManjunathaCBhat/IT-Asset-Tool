import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography, Divider, List, Button, Spin, Alert } from 'antd';
import {
    DatabaseOutlined, CheckCircleOutlined, ToolOutlined, WarningOutlined, DeleteOutlined,
    DollarOutlined, PlusOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from 'axios'; // Make sure axios is installed: npm install axios

const { Title, Text } = Typography;

const Dashboard = () => {
    const [summaryData, setSummaryData] = useState({
        totalAssets: 0,
        inUse: 0,
        available: 0,
        damaged: 0,
        eWaste: 0,
        totalValue: 0,
        assetDistribution: { // Initialize with zero counts and percentages
            inUse: { count: 0, percentage: 0 },
            available: { count: 0, percentage: 0 },
            damaged: { count: 0, percentage: 0 },
            eWaste: { count: 0, percentage: 0 },
        },
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch summary counts for different statuses
                const summaryRes = await axios.get('http://localhost:5000/api/equipment/summary');
                const fetchedSummary = summaryRes.data;

                // Fetch total value of assets
                const totalValueRes = await axios.get('http://localhost:5000/api/equipment/total-value');
                const totalValue = totalValueRes.data.totalValue || 0;

                // Prepare data for Asset Distribution section
                const distributionCounts = {
                    inUse: fetchedSummary.inUse || 0,
                    available: fetchedSummary.available || 0, // Assuming 'In Stock' is 'available'
                    damaged: fetchedSummary.damaged || 0,
                    eWaste: fetchedSummary.eWaste || 0,
                };

                const totalAssetsForDistribution = distributionCounts.inUse + distributionCounts.available + distributionCounts.damaged + distributionCounts.eWaste;

                setSummaryData({
                    totalAssets: fetchedSummary.totalAssets || 0,
                    inUse: fetchedSummary.inUse || 0,
                    available: fetchedSummary.available || 0,
                    damaged: fetchedSummary.damaged || 0,
                    eWaste: fetchedSummary.eWaste || 0,
                    totalValue: totalValue,
                    assetDistribution: {
                        inUse: { count: distributionCounts.inUse, percentage: totalAssetsForDistribution > 0 ? ((distributionCounts.inUse / totalAssetsForDistribution) * 100).toFixed(1) : 0 },
                        available: { count: distributionCounts.available, percentage: totalAssetsForDistribution > 0 ? ((distributionCounts.available / totalAssetsForDistribution) * 100).toFixed(1) : 0 },
                        damaged: { count: distributionCounts.damaged, percentage: totalAssetsForDistribution > 0 ? ((distributionCounts.damaged / totalAssetsForDistribution) * 100).toFixed(1) : 0 },
                        eWaste: { count: distributionCounts.eWaste, percentage: totalAssetsForDistribution > 0 ? ((distributionCounts.eWaste / totalAssetsForDistribution) * 100).toFixed(1) : 0 },
                    },
                });

            } catch (err) {
                console.error('Failed to fetch dashboard data:', err);
                // Set a user-friendly error message
                setError('Failed to load dashboard data. Please check your network and backend server.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []); // Empty dependency array means this runs once on component mount

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px', background: '#282c34', minHeight: '100vh' }}><Spin size="large" tip="Loading dashboard..." /></div>;
    }

    if (error) {
        return (
            <div style={{ padding: '24px', background: '#282c34', minHeight: '100vh' }}>
                <Alert message="Error" description={error} type="error" showIcon style={{marginBottom: '20px'}} />
                {/* Optionally, add a retry button */}
                <Button type="primary" onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    // Styles to match the dark theme and card appearance from the screenshot
    const cardStyle = {
        background: '#1d2128', // Dark background for cards
        borderRadius: '8px',
        color: '#fff', // White text
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
        border: '1px solid #333',
    };

    const statisticValueStyle = {
        color: '#fff', // White for statistic values
    };

    const listStyle = {
        background: '#1d2128',
        borderRadius: '8px',
        padding: '16px',
        color: '#fff',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
        border: '1px solid #333',
        height: '100%', // Ensure it fills the column height
    };

    const listItemStyle = {
        borderBottom: '1px solid #333', // Lighter border for list items
        padding: '12px 0',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    };

    const lastListItemStyle = {
        borderBottom: 'none', // No border for the last item
    };

    const quickActionsCardStyle = {
        background: '#1d2128',
        borderRadius: '8px',
        color: '#fff',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
        border: '1px solid #333',
        padding: '16px',
        height: '100%', // Ensure it fills the column height
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around', // Distribute items evenly
    };

    const quickActionButtonStyle = {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        height: '50px',
        fontSize: '16px',
        marginBottom: '10px', // Space between buttons
        backgroundColor: '#282c34', // Darker button background
        color: '#fff',
        borderColor: '#444',
        transition: 'all 0.3s ease', // Smooth transition for hover effects
    };

    const primaryActionButtonStyle = { // For "Add New Asset"
        ...quickActionButtonStyle,
        backgroundColor: '#4A90E2', // Blue from your logo
        borderColor: '#4A90E2',
    };
    const warningActionButtonStyle = { // For "Review Damaged Assets"
        ...quickActionButtonStyle,
        backgroundColor: '#D0021B', // Red from your logo
        borderColor: '#D0021B',
    };
    const successActionButtonStyle = { // For "View Available Assets"
        ...quickActionButtonStyle,
        backgroundColor: '#7ED321', // Greenish from your in-use icon
        borderColor: '#7ED321',
    };


    return (
        <div style={{ padding: '24px', background: '#282c34', minHeight: '100%' }}> {/* Overall background */}
            <Title level={3} style={{ color: '#fff', marginBottom: '24px' }}>Dashboard</Title>

            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card style={cardStyle}>
                        <Statistic
                            title={<Text style={statisticValueStyle}>Total Assets</Text>}
                            value={summaryData.totalAssets}
                            formatter={(value) => <Text style={statisticValueStyle}>{value}</Text>}
                            prefix={<DatabaseOutlined style={{ color: '#4A90E2' }} />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card style={cardStyle}>
                        <Statistic
                            title={<Text style={statisticValueStyle}>In Use</Text>}
                            value={summaryData.inUse}
                            formatter={(value) => <Text style={statisticValueStyle}>{value}</Text>}
                            prefix={<ToolOutlined style={{ color: '#7ED321' }} />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card style={cardStyle}>
                        <Statistic
                            title={<Text style={statisticValueStyle}>Available</Text>}
                            value={summaryData.available}
                            formatter={(value) => <Text style={statisticValueStyle}>{value}</Text>}
                            prefix={<CheckCircleOutlined style={{ color: '#F5A623' }} />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card style={cardStyle}>
                        <Statistic
                            title={<Text style={statisticValueStyle}>Damaged</Text>}
                            value={summaryData.damaged}
                            formatter={(value) => <Text style={statisticValueStyle}>{value}</Text>}
                            prefix={<WarningOutlined style={{ color: '#D0021B' }} />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card style={cardStyle}>
                        <Statistic
                            title={<Text style={statisticValueStyle}>E-Waste</Text>}
                            value={summaryData.eWaste}
                            formatter={(value) => <Text style={statisticValueStyle}>{value}</Text>}
                            prefix={<DeleteOutlined style={{ color: '#8B572A' }} />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card style={cardStyle}>
                        <Statistic
                            title={<Text style={statisticValueStyle}>Total Value</Text>}
                            value={summaryData.totalValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} // Formats as Indian Rupees
                            formatter={(value) => <Text style={statisticValueStyle}>{value}</Text>}
                            prefix={<DollarOutlined style={{ color: '#50E3C2' }} />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <div style={listStyle}>
                        <Title level={4} style={{ color: '#fff', marginBottom: '16px' }}>Asset Distribution</Title>
                        <List
                            itemLayout="horizontal"
                            dataSource={[
                                { label: 'In Use', value: summaryData.assetDistribution.inUse },
                                { label: 'Available', value: summaryData.assetDistribution.available },
                                { label: 'Damaged', value: summaryData.assetDistribution.damaged },
                                { label: 'E-Waste', value: summaryData.assetDistribution.eWaste },
                            ]}
                            renderItem={(item, index) => (
                                <List.Item style={index === 3 ? lastListItemStyle : listItemStyle}>
                                    <Text style={{ color: '#fff' }}>{item.label}</Text>
                                    <Text style={{ color: '#fff' }}>
                                        {item.value.count} ({item.value.percentage}%)
                                    </Text>
                                </List.Item>
                            )}
                        />
                    </div>
                </Col>
                <Col xs={24} lg={12}>
                    <div style={quickActionsCardStyle}>
                        <Title level={4} style={{ color: '#fff', marginBottom: '16px' }}>Quick Actions</Title>
                        <Link to="/add">
                            <Button type="primary" icon={<PlusOutlined />} style={primaryActionButtonStyle}>
                                Add New Asset
                            </Button>
                        </Link>
                        <Link to="/damaged">
                            <Button type="primary" icon={<WarningOutlined />} style={warningActionButtonStyle}>
                                Review Damaged Assets
                            </Button>
                        </Link>
                        <Link to="/in-stock">
                            <Button type="primary" icon={<CheckCircleOutlined />} style={successActionButtonStyle}>
                                View Available Assets
                            </Button>
                        </Link>
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;