import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import 'setimmediate';


describe('App Component', () => {
  test('redirects to login if not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    // Add assertions to check the expected behavior
  });
});
