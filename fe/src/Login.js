import React, { useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      // Get the CSRF token from the cookies
      const csrfToken = Cookies.get('csrf_token');

      // Send login request with CSRF token
      const response = await axios.post('http://localhost:5000/login', {
        email,
        password,
        csrf_token: csrfToken,  // Include CSRF token in the request
      });

      onLogin(response.data.user_id);
    } catch (error) {
      console.error("Login failed:", error);
      setError('Login failed. Please check your credentials.');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
