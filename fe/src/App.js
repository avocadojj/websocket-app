import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'; // Import Routes instead of Switch
import Header from './Header';
import BlacklistManagement from './BlacklistManagement';
import BlacklistUpload from './BlacklistUpload';
import Transactions from './Transactions';
import Users from './Users';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <Routes>
          {/* Updated Route configuration for React Router v6 */}
          <Route path="/blacklist" element={<BlacklistManagement />} />
          <Route path="/upload" element={<BlacklistUpload />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/users" element={<Users />} />
          {/* Default Route */}
          <Route path="/" element={<Transactions />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
