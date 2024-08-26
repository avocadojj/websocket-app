import React from 'react';
import { Link } from 'react-router-dom';

const Header = ({ onLogout, onRefresh }) => {
    return (
        <header>
          <div>
            <button onClick={onRefresh}>Refresh</button>
            <button onClick={onLogout}>Logout</button>
            <Link to="/users">Manage Users</Link> {/* Add link to user management */}
          </div>
        </header>
    );
};

export default Header;
