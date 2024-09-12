import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BlacklistUpload from './BlacklistUpload';

const BlacklistManagement = () => {
    const [blacklist, setBlacklist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch the blacklist data when the component mounts
    useEffect(() => {
        const fetchBlacklist = async () => {
            try {
                const response = await axios.get('http://localhost:5000/blacklist');
                setBlacklist(response.data.blacklist);
                setLoading(false);
            } catch (error) {
                setError('Failed to fetch blacklist data.');
                setLoading(false);
            }
        };

        fetchBlacklist();
    }, []);

    // Handle deletion of a blacklist entry
    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://localhost:5000/blacklist/${id}`);
            setBlacklist(blacklist.filter(entry => entry.id !== id));
        } catch (error) {
            setError('Failed to delete blacklist entry.');
        }
    };

    if (loading) return <p>Loading blacklist...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div>
            <h1>Blacklist Management</h1>
            <BlacklistUpload /> {/* Include the upload component */}
            
            <h2>Blacklisted Entities</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Value</th>
                        <th>Description</th>
                        <th>Created At</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {blacklist.map((entry) => (
                        <tr key={entry.id}>
                            <td>{entry.id}</td>
                            <td>{entry.entity_type}</td>
                            <td>{entry.entity_value}</td>
                            <td>{entry.description}</td>
                            <td>{entry.created_at}</td>
                            <td>
                                <button onClick={() => handleDelete(entry.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default BlacklistManagement;
