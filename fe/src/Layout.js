// Layout.js
import React from 'react';
import Header from './Header';

const Layout = ({ children, userEmail, loginTimestamp, onLogout, onRefresh }) => {
    return (
        <div>
            <Header userEmail={userEmail} loginTimestamp={loginTimestamp} onLogout={onLogout} onRefresh={onRefresh} />
            {children}
        </div>
    );
};

export default Layout;
