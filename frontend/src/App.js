// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import axios from 'axios';

// --- Component and Layout Imports ---
import AppLayout from './AppLayout';
import LoginPage, { AuthProvider, RoleBanner, useAuth } from './LoginPage';
import Dashboard from './Dashboard';
import AddEquipment from './AddEquipment';
import UserManagement from './UserManagement';
import InStockView from './InStockView';
import InUse from './InUse';
import DamagedProducts from './DamagedProducts';
import EWaste from './EWaste';
import WelcomePage from './WelcomePage';
import ResetPasswordPage from './ResetPasswordPage';
import RemovedAssetsTable from './RemovedAssetsTable';

// Main App Content Component (needs to be inside AuthProvider to use useAuth)
const AppContent = () => {
    const [loading, setLoading] = useState(true);
    const [expiringItems, setExpiringItems] = useState([]);
    const { user, token, logout: contextLogout, saveSession } = useAuth();

    // --- Logout Logic ---
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        contextLogout(); // Use context logout
        delete axios.defaults.headers.common['x-auth-token'];
        message.info('Logged out successfully!');
    };

    // --- Fetch expiring items ---
    const fetchExpiringItems = async (authToken) => {
        if (!authToken) return;
        try {
            const response = await axios.get('http://localhost:5000/api/equipment/expiring-warranty', {
                headers: { 'x-auth-token': authToken }
            });
            setExpiringItems(response.data);
        } catch (error) {
            console.error('Error fetching expiring items:', error.response ? error.response.data : error.message);
        }
    };

    // Initialize from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (storedToken && userData && !user) {
            try {
                const parsedUser = JSON.parse(userData);
                // Sync with AuthContext
                saveSession({ 
                    token: storedToken, 
                    user: parsedUser, 
                    info: '' // Will be fetched by context
                });
                axios.defaults.headers.common['x-auth-token'] = storedToken;
            } catch (e) {
                console.error("Failed to parse user from localStorage", e);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, [user, saveSession]);

    // Fetch expiring items when token changes
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['x-auth-token'] = token;
            fetchExpiringItems(token);
        }
    }, [token]);

    const handleLogin = (data) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Save to context (this will trigger the banner)
        saveSession(data);
        
        axios.defaults.headers.common['x-auth-token'] = data.token;
        fetchExpiringItems(data.token);
    };

    // --- Role-based route protection ---
    const ProtectedRoute = ({ children, requiredRole }) => {
        if (!user) return <Navigate to="/login" replace />;
        
        if (requiredRole) {
            const roleHierarchy = { 'Admin': 3, 'Editor': 2, 'Viewer': 1 };
            const userLevel = roleHierarchy[user.role] || 0;
            const requiredLevel = roleHierarchy[requiredRole] || 0;
            
            if (userLevel < requiredLevel) {
                message.warning(`Access denied. ${requiredRole} role required.`);
                return <Navigate to="/" replace />;
            }
        }
        
        return children;
    };

    // --- Render Logic ---
    if (loading) {
        return <Spin spinning={true} size="large" tip="Loading..." fullscreen />;
    }

    return (
        <Router>
            {/* Role banner - only shows when user is authenticated and has role info */}
            {user && <RoleBanner />}
            
            <Routes>
                {/* Conditional routing based on user authentication */}
                {!user ? (
                    // --- Routes for UN-AUTHENTICATED users ---
                    <>
                        <Route path="/" element={<WelcomePage />} />
                        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />
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
                        <Route index element={<Dashboard />} />

                        
                        {/* All users can view these pages */}

                        <Route path="in-stock" element={<InStockView user={user} />} />
                        <Route path="in-use" element={<InUse user={user} />} />
                        <Route path="damaged" element={<DamagedProducts user={user} />} />
                        <Route path="e-waste" element={<EWaste user={user} />} />
                        <Route path="removed" element={<RemovedAssetsTable user={user} />} />
                        
                        {/* Admin and Editor only pages */}
                        <Route
                            path="add"
                            element={
                                <ProtectedRoute requiredRole="Editor">
                                    <AddEquipment />
                                </ProtectedRoute>
                            }
                        />
                        
                        {/* Admin only pages */}
                        <Route
                            path="users"
                            element={
                                <ProtectedRoute requiredRole="Admin">
                                    <UserManagement user={user} />
                                </ProtectedRoute>
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

// Main App Component with AuthProvider
const App = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
