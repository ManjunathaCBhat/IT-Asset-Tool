import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import axios from 'axios';

// --- Component and Layout Imports ---
import AppLayout from './AppLayout';
import LoginPage from './LoginPage';
import MasterView from './MasterView';
import AddEquipment from './AddEquipment';
import UserManagement from './UserManagement';
import InStockView from './InStockView';
import InUse from './InUse';
import DamagedProducts from './DamagedProducts';

const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expiringItems, setExpiringItems] = useState([]);

    // --- Auth and Logout Logic ---
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
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            axios.defaults.headers.common['x-auth-token'] = token;
        }
        setLoading(false);
    }, []);

    const handleLogin = (data) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        axios.defaults.headers.common['x-auth-token'] = data.token;
    };

    // --- Render Logic ---
    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
    }

    return (
        <Router>
            <Routes>
                {/* If there is no user, only the login page is available */}
                {!user ? (
                    <Route path="*" element={<LoginPage onLogin={handleLogin} />} />
                ) : (
                    /* If a user is logged in, render the main AppLayout */
                    <Route
                        path="/"
                        element={
                            <AppLayout
                                user={user}
                                handleLogout={handleLogout}
                                expiringItems={expiringItems}
                            />
                        }
                    >
                        {/* Child routes are rendered inside the AppLayout's <Outlet> */}
                        <Route index element={<MasterView user={user} setExpiringItems={setExpiringItems} />} />
                        <Route path="in-stock" element={<InStockView user={user} />} />
                        <Route path="in-use" element={<InUse user={user} />} />
                        <Route path="DamagedProducts" element={<DamagedProducts user={user} />} />


                        <Route
                            path="add"
                            element={
                                (user.role === 'Admin' || user.role === 'Editor')
                                ? <AddEquipment />
                                : <Navigate to="/" />
                            }
                        />
                        <Route
                            path="users"
                            element={
                                user.role === 'Admin'
                                ? <UserManagement />
                                : <Navigate to="/" />
                            }
                        />

                        {/* A catch-all route to redirect any unknown paths to the homepage */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Route>
                )}
            </Routes>
        </Router>
    );
};

export default App;
