// src/AppLayout.js
import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
    Layout, Menu, Popover, Badge, List, Typography,
    Avatar, Dropdown, Space, Button
} from 'antd';
import {
    PlusOutlined, DatabaseOutlined, BellOutlined, UserOutlined,
    LogoutOutlined, TeamOutlined, CheckCircleOutlined, ToolOutlined,
    WarningOutlined, DeleteOutlined, SettingOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Header, Content } = Layout;
const { Text } = Typography;

// --- Helper for status colors (consistent across the app) ---
const getStatusColor = (status) => {
    const colors = {
        'Dashboard': '#4A90E2', // Blue
        'In Use': '#7ED321', // Green
        'In Stock': '#FA8C16', // Orange for In Stock
        'Damaged': '#D0021B', // Red
        'E-Waste': '#8B572A', // Brown
        'Add Equipment': '#1890ff', // Ant Design primary blue for Add Equipment
        'Removed': '#555555' // A neutral dark gray for removed items
    };
    return colors[status] || 'default';
};

// --- Logo Component ---
const Logo = () => {
    const logoStyle = {
        height: '32px',
        marginRight: '24px',
        display: 'flex',
        alignItems: 'center',
        fontSize: '20px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
    };
    const cirrusStyle = { color: '#4A90E2' };
    const labsStyle = { color: '#D0021B' };
    return (
        <div style={logoStyle}>
            <span style={cirrusStyle}>cirrus</span>
            <span style={labsStyle}>labs</span>
        </div>
    );
};

const AppLayout = ({ user, handleLogout, expiringItems }) => {
    const location = useLocation();

    // Define main navigation items for the top bar
    // Added a 'statusKey' for applying status colors
    const mainNavItems = [
        { key: '/', icon: <DatabaseOutlined />, label: 'Dashboard', statusKey: 'Dashboard' },
        { key: '/in-stock', icon: <CheckCircleOutlined />, label: 'In Stock', statusKey: 'In Stock' },
        { key: '/in-use', icon: <ToolOutlined />, label: 'In Use', statusKey: 'In Use' },
        { key: '/damaged', icon: <WarningOutlined />, label: 'Damaged', statusKey: 'Damaged' },
        { key: '/e-waste', icon: <DeleteOutlined />, label: 'E-Waste', statusKey: 'E-Waste' },
        { key: '/removed', icon: <DeleteOutlined />, label: 'Removed', statusKey: 'Removed' }, // New link for Removed Assets
    ];

    // --- Popover and Dropdown Menu Content ---
    const notificationContent = (
        <List
            header={<div>Warranty Alerts (Expires in 30 days)</div>}
            dataSource={expiringItems}
            renderItem={item => (
                <List.Item>
                    <List.Item.Meta
                        title={<Link to={`/all-assets?assetId=${item.assetId}`}>{item.model} ({item.serialNumber})</Link>}
                        description={`Expires on: ${moment(item.warrantyInfo).format('DD MMM YYYY')}`}
                    />
                    {moment(item.warrantyInfo).isBefore(moment()) ?
                        <Text type="danger">Expired</Text> :
                        <Text type="warning">Expires Soon</Text>
                    }
                </List.Item>
            )}
            style={{ width: 350 }}
            locale={{ emptyText: 'No warranty alerts.' }}
        />
    );

    // Dynamic User Menu Items
    const getUserMenuItems = () => {
        const items = [
            { key: 'user-info', label: <Text strong>{user?.name || user?.email}</Text>, disabled: true },
            { key: 'role', label: <Text type="secondary">Role: {user?.role}</Text>, disabled: true },
            { key: 'divider-1', type: 'divider' },
            { key: 'settings', label: <Link to="/settings">Settings</Link>, icon: <SettingOutlined /> }, // Assuming /settings route exists
        ];

        if (user?.role === 'Admin') {
            items.push({
                key: 'user-management',
                label: <Link to="/users">User Management</Link>,
                icon: <TeamOutlined />
            });
        }

        items.push(
            { key: 'divider-2', type: 'divider' },
            { key: 'logout', label: 'Logout', icon: <LogoutOutlined />, onClick: handleLogout }
        );
        return items;
    };


    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header
                style={{
                    padding: '0 24px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    boxShadow: '0 2px 8px #f0f1f2',
                    height: '64px'
                }}
            >
                {/* Left Section: Logo */}
                <div>
                    <Logo />
                </div>

                {/* Middle Section: Main Navigation Buttons & Add Equipment */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                    <Space size="middle">
                        {mainNavItems.map(item => {
                            const isActive = location.pathname === item.key;
                            const buttonColor = getStatusColor(item.statusKey);

                            return (
                                <Link to={item.key} key={item.key}>
                                    <Button
                                        type={isActive ? 'primary' : 'default'}
                                        icon={item.icon}
                                        style={{
                                            backgroundColor: isActive ? buttonColor : 'transparent',
                                            borderColor: isActive ? buttonColor : '#d9d9d9',
                                            color: isActive ? '#fff' : 'rgba(0, 0, 0, 0.85)',
                                            fontWeight: isActive ? 'bold' : 'normal',
                                            height: '40px',
                                            padding: '0 15px',
                                            fontSize: '14px',
                                        }}
                                    >
                                        {item.label}
                                    </Button>
                                </Link>
                            );
                        })}
                        {/* Add Equipment Button - Conditionally Rendered */}
                        {(user?.role === 'Admin' || user?.role === 'Editor') && (
                            <Link to="/add">
                                <Button
                                    type={location.pathname === '/add' ? 'primary' : 'default'}
                                    icon={<PlusOutlined />}
                                    style={{
                                        backgroundColor: location.pathname === '/add' ? getStatusColor('Add Equipment') : 'transparent',
                                        borderColor: location.pathname === '/add' ? getStatusColor('Add Equipment') : '#d9d9d9',
                                        color: location.pathname === '/add' ? '#fff' : 'rgba(0, 0, 0, 0.85)',
                                        fontWeight: location.pathname === '/add' ? 'bold' : 'normal',
                                        height: '40px',
                                        padding: '0 15px',
                                        fontSize: '14px',
                                    }}
                                >
                                    Add Equipment
                                </Button>
                            </Link>
                        )}
                    </Space>
                </div>


                {/* Right Section: Notifications and User Profile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <Popover content={notificationContent} title="Notifications" trigger="click" placement="bottomRight">
                        <Badge count={expiringItems.length}>
                            <BellOutlined style={{ fontSize: '20px', cursor: 'pointer' }} />
                        </Badge>
                    </Popover>
                    <Dropdown menu={{ items: getUserMenuItems() }} placement="bottomRight">
                        <Avatar
                            style={{ backgroundColor: '#1890ff', cursor: 'pointer' }}
                            icon={user?.name ? null : <UserOutlined />}
                        >
                            {user?.name ? user.name.charAt(0).toUpperCase() : null}
                        </Avatar>
                    </Dropdown>
                </div>
            </Header>
            <Content style={{ margin: '24px 16px', overflow: 'initial' }}>
                <div style={{ padding: 24, background: '#fff' }}>
                    <Outlet />
                </div>
            </Content>
        </Layout>
    );
};

export default AppLayout;