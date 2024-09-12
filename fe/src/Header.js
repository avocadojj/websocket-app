import React from 'react';
import { useNavigate } from 'react-router-dom';

const Header = ({ userEmail, loginTimestamp, onLogout, onRefresh }) => {
    const navigate = useNavigate();

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
        <header>z
            <div>
                <p>Hello, {userEmail} @ {loginTimestamp}</p> {/* Display user info and login timestamp */}
                <button onClick={onRefresh}>Refresh</button>
                <button onClick={onLogout}>Logout</button>
                <button onClick={handleManageUsers}>Manage Users</button>
                <button onClick={handleBack}>Back</button>
                <button onClick={handleManageBlacklist}>Manage Blacklist</button>
            </div>
        </header>
    );
};

export default Header;
