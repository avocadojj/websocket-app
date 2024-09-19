import React from 'react';
import PropTypes from 'prop-types';

// Helper functions for formatting
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

const TransactionsTable = ({ transactions, expandedRows, toggleRowExpansion }) => {
    return (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
            <tr>
            <th></th>
            <th>Date</th>
            <th>Time</th>
            <th>Order Time</th>
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
                    const formattedOrderTime = tx.data['Order Time'] ? formatOrderTime(tx.data['Order Time']) : 'N/A';

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
                                <td>{formattedOrderTime}</td>
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
                                        <div style={{ padding: '10px', backgroundColor: '#f9f9f9', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            {/* First Column */}
                                            <div>
                                                <h4>Transaction Details</h4>
                                                {Object.entries(tx.data).map(([key, value]) => (
                                                    key !== 'Products' && (
                                                        <p key={key}>
                                                            <strong>{key}:</strong> {typeof value === 'string' ? value : JSON.stringify(value)}
                                                        </p>
                                                    )
                                                ))}
                                            </div>
                                            {/* Second Column */}
                                            <div>
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
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    );
                })}
            </tbody>
        </table>
    );
};

TransactionsTable.propTypes = {
    transactions: PropTypes.array.isRequired,
    expandedRows: PropTypes.array.isRequired,
    toggleRowExpansion: PropTypes.func.isRequired,
};

export default TransactionsTable;
