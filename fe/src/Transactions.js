import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';
import axios from 'axios';

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

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // Format: DD/MM/YYYY
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
        return `${hours}:${minutes}:${seconds},${milliseconds}`; // Format: HH:MM:SS,ms
    };

    const formatOrderTime = (dateString) => {
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('en-GB'); // Format: DD/MM/YYYY
        const formattedTime = formatTime(dateString); // Format: HH:MM:SS,ms
        return `${formattedDate}, ${formattedTime}`;
    };

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

            {/* Table to show transaction data */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th></th> {/* Column for toggle button */}
                        <th>Date</th>
                        <th>Time</th>
                        <th>Order Time</th> {/* New Order Time Column */}
                        <th>Customer Full Name</th>
                        <th>Customer ID</th>
                        <th>Customer Gender</th>
                        <th>Location</th>
                        <th>Order ID</th>
                        <th>Products</th>
                        <th>Total Price</th>
                        <th>Label</th>
                        <th>Remark</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((tx) => {
                        const formattedDate = formatDate(tx.timestamp || tx.data['@timestamp']);
                        const formattedTime = formatTime(tx.timestamp || tx.data['@timestamp']);
                        const formattedOrderTime = tx.data['Order Time'] ? formatOrderTime(tx.data['Order Time']) : 'N/A'; // Format Order Time

                        return (
                            <React.Fragment key={tx.id}>
                                <tr>
                                    <td>
                                        <button 
                                            style={{ background: 'none', border: 'none', cursor: 'pointer' }} 
                                            onClick={() => toggleRowExpansion(tx.id)}
                                        >
                                            {expandedRows.includes(tx.id) ? '▼' : '▶'}
                                        </button>
                                    </td>
                                    <td>{formattedDate}</td>
                                    <td>{formattedTime}</td>
                                    <td>{formattedOrderTime}</td> {/* Display Order Time */}
                                    <td>{tx.data['Customer Name']}</td>
                                    <td>{tx.data['Customer ID']}</td>
                                    <td>{tx.data['Customer Gender']}</td>
                                    <td>{`${tx.data['GeoIP City Name']}, ${tx.data['GeoIP Continent Name']}, ${tx.data['GeoIP Country ISO Code']}`}</td>
                                    <td>{tx.data['Order ID']}</td>
                                    <td>{tx.data.Products ? tx.data.Products.map(p => p['Product Name']).join(', ') : 'No Products'}</td>
                                    <td>{tx.data['Total Price']}</td>
                                    <td>
                                        <select>
                                            <option>Genuine</option>
                                            <option>Fraudulent</option>
                                            <option>Suspicious</option>
                                        </select>
                                    </td>
                                    <td>
                                        <input type="text" defaultValue={tx.remark} />
                                    </td>
                                </tr>
                                {expandedRows.includes(tx.id) && (
                                    <tr>
                                        <td colSpan="13">
                                            <div style={{ padding: '10px', backgroundColor: '#f9f9f9' }}>
                                                <h4>Transaction Details</h4>
                                                {Object.entries(tx.data).map(([key, value]) => (
                                                    key !== 'Products' && (
                                                        <p key={key}>
                                                            <strong>{key}:</strong> {typeof value === 'string' ? value : JSON.stringify(value)}
                                                        </p>
                                                    )
                                                ))}
                                                <h5>Products:</h5>
                                                {tx.data.Products && tx.data.Products.map((product, index) => (
                                                    <div key={index}>
                                                        {Object.entries(product).map(([key, value]) => (
                                                            <p key={key}>
                                                                <strong>{key}:</strong> {value}
                                                            </p>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>

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
