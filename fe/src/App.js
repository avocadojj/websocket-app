import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './Login';
import ForgotPassword from './ForgotPassword';
import Users from './Users';
import Transactions from './Transactions';
import Layout from './Layout'; // Ensure Layout is imported correctly

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userId, setUserId] = useState(null);
    const [userEmail, setUserEmail] = useState('');
    const [loginTimestamp, setLoginTimestamp] = useState('');

    const handleLogin = (userId, email) => {
        setIsAuthenticated(true);
        setUserId(userId);
        setUserEmail(email);
        setLoginTimestamp(new Date().toLocaleString());
    };

    const handleLogout = async () => {
        try {
            const response = await fetch('http://localhost:5000/logout', {
                method: 'POST',
                credentials: 'include',
            });
            if (response.ok) {
                console.log("Logged out successfully");
                setIsAuthenticated(false);
                setUserId(null);
                setUserEmail('');
                setLoginTimestamp('');
            } else {
                console.error("Logout failed");
            }
        } catch (error) {
            console.error("An error occurred during logout", error);
        }
    };

    return (
        <Router>
            <Routes>
                <Route
                    path="/login"
                    element={isAuthenticated ? (
                        <Navigate to="/" />
                    ) : (
                        <Login onLogin={handleLogin} />
                    )}
                />
                <Route
                    path="/forgot_password"
                    element={<ForgotPassword />}
                />
                <Route
                    path="/"
                    element={isAuthenticated ? (
                        <Layout
                            userEmail={userEmail}
                            loginTimestamp={loginTimestamp}
                            onLogout={handleLogout}
                        >
                            <Transactions
                                userId={userId}
                                userEmail={userEmail}
                                loginTimestamp={loginTimestamp}
                                onLogout={handleLogout}
                            />
                        </Layout>
                    ) : (
                        <Navigate to="/login" />
                    )}
                />
                <Route
                    path="/users"
                    element={isAuthenticated ? (
                        <Layout
                            userEmail={userEmail}
                            loginTimestamp={loginTimestamp}
                            onLogout={handleLogout}
                        >
                            <Users />
                        </Layout>
                    ) : (
                        <Navigate to="/login" />
                    )}
                />
            </Routes>
        </Router>
    );
};

export default App;
