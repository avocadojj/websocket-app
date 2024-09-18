import React, { useState, useEffect } from 'react'; // Added useEffect for fetching users and roles
import axios from 'axios'; // Ensure axios is imported

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: '' });
  const [message, setMessage] = useState('');

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/get_users');
      setUsers(response.data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const response = await axios.get('http://localhost:5000/get_roles');
      const fetchedRoles = response.data.roles;
      setRoles(fetchedRoles);
      if (fetchedRoles.length > 0) {
        setNewUser(currentUser => ({ ...currentUser, role: fetchedRoles[0] }));
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      setMessage("Failed to fetch roles.");
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewUser({ ...newUser, [name]: value });
  };

  const handleCreateUser = async () => {
    try {
      const response = await axios.post('http://localhost:5000/create_user', newUser);
      setMessage(response.data.message);
      fetchUsers(); // Fetch users after creation to update the list
    } catch (error) {
      console.error("Error creating user:", error);
      setMessage('Failed to create user.');
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      const response = await axios.post('http://localhost:5000/delete_user', { id });
      setMessage(response.data.message);
      fetchUsers(); // Fetch users after deletion to update the list
    } catch (error) {
      console.error("Error deleting user:", error);
      setMessage('Failed to delete user.');
    }
  };

  // Define the handleUpdateUser function
  const handleUpdateUser = async (id, active, role) => {
    try {
      const response = await axios.post('http://localhost:5000/update_user', { id, active, role });
      setMessage(response.data.message);
      fetchUsers(); // Fetch users after update to refresh the list
    } catch (error) {
      console.error("Error updating user:", error);
      setMessage('Failed to update user.');
    }
  };

  useEffect(() => {
    fetchUsers(); // Fetch users when the component mounts
    fetchRoles(); // Fetch roles when the component mounts
  }, []);

  return (
    <div>
      <h1>User Management</h1>
      {message && <p>{message}</p>}

      <h2>Create User</h2>
      <input
        type="text"
        name="email"
        placeholder="Email"
        value={newUser.email}
        onChange={handleInputChange}
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        value={newUser.password}
        onChange={handleInputChange}
      />
      <select
        name="role"
        value={newUser.role}
        onChange={handleInputChange}
      >
        {roles.map((role, index) => (
          <option key={index} value={role}>{role}</option>
        ))}
      </select>
      <button onClick={handleCreateUser}>Create User</button>

      <h2>Existing Users</h2>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            <p>Email: {user.email}</p>
            <p>Role: {user.roles.join(', ')}</p>
            <p>Active: {user.active ? 'Yes' : 'No'}</p>
            <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
            <button onClick={() => handleUpdateUser(user.id, !user.active, user.roles[0])}>
              Toggle Active
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Users;
