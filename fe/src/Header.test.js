import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom'; // To handle routing context
import Header from './Header';

describe('Header Component', () => {
  test('renders user information and buttons', () => {
    render(
      <MemoryRouter>
        <Header 
          userEmail="test@example.com"
          loginTimestamp="2024-09-10 10:00"
          onLogout={jest.fn()}
          onRefresh={jest.fn()}
        />
      </MemoryRouter>
    );

    // Check if user information is displayed
    expect(screen.getByText(/Hello, test@example.com @ 2024-09-10 10:00/i)).toBeInTheDocument();

    // Check if all buttons are present
    expect(screen.getByText(/Refresh/i)).toBeInTheDocument();
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
    expect(screen.getByText(/Manage Users/i)).toBeInTheDocument();
    expect(screen.getByText(/Manage Blacklist/i)).toBeInTheDocument();
    expect(screen.getByText(/Back/i)).toBeInTheDocument();
  });

  test('handles button clicks', () => {
    const onLogoutMock = jest.fn();
    const onRefreshMock = jest.fn();

    render(
      <MemoryRouter>
        <Header 
          userEmail="test@example.com"
          loginTimestamp="2024-09-10 10:00"
          onLogout={onLogoutMock}
          onRefresh={onRefreshMock}
        />
      </MemoryRouter>
    );

    // Simulate button clicks
    fireEvent.click(screen.getByText(/Refresh/i));
    expect(onRefreshMock).toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Logout/i));
    expect(onLogoutMock).toHaveBeenCalled();
  });
});
