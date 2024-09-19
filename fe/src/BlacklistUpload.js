import React, { useState } from 'react';
import axios from 'axios';

const BlacklistUpload = () => {
    const [selectedFile, setSelectedFile] = useState(null);  // Corrected variable name
    const [uploadStatus, setUploadStatus] =  useState('');

    // Handle file change
    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    // Handle form submission
    const handleUpload = async () => {
        if (!selectedFile){
            setUploadStatus('Please select a file to upload');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        try{
            const response = await axios.post('http://localhost:5000/blacklist/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                withCredentials: true,  // Include credentials
            });
            
            if (response.status === 200){
                setUploadStatus('File uploaded successfully');
            } else {
                setUploadStatus('Failed to upload file');
            }
        } catch (error) {
            setUploadStatus('Error: ' + error.message);
        }
    };

    return (
        <div>
            <h2>Upload Blacklist File</h2>
            <input type='file' accept='.csv' onChange={handleFileChange} />
            <button onClick={handleUpload}>Upload</button>
            <p>{uploadStatus}</p>
        </div>
    );
};

export default BlacklistUpload;
