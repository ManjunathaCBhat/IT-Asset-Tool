import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import axios from 'axios';

// --- Component and Layout Imports ---
import AppLayout from './AppLayout';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard'; // <--- IMPORT THE NEW DASHBOARD COMPONENT
import MasterView from './MasterView';
import AddEquipment from './AddEquipment';
import UserManagement from './UserManagement';
import InStockView from './InStockView';
import InUse from './InUse';
import DamagedProducts from './DamagedProducts';
import EWaste from './EWaste';
import WelcomePage from './WelcomePage';

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
            // Adjust this API endpoint if your backend provides a specific one for expiring items
            const response = await axios.get('http://localhost:5000/api/equipment/expiring-warranty', {
                headers: { 'x-auth-token': token }
            });
            setExpiringItems(response.data);
        } catch (error) {
            console.error('Error fetching expiring items:', error);
            // Optionally show a message to the user
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
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
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
                        <Route index element={<Dashboard />} /> {/* <--- NEW: Dashboard as index route */}
                        <Route path="all-assets" element={<MasterView user={user} setExpiringItems={setExpiringItems} />} /> {/* <--- CHANGED PATH from / to /all-assets */}
                        <Route path="in-stock" element={<InStockView user={user} />} />
                        <Route path="in-use" element={<InUse user={user} />} />
                        <Route path="damaged" element={<DamagedProducts user={user} />} />
                        <Route path="e-waste" element={<EWaste user={user} />} />
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