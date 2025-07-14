// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Layout, Menu, Popover, Badge, List, Typography, Avatar, Button, Dropdown, Spin } from 'antd';
import { PlusOutlined, DatabaseOutlined, BellOutlined, UserOutlined, LogoutOutlined, TeamOutlined } from '@ant-design/icons';
import MasterView from './MasterView';
import AddEquipment from './AddEquipment';
import LoginPage from './LoginPage';
import UserManagement from './UserManagement';
import moment from 'moment';
import axios from 'axios';

const { Header, Content, Footer, Sider } = Layout;
const { Text } = Typography;

// --- New Logo Component ---
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

    const cirrusStyle = { color: '#4A90E2' }; // A nice blue
    const labsStyle = { color: '#D0021B' };   // A strong red

    return (
        <div style={logoStyle}>
            {collapsed ? (
                <>
                    <span style={cirrusStyle}>c</span>
                    <span style={labsStyle}>l</span>
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


const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expiringItems, setExpiringItems] = useState([]);
    const [collapsed, setCollapsed] = useState(true);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        delete axios.defaults.headers.common['x-auth-token'];
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (token && userData) {
            setUser(JSON.parse(userData));
            axios.defaults.headers.common['x-auth-token'] = token;
        }
        setLoading(false);

        const handleBeforeUnload = (e) => {
            handleLogout();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    const handleLogin = (data) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        axios.defaults.headers.common['x-auth-token'] = data.token;
    };

    const menuItems = [
        { key: '1', icon: <DatabaseOutlined />, label: <Link to="/">Asset Inventory</Link> },
    ];
    if (user?.role === 'Admin' || user?.role === 'Editor') {
        menuItems.push({ key: '2', icon: <PlusOutlined />, label: <Link to="/add">Add Equipment</Link> });
    }
    if (user?.role === 'Admin') {
        menuItems.push({ key: '3', icon: <TeamOutlined />, label: <Link to="/users">User Management</Link> });
    }

    const notificationContent = (
        <List
            header={<div>Warranty Alerts</div>}
            dataSource={expiringItems}
            renderItem={item => (
                <List.Item>
                    <List.Item.Meta
                        title={<a href="#!">{item.assetId} - {item.model}</a>}
                        description={`Expires on: ${moment(item.warrantyInfo).format('DD MMM YYYY')}`}
                    />
                    {moment(item.warrantyInfo).isBefore(moment()) ?
                        <Text type="danger">Expired</Text> :
                        <Text type="warning">Expires Soon</Text>
                    }
                </List.Item>
            )}
            style={{width: 300}}
        />
    );

    const userMenu = (
        <Menu>
            <Menu.Item key="email" disabled>
                <Text strong>{user?.email}</Text>
            </Menu.Item>
            <Menu.Item key="role" disabled>
                <Text type="secondary">Role: {user?.role}</Text>
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
                Logout
            </Menu.Item>
        </Menu>
    );

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!user) {
        return <LoginPage onLogin={handleLogin} />;
    }

    return (
        <Router>
            <Layout style={{ minHeight: '100vh' }}>
                <Sider collapsed={collapsed} onMouseEnter={() => setCollapsed(false)} onMouseLeave={() => setCollapsed(true)}>
                    {/* The placeholder div is now replaced with the new Logo component */}
                    <Logo collapsed={collapsed} />
                    <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline" items={menuItems} />
                </Sider>
                <Layout>
                    <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
                        <Popover content={notificationContent} title="Notifications" trigger="click" placement="bottomRight">
                            <Badge count={expiringItems.length}>
                                <BellOutlined style={{ fontSize: '20px', cursor: 'pointer' }} />
                            </Badge>
                        </Popover>
                        <Dropdown overlay={userMenu} placement="bottomRight">
                            <Avatar style={{ backgroundColor: '#1890ff', cursor: 'pointer' }} icon={<UserOutlined />} />
                        </Dropdown>
                    </Header>
                    <Content style={{ margin: '16px', paddingTop: '24px' }}>
                         <Routes>
                             <Route path="/" element={<MasterView user={user} setExpiringItems={setExpiringItems} />} />
                             {(user.role === 'Admin' || user.role === 'Editor') && <Route path="/add" element={<AddEquipment />} />}
                             {user.role === 'Admin' && <Route path="/users" element={<UserManagement />} />}
                             <Route path="*" element={<Navigate to="/" />} />
                         </Routes>
                    </Content>
                </Layout>
            </Layout>
        </Router>
    );
};

export default App;