import React, { useEffect, useState, useCallback } from 'react';
import { Card, Col, Row, Statistic, Typography, Spin, Alert, Button, Space, List } from 'antd';
import {
    DatabaseOutlined, CheckCircleOutlined, ToolOutlined, WarningOutlined, DeleteOutlined,
    LaptopOutlined, DesktopOutlined,
    AudioOutlined, BlockOutlined, // Corrected imports for Headset and Mouse (generic)
} from '@ant-design/icons';
// Removed useNavigate as the + button is removed and no longer redirects
// import { useNavigate } from 'react-router-dom'; // No longer needed
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;

// Helper function for status colors (keep this consistent with AppLayout)
const getStatusColor = (status) => {
    const colors = {
        'In Use': '#7ED321',
        'In Stock': '#FA8C16', // Orange
        'Damaged': '#D0021B', // Red
        'E-Waste': '#8B572A'  // Brown
    };
    return colors[status] || 'rgba(0, 0, 0, 0.85)'; // Default text color if no specific color is found
};

// --- Helper function for grouping and counting by category ---
const summarizeByCategory = (assets) => {
    const categorySummary = {};

    assets.forEach(asset => {
        const category = asset.category || 'Uncategorized';
        if (!categorySummary[category]) {
            categorySummary[category] = {
                category: category,
                inUse: 0,
                inStock: 0,
                damaged: 0,
                eWaste: 0,
                total: 0 // Keep total for (Total) in card title
            };
        }

        switch (asset.status) {
            case 'In Use':
                categorySummary[category].inUse++;
                break;
            case 'In Stock':
                categorySummary[category].inStock++;
                break;
            case 'Damaged':
                categorySummary[category].damaged++;
                break;
            case 'E-Waste':
                categorySummary[category].eWaste++;
                break;
            default:
                // For statuses not explicitly mapped, they won't be displayed on the card
                // but will still contribute to the 'total' for the category
                break;
        }
        categorySummary[category].total++;
    });

    // Explicitly add desired categories to ensure they always show up, even with 0 items.
    const desiredCategories = ['Laptop', 'Headset', 'Mouse', 'Monitor', 'Uncategorized'];
    desiredCategories.forEach(cat => {
        if (!categorySummary[cat]) {
            categorySummary[cat] = {
                category: cat,
                inUse: 0,
                inStock: 0,
                damaged: 0,
                eWaste: 0,
                total: 0
            };
        }
    });

    return Object.values(categorySummary).sort((a, b) => a.category.localeCompare(b.category));
};

// Helper to get icon based on category name
const getCategoryIcon = (category) => {
    switch (category) {
        case 'Computer': // Keep Computer as it might be a general category name in your data
        case 'Laptop':
            return <LaptopOutlined style={{ fontSize: '48px', color: '#4A90E2' }} />; // Blue
        case 'Headset':
            return <AudioOutlined style={{ fontSize: '48px', color: '#4A90E2' }} />; // Audio icon
        case 'Mouse':
            return <BlockOutlined style={{ fontSize: '48px', color: '#4A90E2' }} />; // Generic block/device icon
        case 'Monitor':
            return <DesktopOutlined style={{ fontSize: '48px', color: '#4A90E2' }} />; // Desktop/Monitor icon
        default:
            return <DatabaseOutlined style={{ fontSize: '48px', color: '#888' }} />; // Generic icon for others/uncategorized
    }
};


