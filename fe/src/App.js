import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

// Establish a connection to the Socket.IO server
const socket = io('http://localhost:5000');

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [pageSize, setPageSize] = useState(10); // Number of transactions per page
  const [currentPage, setCurrentPage] = useState(1); // Current page number
  const [inputPage, setInputPage] = useState(currentPage);
  const [merchantId, setMerchantId] = useState(''); // Merchant ID for filtering
  const [merchantName, setMerchantName] = useState(''); // Merchant Name for filtering
  const [orderId, setOrderId] = useState(''); // Order ID for filtering
  const [loading, setLoading] = useState(false); // Loading indicator
  const [error, setError] = useState(null); // Error state

  useEffect(() => {
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
  }, [currentPage, pageSize, merchantId, merchantName, orderId]);

  const fetchTransactions = () => {
    setLoading(true);
    setError(null);
    axios.get('http://localhost:5000/get_transactions', {
      params: {
        index: 'test',
        page: currentPage,
        size: pageSize,
        merchant_id: merchantId,
        merchant_name: merchantName,
        order_id: orderId,
      }
    })
      .then(response => {
        setTransactions(response.data.transactions);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching transactions:", error);
        setError("Failed to fetch transactions. Please try again.");
        setLoading(false);
      });
  };

  const addRemark = (id, remark) => {
    if (!remark.trim()) {
      setError("Remark cannot be empty.");
      return;
    }
    axios.post('http://localhost:5000/save_remark', { id, remark })
      .then(response => {
        console.log("Remark saved:", response.data);
        setError(null);
      })
      .catch(error => {
        console.error("Error saving remark:", error);
        setError("Failed to save remark. Please try again.");
      });
  };

  const toggleTickbox = (id, tickbox) => {
    axios.post('http://localhost:5000/toggle_tickbox', { id, tickbox })
      .then(response => {
        console.log("Tickbox toggled:", response.data);
        setError(null);
      })
      .catch(error => {
        console.error("Error toggling tickbox:", error);
        setError("Failed to toggle tickbox. Please try again.");
      });
  };

  // Pagination calculations
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

  const toggleDetails = (id) => {
    setTransactions(transactions.map(tx =>
      tx.id === id ? { ...tx, showDetails: !tx.showDetails } : tx
    ));
  };

  return (
    <div>
      <h1>Transactions</h1>

      {error && <p className="error-message" role="alert">{error}</p>}
      {loading && <p>Loading...</p>}

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
          Merchant ID:
          <input 
            type="text" 
            value={merchantId} 
            onChange={(e) => setMerchantId(e.target.value)} 
            aria-label="Merchant ID"
          />
        </label>
      </div>

      <div>
        <label>
          Merchant Name:
          <input 
            type="text" 
            value={merchantName} 
            onChange={(e) => setMerchantName(e.target.value)} 
            aria-label="Merchant Name"
          />
        </label>
      </div>

      <div>
        <label>
          Order ID:
          <input 
            type="text" 
            value={orderId} 
            onChange={(e) => setOrderId(e.target.value)} 
            aria-label="Order ID"
          />
        </label>
      </div>

      <ul>
        {currentTransactions.map(tx => (
          <li key={tx.id}>
            <p><strong>Timestamp:</strong> {tx.timestamp}</p>
            <p><strong>Customer:</strong> {tx.data.customer_full_name}</p>
            <p><strong>Order ID:</strong> {tx.data.order_id}</p>
            <p><strong>Total Products:</strong> {tx.data.total_unique_products}</p>
            <button onClick={() => toggleDetails(tx.id)} aria-expanded={tx.showDetails}>
              {tx.showDetails ? 'Hide Details' : 'Show Details'}
            </button>
            {tx.showDetails && (
              <>
                <p><strong>Data:</strong> {JSON.stringify(tx.data)}</p>
                <p>
                  <label>
                    <input 
                      type="checkbox" 
                      checked={tx.tickbox} 
                      onChange={(e) => toggleTickbox(tx.id, e.target.checked)} 
                      aria-label="Tickbox"
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
                    aria-label="Remark"
                  />
                </p>
              </>
            )}
            <hr />
          </li>
        ))}
      </ul>

      <div>
        <button onClick={handlePreviousPage} disabled={currentPage === 1} aria-label="Previous Page">Previous</button>
        <span> Page </span>
        <input
          type="number"
          value={inputPage}
          onChange={handleInputPageChange}
          onBlur={handlePageChange}
          min="1"
          max={totalPages}
          style={{ width: "50px", textAlign: "center" }}
          aria-label="Current Page"
        />
        <span> of {totalPages} </span>
        <button onClick={handleNextPage} disabled={currentPage === totalPages} aria-label="Next Page">Next</button>
      </div>
    </div>
  );
};

export default App;
