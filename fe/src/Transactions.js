import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';
import axios from 'axios';
import TransactionsTable from './TransactionsTable'; // Import TransactionsTable

const socket = io('http://localhost:5000');

const Transactions = ({ userId, userEmail, loginTimestamp, onLogout }) => {
    const [transactions, setTransactions] = useState([]);
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [inputPage, setInputPage] = useState(1);
    const [orderId, setOrderId] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [newDataAvailable, setNewDataAvailable] = useState(false);
    const [expandedRows, setExpandedRows] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState('');
    const [indices, setIndices] = useState([]);
    const [totalTransactions, setTotalTransactions] = useState(0); // To track total number of transactions

    // Fetch available indices from the server
    const fetchIndices = useCallback(async () => {
        try {
            const response = await axios.get('http://localhost:5000/get_indices');
            const indexList = response.data.indices || [];
            setIndices(indexList);
            if (indexList.length > 0) {
                setSelectedIndex(indexList[0]);
            }
        } catch (error) {
            console.error("Error fetching indices:", error);
            alert('Error fetching indices: ' + error.message);
        }
    }, []);

    // Fetch transactions from the server
    const fetchTransactions = useCallback(async () => {
        if (!selectedIndex) return;

        try {
            const response = await axios.get('http://localhost:5000/get_transactions', {
                params: {
                    index: selectedIndex,
                    page: currentPage,
                    size: pageSize,
                    order_id: orderId || null,
                    customer_id: customerId || null,
                }
            });
            const newTransactions = response.data.transactions || [];
            const total = response.data.total || 0; // Get total count from the response
            setTransactions(newTransactions);
            setTotalTransactions(total); // Update total transactions count
        } catch (error) {
            console.error("Error fetching transactions:", error);
            alert('Error fetching transactions: ' + error.message);
        }
    }, [selectedIndex, currentPage, pageSize, orderId, customerId]);

    // Handle page change
    const handlePageChange = (event) => {
        const newPage = parseInt(event.target.value, 10);
        const maxPage = Math.ceil(totalTransactions / pageSize); // Calculate max page
        if (!isNaN(newPage) && newPage >= 1 && newPage <= maxPage) {
            setCurrentPage(newPage);
            setInputPage(newPage);
        }
    };

    // Handle input page change
    const handleInputPageChange = (event) => {
        setInputPage(event.target.value);
    };

    // Handle next page
    const handleNextPage = () => {
        const maxPage = Math.ceil(totalTransactions / pageSize); // Calculate max page
        if (currentPage < maxPage) {
            setCurrentPage((prev) => prev + 1);
            setInputPage((prev) => prev + 1);
        }
    };

    // Handle previous page
    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage((prev) => Math.max(prev - 1, 1));
            setInputPage((prev) => Math.max(prev - 1, 1));
        }
    };

    // Toggle row expansion for displaying transaction details
    const toggleRowExpansion = (id) => {
        setExpandedRows((prevExpandedRows) =>
            prevExpandedRows.includes(id)
                ? prevExpandedRows.filter((rowId) => rowId !== id)
                : [...prevExpandedRows, id]
        );
    };

    // Fetch indices when component mounts
    useEffect(() => {
        fetchIndices();
    }, [fetchIndices]);

    // Fetch transactions whenever dependencies change
    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // Handle socket events and cleanup on component unmount
    useEffect(() => {
        const handleTransactionUpdated = (updatedTransaction) => {
            setTransactions((prevTransactions) =>
                prevTransactions.map((tx) =>
                    tx.id === updatedTransaction.id ? { ...tx, ...updatedTransaction } : tx
                )
            );
        };

        const handleNewDataAvailable = () => {
            setNewDataAvailable(true);
        };

        socket.on('transaction_updated', handleTransactionUpdated);
        socket.on('new_data_available', handleNewDataAvailable);

        return () => {
            socket.off('transaction_updated', handleTransactionUpdated);
            socket.off('new_data_available', handleNewDataAvailable);
        };
    }, []);

    return (
        <div>
            <h1>Transactions</h1>

            {newDataAvailable && (
                <div style={{ marginBottom: '10px', color: 'red' }}>
                    New data is available! <button onClick={fetchTransactions}>Refresh</button>
                </div>
            )}

            <div>
                <label>
                    Select Index:
                    <select value={selectedIndex} onChange={(e) => setSelectedIndex(e.target.value)}>
                        {indices.map((index) => (
                            <option key={index} value={index}>{index}</option>
                        ))}
                    </select>
                </label>
            </div>

            <div>
                <label>
                    Page Size:
                    <select value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value, 10))}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </label>
            </div>

            <div>
                <label>
                    Order ID:
                    <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
                </label>
            </div>

            <div>
                <label>
                    Customer ID:
                    <input type="text" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
                </label>
            </div>

            {/* Use TransactionsTable component */}
            <TransactionsTable
                transactions={transactions}
                expandedRows={expandedRows}
                toggleRowExpansion={toggleRowExpansion}
            />

            {/* Pagination Controls at the Bottom */}
            <div style={{ marginTop: '10px' }}>
                <button onClick={handlePreviousPage} disabled={currentPage === 1}>Previous</button>
                <input
                    type="number"
                    value={inputPage}
                    onChange={handleInputPageChange}
                    onBlur={handlePageChange}
                    min="1"
                    style={{ width: "50px", textAlign: "center" }}
                />
                <button onClick={handleNextPage} disabled={currentPage >= Math.ceil(totalTransactions / pageSize)}>Next</button>
            </div>
        </div>
    );
};

Transactions.propTypes = {
    userId: PropTypes.string,
    userEmail: PropTypes.string,
    loginTimestamp: PropTypes.string,
    onLogout: PropTypes.func.isRequired,
};

export default Transactions;
