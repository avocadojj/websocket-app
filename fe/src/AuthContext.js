// src/AuthContext.js
import React, { useState, createContext } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loginTimestamp, setLoginTimestamp] = useState('');

  const login = (email) => {
    setIsAuthenticated(true);
    setUserEmail(email);
    setLoginTimestamp(new Date().toLocaleString());
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserEmail('');
    setLoginTimestamp('');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userEmail,
        loginTimestamp,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