const Dashboard = () => {
    const [summaryData, setSummaryData] = useState({
        totalAssets: 0,
        inUse: 0,
        inStock: 0,
        damaged: 0,
        eWaste: 0,
    });
    const [categoryAssetSummaries, setCategoryAssetSummaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Removed useNavigate as the + button is removed

    const getAuthHeader = useCallback(() => {
        const token = localStorage.getItem('token');
        return token ? { 'x-auth-token': token } : {};
    }, []);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const summaryRes = await axios.get('http://localhost:5000/api/equipment/summary', { headers: getAuthHeader() });
            setSummaryData(prev => ({ ...prev, ...summaryRes.data, inStock: summaryRes.data.inStock || summaryRes.data.available || 0 }));

            const allAssetsRes = await axios.get('http://localhost:5000/api/equipment', { headers: getAuthHeader() });
            const groupedSummary = summarizeByCategory(allAssetsRes.data);
            setCategoryAssetSummaries(groupedSummary);

        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
            setError('Failed to load dashboard data. Please check your network and backend server.');
        } finally {
            setLoading(false);
        }
    }, [getAuthHeader]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Removed handleAddCategoryAsset function

    return (
        <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100%' }}>
            {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: '20px' }} />}

            <Title level={3} style={{ marginBottom: '24px' }}>Dashboard Overview</Title>

            {/* Top Row for Overall Summary Statistics */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card>
                        <Statistic
                            title="Total Assets"
                            value={summaryData.totalAssets}
                            prefix={<DatabaseOutlined style={{ color: '#4A90E2' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card>
                        <Statistic
                            title="In Use"
                            value={summaryData.inUse}
                            prefix={<ToolOutlined style={{ color: '#7ED321' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card>
                        <Statistic
                            title="In Stock"
                            value={summaryData.inStock}
                            prefix={<CheckCircleOutlined style={{ color: '#FA8C16' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card>
                        <Statistic
                            title="Damaged"
                            value={summaryData.damaged}
                            prefix={<WarningOutlined style={{ color: '#D0021B' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card>
                        <Statistic
                            title="E-Waste"
                            value={summaryData.eWaste}
                            prefix={<DeleteOutlined style={{ color: '#8B572A' }} />}
                        />
                    </Card>
                </Col>
            </Row>

            <Title level={4} style={{ marginBottom: '24px', marginTop: '32px' }}>Assets by Category</Title>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Spin size="large" tip="Loading Categories..." />
                </div>
            ) : categoryAssetSummaries.length === 0 ? (
                <Alert
                    message="No Asset Categories Found"
                    description="It looks like there are no assets categorized yet or data is not available."
                    type="info"
                    showIcon
                />
            ) : (
                <Row gutter={[16, 16]}>
                    {categoryAssetSummaries.map((categoryData) => (
                        <Col key={categoryData.category} xs={24} sm={12} md={8} lg={6} xl={4}>
                            <Card
                                title={
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        {/* Combined Category Name and Total Count like "Computer (32)" */}
                                        <Text strong style={{ fontSize: '16px' }}>
                                            {categoryData.category} ({categoryData.total})
                                        </Text>
                                        {/* Removed + Button from here */}
                                    </div>
                                }
                                hoverable
                                bodyStyle={{ padding: '16px' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                                    <div style={{ width: '40%', display: 'flex', justifyContent: 'center' }}>
                                        {getCategoryIcon(categoryData.category)}
                                    </div>
                                    <List
                                        itemLayout="horizontal"
                                        dataSource={[
                                            { label: 'In Use', count: categoryData.inUse, color: getStatusColor('In Use') },
                                            { label: 'In Stock', count: categoryData.inStock, color: getStatusColor('In Stock') },
                                            { label: 'Damaged', count: categoryData.damaged, color: getStatusColor('Damaged') },
                                            { label: 'E-Waste', count: categoryData.eWaste, color: getStatusColor('E-Waste') }, // Directly using E-Waste
                                        ]}
                                        renderItem={item => (
                                            <List.Item style={{ padding: '4px 0', borderBottom: 'none' }}>
                                                <List.Item.Meta
                                                    title={<Text style={{ color: item.color, fontSize: '12px' }}>{item.label}</Text>}
                                                />
                                                <div>
                                                    <Text style={{ fontWeight: 'bold', fontSize: '12px', color: item.color }}>{item.count}</Text>
                                                </div>
                                            </List.Item>
                                        )}
                                        style={{ padding: 0, width: '60%' }}
                                    />
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
};

export default Dashboard;