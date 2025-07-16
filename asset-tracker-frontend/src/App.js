import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spin, message } from 'antd'; // Make sure message is imported for logout feedback
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
import EWaste from './EWaste';
import WelcomePage from './WelcomePage'; // <--- IMPORT THE WELCOMEPAGE COMPONENT

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
        message.info('Logged out successfully!'); // Added message feedback
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (token && userData) {
            try {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                axios.defaults.headers.common['x-auth-token'] = token;
            } catch (e) {
                console.error("Failed to parse user from localStorage", e);
                localStorage.removeItem('user'); // Clear corrupted data
                localStorage.removeItem('token'); // Clear token if user data is bad
            }
        }
        setLoading(false);
    }, []);

    const handleLogin = (data) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        axios.defaults.headers.common['x-auth-token'] = data.token;
        // No explicit redirect needed here, as updating 'user' state handles the switch
        // to the authenticated routes, which includes the default '/' route to MasterView.
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
                        {/* Default route for non-logged-in users is the WelcomePage */}
                        <Route path="/" element={<WelcomePage />} />
                        {/* Explicit route for the LoginPage, accessible from the WelcomePage */}
                        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                        {/* Catch-all for any other unmatched path for unauthenticated users, redirects to WelcomePage */}
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
                        {/* Dashboard child routes (rendered within AppLayout's <Outlet>) */}
                        <Route index element={<MasterView user={user} setExpiringItems={setExpiringItems} />} />
                        <Route path="in-stock" element={<InStockView user={user} />} />
                        <Route path="in-use" element={<InUse user={user} />} />
                        {/* Corrected path names as discussed previously */}
                        <Route path="damaged" element={<DamagedProducts user={user} />} />
                        <Route path="e-waste" element={<EWaste user={user} />} />
                        <Route
                            path="add"
                            element={
                                (user.role === 'Admin' || user.role === 'Editor')
                                ? <AddEquipment />
                                : <Navigate to="/" /> // Redirect if not authorized
                            }
                        />
                        <Route
                            path="users"
                            element={
                                user.role === 'Admin'
                                ? <UserManagement user={user} />
                                : <Navigate to="/" /> // Redirect if not authorized
                            }
                        />

                        {/* A catch-all route for authenticated users: redirects any unknown paths to the dashboard homepage */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                )}
            </Routes>
        </Router>
    );
};

export default App;