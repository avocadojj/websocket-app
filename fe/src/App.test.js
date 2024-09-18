import { render, screen } from '@testing-library/react';
import App from './App';
import React from 'react';

describe('App Component', () => {
  test('redirects to login if not authenticated', () => {
    // Directly render the App without wrapping in another Router
    render(<App />);

    const loginElement = screen.getByText(/login/i);
    expect(loginElement).toBeInTheDocument();
  });

  test('displays the Transactions page if authenticated', () => {
    // Mock the `useState` to simulate authenticated state
    jest.spyOn(React, 'useState')
      .mockImplementationOnce(() => [true, jest.fn()])  // mock isAuthenticated
      .mockImplementationOnce(() => [null, jest.fn()])  // mock userId (or other state if needed)
      .mockImplementationOnce(() => ['', jest.fn()])    // mock userEmail
      .mockImplementationOnce(() => ['', jest.fn()]);   // mock loginTimestamp

    // Directly render the App without wrapping in another Router
    render(<App />);

    const transactionsElement = screen.getByText(/transactions/i);
    expect(transactionsElement).toBeInTheDocument();
  });
});
