// src/App.test.js
import React from 'react';
import '@testing-library/jest-dom'; // Import jest-dom matchers
import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthContext } from './AuthContext';

// Mock socket.io-client if not already mocked
jest.mock('socket.io-client', () => {
  return () => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  });
});

describe('App Component', () => {
  test('redirects to login if not authenticated', () => {
    const authContextValue = {
      isAuthenticated: false,
      userEmail: '',
      loginTimestamp: '',
      login: jest.fn(),
      logout: jest.fn(),
    };

    render(
      <AuthContext.Provider value={authContextValue}>
        <App />
      </AuthContext.Provider>
    );

    const loginElement = screen.getByRole('heading', { name: /login/i });
    expect(loginElement).toBeInTheDocument();
  });

  test('displays the Transactions page if authenticated', () => {
    const authContextValue = {
      isAuthenticated: true,
      userEmail: 'test@example.com',
      loginTimestamp: '2024-09-10 10:00',
      login: jest.fn(),
      logout: jest.fn(),
    };

    render(
      <AuthContext.Provider value={authContextValue}>
        <App />
      </AuthContext.Provider>
    );

    const transactionsElement = screen.getByRole('heading', { name: /transactions/i });
    expect(transactionsElement).toBeInTheDocument();
  });
});
