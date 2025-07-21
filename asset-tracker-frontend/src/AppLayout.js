import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
    Layout, Menu, Popover, Badge, List, Typography,
    Avatar, Dropdown
} from 'antd';
import {
    PlusOutlined, DatabaseOutlined, BellOutlined, UserOutlined,
    LogoutOutlined, TeamOutlined, CheckCircleOutlined, ToolOutlined,
    WarningOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

// --- Logo Component ---
const Logo = ({ collapsed }) => {
    const logoStyle = {
        height: '32px',
        margin: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        fontWeight: 'bold',
        color: 'white',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
    };
    const cirrusStyle = { color: '#4A90E2' };
    const labsStyle = { color: '#D0021B' };
    return (
        <div style={logoStyle}>
            {collapsed ? (
                <>
                    <span style={cirrusStyle}>C</span>
                    <span style={labsStyle}>L</span>
                </>
            ) : (
                <>
                    <span style={cirrusStyle}>cirrus</span>
                    <span style={labsStyle}>labs</span>
                </>
            )}
        </div>
    );
};

const AppLayout = ({ user, handleLogout, expiringItems }) => {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    // Define menu items based on user role
      const menuItems = [
        { key: '/', icon: <DatabaseOutlined />, label: <Link to="/">Dashboard</Link> }, // <--- NEW DASHBOARD LINK
        { key: '/all-assets', icon: <DatabaseOutlined />, label: <Link to="/all-assets">All Assets</Link> }, // <--- UPDATED PATH FOR MASTER VIEW
        { key: '/in-stock', icon: <CheckCircleOutlined />, label: <Link to="/in-stock">In Stock</Link> },
        { key: '/in-use', icon: <ToolOutlined />, label: <Link to="/in-use">In Use</Link> },
        { key: '/damaged', icon: <WarningOutlined />, label: <Link to="/damaged">Damaged Products</Link> },
        { key: '/e-waste', icon: <DeleteOutlined />, label: <Link to="/e-waste">E-Waste</Link> },
    ];

    if (user?.role === 'Admin' || user?.role === 'Editor') {
        menuItems.push({ key: '/add', icon: <PlusOutlined />, label: <Link to="/add">Add Equipment</Link> });
    }
    if (user?.role === 'Admin') {
        menuItems.push({ key: '/users', icon: <TeamOutlined />, label: <Link to="/users">User Management</Link> });
    }

    // --- Popover and Dropdown Menu Content ---
    const notificationContent = (
        <List
            header={<div>Warranty Alerts (Expires in 30 days)</div>}
            dataSource={expiringItems}
            renderItem={item => (
                <List.Item>
                    <List.Item.Meta
                        title={<a href="#!">{item.model} ({item.serialNumber})</a>}
                        description={`Expires on: ${moment(item.warrantyInfo).format('DD MMM YYYY')}`}
                    />
                    {moment(item.warrantyInfo).isBefore(moment()) ?
                        <Text type="danger">Expired</Text> :
                        <Text type="warning">Expires Soon</Text>
                    }
                </List.Item>
            )}
            style={{width: 350}}
        />
    );

    const userMenu = (
        <Menu>
            <Menu.Item key="email" disabled><Text strong>{user?.email}</Text></Menu.Item>
            <Menu.Item key="role" disabled><Text type="secondary">Role: {user?.role}</Text></Menu.Item>
            <Menu.Divider />
            <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>Logout</Menu.Item>
        </Menu>
    );

    const siderWidth = collapsed ? 80 : 200;

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                width={siderWidth}
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 10,
                }}
            >
                <Logo collapsed={collapsed} />
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                />
            </Sider>
            <Layout style={{ marginLeft: siderWidth, transition: 'margin-left 0.2s' }}>
                <Header
                    style={{
                        padding: '0 24px',
                        background: '#fff',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: '20px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        boxShadow: '0 2px 8px #f0f1f2',
                    }}
                >
                    <Popover content={notificationContent} title="Notifications" trigger="click" placement="bottomRight">
                        <Badge count={expiringItems.length}>
                            <BellOutlined style={{ fontSize: '20px', cursor: 'pointer' }} />
                        </Badge>
                    </Popover>
<Dropdown menu={{ items: userMenu.props.children.map(child => child.key === 'divider' ? { type: 'divider', key: 'divider' } : { key: child.key, label: child.props.children, icon: child.props.icon, disabled: child.props.disabled, onClick: child.props.onClick }) }} placement="bottomRight">
    <Avatar style={{ backgroundColor: '#1890ff', cursor: 'pointer' }} icon={<UserOutlined />} />
</Dropdown>
                </Header>
                <Content style={{ margin: '24px 16px', overflow: 'initial' }}>
                   <div style={{ padding: 24, background: '#fff' }}>
                        <Outlet />
                   </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default AppLayout;