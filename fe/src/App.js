// src/App.js
import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './AuthContext';
import Header from './Header';
import BlacklistManagement from './BlacklistManagement';
import Transactions from './Transactions';
import Users from './Users';
import Login from './Login';
import './App.css';
import axios from 'axios';

function App() {
  const { isAuthenticated, login, logout } = useContext(AuthContext);

  const handleLoginSuccess = (userData) => {
    login(userData.email);
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/logout', {}, { withCredentials: true });
    } catch (error) {
      console.error('Error during logout:', error);
    }
    logout();
  };

  return (
    <Router>
      <div className="App">
        {isAuthenticated && (
          <Header onLogout={handleLogout} />
        )}
        <Routes>
          {isAuthenticated ? (
            <>
              <Route path="/blacklist" element={<BlacklistManagement />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/users" element={<Users />} />
              <Route path="/" element={<Transactions />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
