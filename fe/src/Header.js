// src/Header.js
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

const Header = ({ onLogout }) => {
  const navigate = useNavigate();
  const { userEmail, loginTimestamp } = useContext(AuthContext);

  const handleManageUsers = () => {
    navigate('/users');
  };

  const handleManageBlacklist = () => {
    navigate('/blacklist');
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <header>
      <div>
        <p>Hello, {userEmail} @ {loginTimestamp}</p>
        <button onClick={handleManageUsers}>Manage Users</button>
        <button onClick={handleBack}>Back</button>
        <button onClick={handleManageBlacklist}>Manage Blacklist</button>
        <button onClick={onLogout}>Logout</button>
      </div>
    </header>
  );
};

export default Header;
