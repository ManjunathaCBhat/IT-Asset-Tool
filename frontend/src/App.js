import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import axios from 'axios';

/* layout & pages */
import AppLayout from './AppLayout';
import LoginPage, { AuthProvider, RoleBanner, useAuth } from './LoginPage';
import Dashboard from './Dashboard';
import AddEquipment from './AddEquipment';
import UserManagement from './UserManagement';
import InStockView from './InStockView';
import InUse from './InUse';
import DamagedProducts from './DamagedProducts';
import EWaste from './EWaste';
import RemovedAssetsTable from './RemovedAssetsTable';
import WelcomePage from './WelcomePage';
import ResetPasswordPage from './ResetPasswordPage';

/* ─────────────────────────────────────────────── */

const AppContent = () => {
  const [loading, setLoading] = useState(true);
  const [expiringItems, setExpiringItems] = useState([]);
  const { user, token, saveSession, logout: contextLogout } = useAuth();

  /* 1 ─ derive a single “can modify” flag once */
  const canModify = user && (user.role === 'Admin' || user.role === 'Editor');

  /* 2 ─ logout helper */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    contextLogout();
    delete axios.defaults.headers.common['x-auth-token'];
    message.info('Logged out successfully!');
  };

  /* 3 ─ fetch assets that are about to expire */
  const fetchExpiringItems = async (authToken) => {
    if (!authToken) return;
    try {
      const res = await axios.get(
        'http://localhost:5000/api/equipment/expiring-warranty',
        { headers: { 'x-auth-token': authToken } }
      );
      setExpiringItems(res.data);
    } catch (err) {
      console.error(
        'Error fetching expiring items:',
        err.response ? err.response.data : err.message
      );
    }
  };

  /* 4 ─ initialise context from localStorage */
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (storedToken && userData && !user) {
      try {
        saveSession({
          token: storedToken,
          user: JSON.parse(userData),
          info: '',
        });
        axios.defaults.headers.common['x-auth-token'] = storedToken;
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, [user, saveSession]);

  /* 5 ─ token-change side effects */
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['x-auth-token'] = token;
      fetchExpiringItems(token);
    }
  }, [token]);

  const handleLogin = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    saveSession(data);
    axios.defaults.headers.common['x-auth-token'] = data.token;
    fetchExpiringItems(data.token);
  };

  /* 6 ─ route-level protection helper */
  const ProtectedRoute = ({ children, requiredRole }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (requiredRole) {
      const map = { Admin: 3, Editor: 2, Viewer: 1 };
      if ((map[user.role] || 0) < (map[requiredRole] || 0)) {
        message.warning(`Access denied. ${requiredRole} role required.`);
        return <Navigate to="/" replace />;
      }
    }
    return children;
  };

  /* 7 ─ loading gate */
  if (loading) {
    return <Spin spinning size="large" tip="Loading..." fullscreen />;
  }

  /* 8 ─ routes */
  return (
    <Router>
      {user && <RoleBanner />}
      <Routes>
        {!user ? (
          /* unauthenticated */
          <>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          /* authenticated */
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
            <Route index element={<Dashboard />} />

            {/* every list page now receives canModify */}
            <Route path="in-stock"  element={<InStockView  user={user} canModify={canModify} />} />
            <Route path="in-use"    element={<InUse       user={user} canModify={canModify} />} />
            <Route path="damaged"   element={<DamagedProducts user={user} canModify={canModify} />} />
            <Route path="e-waste"   element={<EWaste      user={user} canModify={canModify} />} />
            <Route path="removed"   element={<RemovedAssetsTable user={user} canModify={canModify} />} />

            {/* editor+ */}
            <Route
              path="add"
              element={
                <ProtectedRoute requiredRole="Editor">
                  <AddEquipment />
                </ProtectedRoute>
              }
            />

            {/* admin only */}
            <Route
              path="users"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <UserManagement user={user} />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </Router>
  );
};

/* root component */
const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
