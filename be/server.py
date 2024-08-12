from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from elasticsearch import Elasticsearch

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)
es = Elasticsearch()

# Dictionary to store labels and remarks in memory
transactions = {}

# Endpoint to fetch transactions from Elasticsearch
@app.route('/get_transactions', methods=['GET'])
def get_transactions():
    res = es.search(index="transactions", body={"query": {"match_all": {}}})
    transactions_data = [{
        'id': hit['_id'],
        'data': hit['_source']['data'],
        'label': transactions.get(hit['_id'], {}).get('label', ''),
        'remark': transactions.get(hit['_id'], {}).get('remark', '')
    } for hit in res['hits']['hits']]
    return jsonify(transactions_data)

# WebSocket event to handle labeling a transaction
@socketio.on('label_transaction')
def handle_label_transaction(data):
    transactions[data['id']] = transactions.get(data['id'], {})
    transactions[data['id']]['label'] = data['label']
    emit('transaction_updated', {'id': data['id'], 'label': data['label']}, broadcast=True)

# WebSocket event to handle adding a remark to a transaction
@socketio.on('add_remark')
def handle_add_remark(data):
    transactions[data['id']] = transactions.get(data['id'], {})
    transactions[data['id']]['remark'] = data['remark']
    emit('transaction_updated', {'id': data['id'], 'remark': data['remark']}, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True)

