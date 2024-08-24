import React, { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './Login';
import ForgotPassword from './ForgotPassword';

// Establish a connection to the Socket.IO server
const socket = io('http://localhost:5000');

const Transactions = ({ userId }) => {
  const [transactions, setTransactions] = useState([]);
  const [pageSize, setPageSize] = useState(10); // Number of transactions per page
  const [currentPage, setCurrentPage] = useState(1); // Current page number
  const [inputPage, setInputPage] = useState(currentPage);
  const [orderId, setOrderId] = useState(''); // Order ID for filtering
  const [customerId, setCustomerId] = useState(''); // Customer ID for filtering

  const fetchTransactions = useCallback(() => {
    axios.get('http://localhost:5000/get_transactions', {
      params: {
        index: 'test',
        page: currentPage,
        size: pageSize,
        order_id: orderId,
        customer_id: customerId,
      }
    })
      .then(response => {
        setTransactions(response.data.transactions);
      })
      .catch(error => {
        console.error("Error fetching transactions:", error);
      });
  }, [currentPage, pageSize, orderId, customerId]);

  useEffect(() => {
    // Fetch initial transactions
    fetchTransactions();

    // Listen for real-time updates
    socket.on('transaction_updated', (updatedTransaction) => {
      setTransactions((prevTransactions) =>
        prevTransactions.map((tx) =>
          tx.id === updatedTransaction.id ? { ...tx, ...updatedTransaction } : tx
        )
      );
    });

    // Cleanup on component unmount
    return () => {
      socket.off('transaction_updated');
    };
  }, [fetchTransactions]);

  const addRemark = (id, remark) => {
    axios.post('http://localhost:5000/save_remark', { id, remark })
      .then(response => {
        console.log("Remark saved:", response.data);
      })
      .catch(error => {
        console.error("Error saving remark:", error);
      });
  };

  const toggleTickbox = (id, tickbox) => {
    axios.post('http://localhost:5000/toggle_tickbox', { id, tickbox })
      .then(response => {
        console.log("Tickbox toggled:", response.data);
      })
      .catch(error => {
        console.error("Error toggling tickbox:", error);
      });
  };

  const toggleDetails = (id) => {
    setTransactions(transactions.map(tx =>
      tx.id === id ? { ...tx, showDetails: !tx.showDetails } : tx
    ));
  };

  // Calculate total pages based on the number of records and the page size
  const totalPages = Math.ceil(transactions.length / pageSize);
  const currentTransactions = transactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePageSizeChange = (event) => {
    setPageSize(parseInt(event.target.value, 10));
    setCurrentPage(1); // Reset to first page whenever page size changes
  };

  const handlePageChange = (event) => {
    const newPage = parseInt(event.target.value, 10);
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleInputPageChange = (event) => {
    setInputPage(event.target.value);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div>
      <h1>Transactions</h1>

      <div>
        <label>
          Page Size:
          <select value={pageSize} onChange={handlePageSizeChange}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Order ID:
          <input 
            type="text" 
            value={orderId} 
            onChange={(e) => setOrderId(e.target.value)} 
          />
        </label>
      </div>

      <div>
        <label>
          Customer ID:
          <input 
            type="text" 
            value={customerId} 
            onChange={(e) => setCustomerId(e.target.value)} 
          />
        </label>
      </div>

      <ul>
        {currentTransactions.map(tx => (
          <li key={tx.id}>
            <p><strong>Timestamp:</strong> {tx.timestamp}</p>
            <p><strong>Customer:</strong> {tx.data.customer_full_name}</p>
            <p><strong>Order ID:</strong> {tx.data.order_id}</p>
            <button onClick={() => toggleDetails(tx.id)} aria-expanded={tx.showDetails}>
              {tx.showDetails ? 'Hide Details' : 'Show Details'}
            </button>
            {tx.showDetails && (
              <>
                <p><strong>Products:</strong> {tx.data.products.map(product => (
                  <span key={product._id}>{product.product_name} (x{product.quantity})</span>
                )).reduce((prev, curr) => [prev, ', ', curr])}</p>
                <p><strong>Data:</strong> {JSON.stringify(tx.data)}</p>
                <p>
                  <label>
                    <input 
                      type="checkbox" 
                      checked={tx.tickbox} 
                      onChange={(e) => toggleTickbox(tx.id, e.target.checked)} 
                    />
                    Tickbox
                  </label>
                </p>
                <p>
                  <label>Remark:</label>
                  <input 
                    type="text" 
                    value={tx.remark} 
                    onChange={(e) => addRemark(tx.id, e.target.value)} 
                  />
                </p>
              </>
            )}
            <hr />
          </li>
        ))}
      </ul>

      <div>
        <button onClick={handlePreviousPage} disabled={currentPage === 1}>Previous</button>
        <span> Page </span>
        <input
          type="number"
          value={inputPage}
          onChange={handleInputPageChange}
          onBlur={handlePageChange}
          min="1"
          max={totalPages}
          style={{ width: "50px", textAlign: "center" }}
        />
        <span> of {totalPages} </span>
        <button onClick={handleNextPage} disabled={currentPage === totalPages}>Next</button>
      </div>
    </div>
  );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);

  const handleLogin = (userId) => {
    setIsAuthenticated(true);
    setUserId(userId);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
        <Route path="/forgot_password" element={<ForgotPassword />} />
        <Route path="/" element={isAuthenticated ? <Transactions userId={userId} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;
