// src/Header.test.js
import React from 'react';
import '@testing-library/jest-dom'; // Import jest-dom matchers
import { render, screen, fireEvent } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import { AuthContext } from './AuthContext';

// Mock useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

describe('Header Component', () => {
  const navigateMock = jest.fn();
  beforeEach(() => {
    useNavigate.mockReturnValue(navigateMock);
  });

  test('renders user information and buttons', () => {
    const mockAuthContextValue = {
      userEmail: 'test@example.com',
      loginTimestamp: '2024-09-10 10:00',
    };

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <Header onLogout={jest.fn()} />
      </AuthContext.Provider>
    );

    // Check if user information is displayed
    expect(screen.getByText(/Hello, test@example.com @ 2024-09-10 10:00/i)).toBeInTheDocument();

    // Check if all buttons are present
    expect(screen.getByRole('button', { name: /Manage Users/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Manage Blacklist/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
  });

  test('handles button clicks', () => {
    const onLogoutMock = jest.fn();

    const mockAuthContextValue = {
      userEmail: 'test@example.com',
      loginTimestamp: '2024-09-10 10:00',
    };

    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <Header onLogout={onLogoutMock} />
      </AuthContext.Provider>
    );

    // Simulate button clicks
    fireEvent.click(screen.getByRole('button', { name: /Manage Users/i }));
    expect(navigateMock).toHaveBeenCalledWith('/users');

    fireEvent.click(screen.getByRole('button', { name: /Manage Blacklist/i }));
    expect(navigateMock).toHaveBeenCalledWith('/blacklist');

    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(navigateMock).toHaveBeenCalledWith(-1);

    fireEvent.click(screen.getByRole('button', { name: /Logout/i }));
    expect(onLogoutMock).toHaveBeenCalled();
  });
});
