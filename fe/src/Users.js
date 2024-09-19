// users.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: '' });
  const [message, setMessage] = useState('');

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/get_users', {
        withCredentials: true,
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage('Failed to fetch users.');
    }
  };

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const response = await axios.get('http://localhost:5000/get_roles', {
        withCredentials: true,
      });
      const fetchedRoles = response.data.roles;
      setRoles(fetchedRoles);
      if (fetchedRoles.length > 0) {
        setNewUser((currentUser) => ({ ...currentUser, role: fetchedRoles[0] }));
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      setMessage('Failed to fetch roles.');
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewUser({ ...newUser, [name]: value });
  };

  const handleCreateUser = async () => {
    try {
      const response = await axios.post(
        'http://localhost:5000/create_user',
        newUser,
        { withCredentials: true }
      );
      setMessage(response.data.message);
      setNewUser({ email: '', password: '', role: roles[0] || '' }); // Reset form
      fetchUsers(); // Refresh user list
    } catch (error) {
      console.error('Error creating user:', error);
      setMessage(error.response?.data?.error || 'Failed to create user.');
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      const response = await axios.post(
        'http://localhost:5000/delete_user',
        { id },
        { withCredentials: true }
      );
      setMessage(response.data.message);
      fetchUsers(); // Refresh user list
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage(error.response?.data?.error || 'Failed to delete user.');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const response = await axios.post(
        'http://localhost:5000/update_user',
        { id, active: !currentStatus },
        { withCredentials: true }
      );
      setMessage(response.data.message);
      fetchUsers(); // Refresh user list
    } catch (error) {
      console.error('Error updating user:', error);
      setMessage(error.response?.data?.error || 'Failed to update user.');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  return (
    <div>
      <h1>User Management</h1>
      {message && <p>{message}</p>}

      <h2>Create User</h2>
      <div>
        <label>
          Email:
          <input
            type="text"
            name="email"
            placeholder="Email"
            value={newUser.email}
            onChange={handleInputChange}
          />
        </label>
      </div>
      <div>
        <label>
          Password:
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={newUser.password}
            onChange={handleInputChange}
          />
        </label>
      </div>
      <div>
        <label>
          Role:
          <select
            name="role"
            value={newUser.role}
            onChange={handleInputChange}
          >
            {roles.map((role, index) => (
              <option key={index} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button onClick={handleCreateUser}>Create User</button>

      <h2>Existing Users</h2>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Roles</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.roles.join(', ')}</td>
              <td>{user.active ? 'Yes' : 'No'}</td>
              <td>
                <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
                <button onClick={() => handleToggleActive(user.id, user.active)}>
                  Toggle Active
                </button>
                {/* Additional actions like role assignment can be added here */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Users;
