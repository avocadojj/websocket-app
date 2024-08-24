import React, { useState } from 'react';
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    axios.post('http://localhost:5000/forgot_password', { email })
      .then(response => {
        alert("Password reset instructions sent to your email.");
      })
      .catch(error => {
        console.error("Error requesting password reset:", error);
        alert("Failed to send password reset instructions.");
      });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email:</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <button type="submit">Reset Password</button>
    </form>
  );
};

export default ForgotPassword;
