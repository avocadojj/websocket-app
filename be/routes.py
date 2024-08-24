# routes.py

from flask import jsonify, request
from flask_security import roles_required, auth_required,current_user, logout_user
from datetime import datetime
from app import es, socketio, user_datastore
from models import db
from flask_security.utils import hash_password, send_mail

def init_routes(app):
    @app.route('/get_transactions', methods=['GET'])
    @auth_required()  # Ensure that only authenticated users can access this route
    def get_transactions():
        index = request.args.get('index', 'default_index')
        page = int(request.args.get('page', 1))
        size = int(request.args.get('size', 10000))
        from_index = (page - 1) * size

        try:
            if not es.indices.exists(index=index):
                return jsonify({"error": f"Index '{index}' does not exist."}), 404

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
                "total": res['hits']['total']['value'],
                "transactions": formatted_transactions
            })

        except Exception as e:
            print(f"Error fetching transactions: {e}")
            return jsonify({"error": "Failed to fetch transactions"}), 500

    @app.route('/save_remark', methods=['POST'])
    @auth_required()  # Ensure that only authenticated users can access this route
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
    @auth_required()  # Ensure that only authenticated users can access this route
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

    @app.route('/create_user', methods=['POST'])
    @roles_required('Admin')  # Ensure that only users with the 'Admin' role can access this route
    def create_user():
        data = request.json
        email = data['email']
        password = data['password']
        role_name = data['role']
        
        if user_datastore.find_user(email=email):
            return jsonify({"error": "User already exists"}), 400
        
        user = user_datastore.create_user(email=email, password=hash_password(password))
        role = user_datastore.find_role(role_name)
        if role:
            user_datastore.add_role_to_user(user, role)
        
        db.session.commit()
        return jsonify({"message": f"User {email} created with role {role_name}"}), 201

    # Route to handle user login
    @app.route('/login', methods=['POST'])
    def login():
        data = request.json
        user = user_datastore.find_user(email=data['email'])
        if user and user.verify_and_update_password(data['password']):
            login_user(user)
            return jsonify({"message": "Logged in successfully", "user_id": user.id})
        return jsonify({"error": "Invalid email or password"}), 401

    # Route to handle forgot password
    @app.route('/forgot_password', methods=['POST'])
    def forgot_password():
        data = request.json
        user = user_datastore.find_user(email=data['email'])
        if user:
            send_reset_password_instructions(user)
            return jsonify({"message": "Password reset instructions sent"})
        return jsonify({"error": "User not found"}), 404

    # Route to handle logout
    @app.route('/logout', methods=['POST'])
    @auth_required()
    def logout():
        logout_user()
        return jsonify({"message": "Logged out successfully"})