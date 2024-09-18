import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch the CSRF token from the backend when the component mounts
    axios.get('http://localhost:5000/get_csrf_token', { withCredentials: true })
      .then(response => {
        const csrfToken = response.data.csrf_token;
        Cookies.set('csrf_token', csrfToken); // Store CSRF token in cookies
        console.log('CSRF token set in cookie:', csrfToken); // Debug log
      })
      .catch(error => {
        console.error('Error fetching CSRF token:', error);
        setError('Failed to fetch CSRF token.');
      });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const csrfToken = Cookies.get('csrf_token'); // Get CSRF token from cookies
      console.log('CSRF token being sent:', csrfToken); // Debug log

      // Send login request with the CSRF token in the headers
      const response = await axios.post(
        'http://localhost:5000/home',
      );
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
