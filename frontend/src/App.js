// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import axios from 'axios';

// --- Component and Layout Imports ---
import AppLayout from './AppLayout';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';
import MasterView from './MasterView'; // Assuming this exists
import AddEquipment from './AddEquipment'; // Assuming this exists
import UserManagement from './UserManagement'; // Assuming this exists
import InStockView from './InStockView';
import InUse from './InUse';
import DamagedProducts from './DamagedProducts'; // Assuming this exists
import EWaste from './EWaste'; // Assuming this exists
import WelcomePage from './WelcomePage'; // Assuming this exists
import ResetPasswordPage from './ResetPasswordPage'; // Assuming this exists
import RemovedAssetsTable from './RemovedAssetsTable'; // Assuming this exists

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
        message.info('Logged out successfully!');
    };

    // --- Fetch expiring items (placed here to be available for AppLayout header) ---
    const fetchExpiringItems = async (token) => {
        if (!token) return;
        try {
            const response = await axios.get('http://localhost:5000/api/equipment/expiring-warranty', {
                headers: { 'x-auth-token': token }
            });
            setExpiringItems(response.data);
        } catch (error) {
            console.error('Error fetching expiring items:', error.response ? error.response.data : error.message);
            // Optionally show a message to the user, but handle 400 errors from backend specifically if needed
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (token && userData) {
            try {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                axios.defaults.headers.common['x-auth-token'] = token;
                fetchExpiringItems(token); // Fetch expiring items on initial load if user is logged in
            } catch (e) {
                console.error("Failed to parse user from localStorage", e);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    const handleLogin = (data) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        axios.defaults.headers.common['x-auth-token'] = data.token;
        fetchExpiringItems(data.token); // Fetch expiring items after successful login
    };

    // --- Render Logic ---
    if (loading) {
        // Antd Spin tip warning fix: Use fullscreen or nested pattern
        return <Spin spinning={true} size="large" tip="Loading..." fullscreen />;
    }

    return (
        <Router>
            <Routes>
                {/* Conditional routing based on user authentication */}
                {!user ? (
                    // --- Routes for UN-AUTHENTICATED users ---
                    <>
                        <Route path="/" element={<WelcomePage />} />
                        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />
                    </>
                ) : (
                    // --- Routes for AUTHENTICATED users ---
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
                        {/* Dashboard is now the default child route for authenticated users */}
                        <Route index element={<Dashboard />} />
                        <Route path="all-assets" element={<MasterView user={user} />} />
                        <Route path="in-stock" element={<InStockView user={user} />} />
                        <Route path="in-use" element={<InUse user={user} />} />
                        <Route path="damaged" element={<DamagedProducts user={user} />} />
                        <Route path="e-waste" element={<EWaste user={user} />} />
                        <Route path="removed" element={<RemovedAssetsTable user={user} />} /> {/* New route for removed assets */}
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
                                ? <UserManagement user={user} />
                                : <Navigate to="/" />
                            }
                        />
                        {/* Fallback to Dashboard for any unknown paths for authenticated users */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                )}
            </Routes>
        </Router>
    );
};

export default App;