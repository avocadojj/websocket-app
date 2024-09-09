// Transactions.js
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

    const fetchIndices = useCallback(() => {
        axios.get('http://localhost:5000/get_indices')
            .then(response => {
                const indexList = response.data.indices || [];
                setIndices(indexList);
                if (indexList.length > 0) {
                    setSelectedIndex(indexList[0]);
                }
            })
            .catch(error => {
                console.error("Error fetching indices:", error);
                alert('Error fetching indices: ' + error.message);
            });
    }, []);

    const fetchTransactions = useCallback(() => {
        if (!selectedIndex) return;
        axios.get('http://localhost:5000/get_transactions', {
            params: {
                index: selectedIndex,
                page: currentPage,
                size: pageSize,
                order_id: orderId || null,
                customer_id: customerId || null,
            }
        })
        .then(response => {
            const newTransactions = response.data.transactions || [];
            console.log('Raw transactions data:', newTransactions);

            setTransactions(newTransactions);
        })
        .catch(error => {
            console.error("Error fetching transactions:", error);
            alert('Error fetching transactions: ' + error.message);
        });
    }, [selectedIndex, currentPage, pageSize, orderId, customerId]);

    const handlePageChange = (event) => {
        const newPage = parseInt(event.target.value, 10);
        if (!isNaN(newPage) && newPage >= 1) {
            setCurrentPage(newPage);
            setInputPage(newPage);
        }
    };

    const handleInputPageChange = (event) => {
        setInputPage(event.target.value);
    };

    const handleNextPage = () => {
        setCurrentPage(prev => prev + 1);
        setInputPage(prev => prev + 1);
    };

    const handlePreviousPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
        setInputPage(prev => Math.max(prev - 1, 1));
    };

    const toggleRowExpansion = (id) => {
        setExpandedRows((prevExpandedRows) => 
            prevExpandedRows.includes(id) 
                ? prevExpandedRows.filter(rowId => rowId !== id) 
                : [...prevExpandedRows, id]
        );
    };

    useEffect(() => {
        fetchIndices();
    }, [fetchIndices]);

    useEffect(() => {
        fetchTransactions();

        socket.on('transaction_updated', (updatedTransaction) => {
            setTransactions((prevTransactions) =>
                prevTransactions.map((tx) =>
                    tx.id === updatedTransaction.id ? { ...tx, ...updatedTransaction } : tx
                )
            );
        });

        socket.on('new_data_available', () => {
            setNewDataAvailable(true);
        });

        return () => {
            socket.off('transaction_updated');
            socket.off('new_data_available');
        };
    }, [fetchTransactions]);

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
                <button onClick={handleNextPage}>Next</button>
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
