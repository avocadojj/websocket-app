import React from 'react';
import { useNavigate } from 'react-router-dom';

const Header = ({ onLogout, onRefresh }) => {
    const navigate = useNavigate();

    const handleManageUsers = () => {
        navigate('/users');
    };

    const handleBack = () => {
        navigate(-1);
    };


    return (
        <header>
          <div>
            <button onClick={onRefresh}>Refresh</button>
            <button onClick={onLogout}>Logout</button>
            <button onClick={handleManageUsers}>Manage Users</button>
            <button onClick={handleBack}>Back</button>            
          </div>
        </header>
    );
};

export default Header;
