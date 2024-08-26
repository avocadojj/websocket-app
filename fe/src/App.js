import React, { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './Login';
import ForgotPassword from './ForgotPassword';
import Header from './Header';
import Users from './Users';

const socket = io('http://localhost:5000');

const Layout = ({ children, userEmail, loginTimestamp, onLogout, onRefresh }) => {
    return (
        <div>
            <Header userEmail={userEmail} loginTimestamp={loginTimestamp} onLogout={onLogout} onRefresh={onRefresh} />
            {children}
        </div>
    );
};

const Transactions = ({ userId, userEmail, loginTimestamp, onLogout }) => {
    const [transactions, setTransactions] = useState([]);
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [inputPage, setInputPage] = useState(currentPage);
    const [orderId, setOrderId] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [newDataAvailable, setNewDataAvailable] = useState(false);
    const [highlightedIds, setHighlightedIds] = useState([]);

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
                const newTransactions = response.data.transactions;
                setTransactions(newTransactions);

                if (newDataAvailable) {
                    const newIds = newTransactions.map(tx => tx.id);
                    setHighlightedIds(newIds);
                    setTimeout(() => setHighlightedIds([]), 3000);
                }
            })
            .catch(error => {
                console.error("Error fetching transactions:", error);
                alert('Error fetching transactions: ' + error.message);
            });
    }, [currentPage, pageSize, orderId, customerId, newDataAvailable]);

    const handleRefresh = () => {
        setNewDataAvailable(false);
        fetchTransactions();
    };

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

    const totalPages = Math.ceil(transactions.length / pageSize);

    const handlePageSizeChange = (event) => {
        setPageSize(parseInt(event.target.value, 10));
        setCurrentPage(1);
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

            {newDataAvailable && (
                <div style={{ marginBottom: '10px', color: 'red' }}>
                    New data is available! <button onClick={handleRefresh}>Refresh</button>
                </div>
            )}

            <div>
                <label>
                    Page Size:
                    <select value={pageSize} onChange={handlePageSizeChange}>
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

            <table>
                <thead>
                    <tr>
                        <th>Tickbox</th>
                        <th>Timestamp</th>
                        <th>Customer</th>
                        <th>Order ID</th>
                        <th>Products</th>
                        <th>Remark</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map(tx => (
                        <tr key={tx.id} className={highlightedIds.includes(tx.id) ? 'highlighted' : ''}>
                            <td>
                                <input
                                    type="checkbox"
                                    checked={tx.tickbox}
                                    onChange={(e) => toggleTickbox(tx.id, e.target.checked)}
                                />
                            </td>
                            <td>{tx.timestamp}</td>
                            <td>{tx.data.customer_full_name}</td>
                            <td>{tx.data.order_id}</td>
                            <td>
                                {tx.data.products.map(product => (
                                    <span key={product._id}>{product.product_name} (x{product.quantity})</span>
                                )).reduce((prev, curr) => [prev, ', ', curr])}
                            </td>
                            <td>
                                <input
                                    type="text"
                                    value={tx.remark}
                                    onChange={(e) => addRemark(tx.id, e.target.value)}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

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
    const [userEmail, setUserEmail] = useState('');
    const [loginTimestamp, setLoginTimestamp] = useState('');

    const handleLogin = (userId, email) => {
        setIsAuthenticated(true);
        setUserId(userId);
        setUserEmail(email);
        setLoginTimestamp(new Date().toLocaleString());
    };

    const handleLogout = async () => {
        try {
            const response = await fetch('http://localhost:5000/logout', {
                method: 'POST',
                credentials: 'include',
            });
            if (response.ok) {
                console.log("Logged out successfully");
                setIsAuthenticated(false);
                setUserId(null);
                setUserEmail('');
                setLoginTimestamp('');
            } else {
                console.error("Logout failed");
            }
        } catch (error) {
            console.error("An error occurred during logout", error);
        }
    };

    return (
        <Router>
            <Layout userEmail={userEmail} loginTimestamp={loginTimestamp} onLogout={handleLogout} onRefresh={null}>
                <Routes>
                    <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
                    <Route path="/forgot_password" element={<ForgotPassword />} />
                    <Route path="/" element={isAuthenticated ? <Transactions userId={userId} userEmail={userEmail} loginTimestamp={loginTimestamp} onLogout={handleLogout} /> : <Navigate to="/login" />} />
                    <Route path="/users" element={isAuthenticated ? <Users /> : <Navigate to="/login" />} />
                </Routes>
            </Layout>
        </Router>
    );
};

export default App;
