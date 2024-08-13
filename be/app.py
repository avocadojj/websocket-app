from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from elasticsearch import Elasticsearch

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)
es = Elasticsearch(hosts=['http://localhost:9200'])  # Specify the Elasticsearch host with scheme

# Dictionary to store labels and remarks in memory
transactions = {}

# Endpoint to fetch transactions from Elasticsearch with dynamic index
@app.route('/get_transactions', methods=['GET'])
def get_transactions():
    index = request.args.get('index', 'transactions')  # Default index is 'transactions'
    res = es.search(index=index, body={"query": {"match_all": {}}})
    transactions_data = [{
        'id': hit['_id'],
        'data': hit['_source'].get('data', ''),  # Use .get to avoid KeyError
        'label': transactions.get(hit['_id'], {}).get('label', ''),
        'remark': transactions.get(hit['_id'], {}).get('remark', '')
    } for hit in res['hits']['hits']]
    return jsonify(transactions_data)

# WebSocket event to handle labeling a transaction
@socketio.on('label_transaction')
def handle_label_transaction(data):
    index = data.get('index', 'transactions')  # Default index is 'transactions'
    transactions[data['id']] = transactions.get(data['id'], {})
    transactions[data['id']]['label'] = data['label']
    emit('transaction_updated', {'id': data['id'], 'label': data['label'], 'index': index}, broadcast=True)

# WebSocket event to handle adding a remark to a transaction
@socketio.on('add_remark')
def handle_add_remark(data):
    index = data.get('index', 'transactions')  # Default index is 'transactions'
    transactions[data['id']] = transactions.get(data['id'], {})
    transactions[data['id']]['remark'] = data['remark']
    emit('transaction_updated', {'id': data['id'], 'remark': data['remark'], 'index': index}, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True)
