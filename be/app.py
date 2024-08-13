from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from elasticsearch import Elasticsearch
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

# Elasticsearch client with SSL verification disabled
es = Elasticsearch(
    hosts=["https://localhost:9200"],
    basic_auth=('elastic', 'your_password'),  # Use your Elasticsearch username and password
    verify_certs=False,
    ssl_show_warn=False
)

transactions = {}

@app.route('/es_test', methods=['GET'])
def es_test():
    try:
        res = es.info()
        return jsonify(res.body)  # Convert the response to a dictionary
    except Exception as e:
        return str(e), 500

@app.route('/get_transactions', methods=['GET'])
def get_transactions():
    index = request.args.get('index', 'test')
    try:
        res = es.search(index=index, body={"query": {"match_all": {}}})
        transactions_data = [{
            'id': hit['_id'],
            'data': hit['_source'].get('data', ''),
            'label': transactions.get(hit['_id'], {}).get('label', ''),
            'remark': transactions.get(hit['_id'], {}).get('remark', '')
        } for hit in res['hits']['hits']]
        return jsonify(transactions_data)
    except Exception as e:
        return str(e), 500

@socketio.on('label_transaction')
def handle_label_transaction(data):
    index = data.get('index', 'test')
    transactions[data['id']] = transactions.get(data['id'], {})
    transactions[data['id']]['label'] = data['label']
    emit('transaction_updated', {'id': data['id'], 'label': data['label'], 'index': index}, broadcast=True)

@socketio.on('add_remark')
def handle_add_remark(data):
    index = data.get('index', 'test')
    transactions[data['id']] = transactions.get(data['id'], {})
    transactions[data['id']]['remark'] = data['remark']
    emit('transaction_updated', {'id': data['id'], 'remark': data['remark'], 'index': index}, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True)
