import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:5000');

const App = () => {
  const [transactions, setTransactions] = useState([]);

  // Fetch transactions from the back-end on component mount
  useEffect(() => {
    axios.get('/get_transactions')
      .then(response => {
        setTransactions(response.data);
      })
      .catch(error => {
        console.error("There was an error fetching the transactions!", error);
      });

    // Listen for updates from the WebSocket server
    socket.on('transaction_updated', (updatedTransaction) => {
      setTransactions(prevTransactions => prevTransactions.map(tx => 
        tx.id === updatedTransaction.id ? { ...tx, ...updatedTransaction } : tx
      ));
    });
  }, []);

  // Function to label a transaction
  const labelTransaction = (id, label) => {
    socket.emit('label_transaction', { id, label });
  };

  // Function to add a remark to a transaction
  const addRemark = (id, remark) => {
    socket.emit('add_remark', { id, remark });
  };

  return (
    <div>
      <h1>Transactions</h1>
      <ul>
        {transactions.map(tx => (
          <li key={tx.id}>
            {tx.data}
            <input
              type="text"
              placeholder="Label"
              onBlur={(e) => labelTransaction(tx.id, e.target.value)}
            />
            <input
              type="text"
              placeholder="Remark"
              onBlur={(e) => addRemark(tx.id, e.target.value)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;

