import ssl
from flask import Flask, jsonify, request
from elasticsearch import Elasticsearch
from flask_socketio import SocketIO
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Configure SSL context with CA certificate
ssl_context = ssl.create_default_context(cafile="http_ca.crt")

# Setup Elasticsearch client with basic authentication
es = Elasticsearch(
    "https://localhost:9200",
    ssl_context=ssl_context,
    basic_auth=('elastic', 'jV-LSiIG7v6mq7002Wns')  # Replace with your actual username and password
)

@app.route('/get_transactions', methods=['GET'])
def get_transactions():
    index = request.args.get('index', 'default_index')
    page = int(request.args.get('page', 1))
    size = int(request.args.get('size', 10000))  # Adjust size as needed
    from_index = (page - 1) * size
    order_id = request.args.get('order_id', None)
    merchant_id = request.args.get('merchant_id', None)
    merchant_name = request.args.get('merchant_name', None)

    current_date = datetime.utcnow().isoformat()

    # Base query to fetch transactions up to the current date
    query = {
        "query": {
            "bool": {
                "must": [
                    {
                        "range": {
                            "@timestamp": {
                                "lte": current_date
                            }
                        }
                    }
                ]
            }
        },
        "size": size,
        "from": from_index,
        "sort": [
            {"@timestamp": "asc"}
        ]
    }

    # Add filtering by order_id if provided
    if order_id:
        query["query"]["bool"]["must"].append({
            "term": {"order_id": order_id}
        })

    # Add filtering by merchant_id if provided
    if merchant_id:
        query["query"]["bool"]["must"].append({
            "term": {"customer_id": merchant_id}
        })

    # Add filtering by merchant_name if provided
    if merchant_name:
        query["query"]["bool"]["must"].append({
            "match": {"customer_full_name": merchant_name}
        })

    try:
        res = es.search(index=index, body=query)
        transactions = res['hits']['hits']

        formatted_transactions = []
        for transaction in transactions:
            source = transaction['_source']
            formatted_transactions.append({
                'id': transaction['_id'],
                'timestamp': source['@timestamp'],
                'data': source,
                'tickbox': source.get('tickbox', False),
                'remark': source.get('remark', '')
            })

        return jsonify({
            "total": res['hits']['total']['value'],  # Adjusted to show total number of hits
            "transactions": formatted_transactions
        })

    except Exception as e:
        print(f"Error fetching transactions: {e}")
        return jsonify({"error": "Failed to fetch transactions"}), 500

@app.route('/save_remark', methods=['POST'])
def save_remark():
    try:
        data = request.json
        doc_id = data['id']
        remark = data['remark']

        # Update the document in Elasticsearch
        es.update(index='test', id=doc_id, body={"doc": {"remark": remark}})
        socketio.emit('transaction_updated', {'id': doc_id, 'remark': remark})
        return jsonify({"status": "success"})

    except Exception as e:
        print(f"Error saving remark: {e}")
        return jsonify({"error": "Failed to save remark"}), 500

@app.route('/toggle_tickbox', methods=['POST'])
def toggle_tickbox():
    try:
        data = request.json
        doc_id = data['id']
        tickbox = data['tickbox']

        # Update the document in Elasticsearch
        es.update(index='test', id=doc_id, body={"doc": {"tickbox": tickbox}})
        socketio.emit('transaction_updated', {'id': doc_id, 'tickbox': tickbox})
        return jsonify({"status": "success"})

    except Exception as e:
        print(f"Error toggling tickbox: {e}")
        return jsonify({"error": "Failed to toggle tickbox"}), 500

if __name__ == '__main__':
    socketio.run(app, debug=True)
