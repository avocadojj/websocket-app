import React from 'react';
import PropTypes from 'prop-types';

const TransactionsTable = ({ transactions, highlightedIds }) => {
    return (
        <table>
            <thead>
                <tr>
                    <th></th> {/* Tickbox column */}
                    <th>Timestamp</th>
                    <th>Customer Full Name</th>
                    <th>Customer ID</th>
                    <th>Customer Gender</th>
                    <th>GeoIP City</th>
                    <th>Order ID</th>
                    <th>Products</th>
                    <th>Total Price</th>
                    <th>Remark</th>
                </tr>
            </thead>
            <tbody>
                {transactions.map((tx) => (
                    <tr key={tx.id} className={highlightedIds.includes(tx.id) ? 'highlighted' : ''}>
                        <td>
                            <input
                                type="checkbox"
                                checked={tx.tickbox || false}
                                onChange={(e) => console.log(`Toggle tickbox for ${tx.id}`)}
                            />
                        </td>
                        <td>{tx.timestamp}</td>
                        <td>{tx.data.customer_full_name}</td>
                        <td>{tx.data.customer_id}</td>
                        <td>{tx.data.customer_gender}</td>
                        <td>{tx.data.geoip.city_name}</td>
                        <td>{tx.data.order_id}</td>
                        <td>
                            {tx.data.products.map((product) => (
                                <span key={product._id}>
                                    {product.product_name} (x{product.quantity})
                                </span>
                            )).reduce((prev, curr) => [prev, ', ', curr], '')}
                        </td>
                        <td>{tx.data.taxful_total_price}</td>
                        <td>
                            <input
                                type="text"
                                value={tx.remark}
                                onChange={(e) => console.log(`Add remark for ${tx.id}`)}
                            />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

TransactionsTable.propTypes = {
    transactions: PropTypes.array.isRequired,
    highlightedIds: PropTypes.array.isRequired,
};

export default TransactionsTable;
