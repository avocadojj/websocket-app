from flask import jsonify, request, make_response, session, current_app
from flask_security import roles_required, auth_required, current_user, logout_user, login_user
from flask_security.utils import hash_password
from app import es, socketio, user_datastore, db
from models import Role, User, Blacklist
from datetime import datetime
import csv
import secrets

# Define the global variable `latest_timestamp` at the module level
latest_timestamp = None

def init_routes(app):

    @app.route('/home', methods=['GET'])
    def home():
        """Serve the home page."""
        return jsonify({"message": "Welcome to the Home Page!"}), 200

    @app.route('/get_transactions', methods=['GET'])
    def get_transactions():
        global latest_timestamp
        app.logger.info("Processing /get_transactions request")

        try:
            # Retrieve query parameters with default values
            index = request.args.get('index', 'default_index')
            page = int(request.args.get('page', 1))
            size_param = request.args.get('size', '10')
            size = 10000 if size_param == 'all' else int(size_param)
            from_index = (page - 1) * size
            order_id = request.args.get('order_id', None)
            customer_id = request.args.get('customer_id', None)
            current_date = datetime.utcnow().isoformat()

            app.logger.debug(f"Index: {index}, Page: {page}, Size: {size}, From: {from_index}")

            # Check if the index exists in Elasticsearch
            if not es.indices.exists(index=index):
                app.logger.warning(f"Index '{index}' does not exist.")
                return jsonify({"error": f"Index '{index}' does not exist."}), 404

            # Construct the base query to fetch transactions
            query = {
                "query": {
                    "bool": {
                        "must": [
                            {"range": {"@timestamp": {"lte": current_date}}}
                        ]
                    }
                },
                "size": size,
                "from": from_index,
                "sort": [{"@timestamp": "desc"}]  # Sort by timestamp descending
            }

            if order_id:
                query["query"]["bool"]["must"].append({"term": {"Order ID.keyword": order_id}})
            if customer_id:
                query["query"]["bool"]["must"].append({"term": {"Customer ID.keyword": customer_id}})

            app.logger.debug(f"Elasticsearch query: {query}")

            # Execute the query against Elasticsearch
            res = es.search(index=index, body=query)
            transactions = res.get('hits', {}).get('hits', [])
            app.logger.debug(f"Number of transactions fetched: {len(transactions)}")

            formatted_transactions = []
            for transaction in transactions:
                source = transaction.get('_source', {})
                utc_timestamp = source.get('@timestamp')

                formatted_transactions.append({
                    'id': transaction.get('_id', 'N/A'),
                    'timestamp': utc_timestamp if utc_timestamp else 'N/A',
                    'data': source,
                    'tickbox': source.get('tickbox', False),
                    'remark': source.get('remark', '')
                })

            new_timestamp = formatted_transactions[0]['timestamp'] if formatted_transactions else None
            if new_timestamp and (not latest_timestamp or new_timestamp > latest_timestamp):
                latest_timestamp = new_timestamp
                socketio.emit('new_data_available', {'message': 'New data available'})

            app.logger.info("Successfully processed /get_transactions request")

            return jsonify({
                "total": res.get('hits', {}).get('total', {}).get('value', 0),
                "transactions": formatted_transactions
            })
        except Exception as e:
            app.logger.error(f"Error fetching transactions: {e}")
            return jsonify({"error": "Failed to fetch transactions"}), 500

    @app.route('/get_indices', methods=['GET'])
    def get_indices():
        app.logger.info("Processing /get_indices request")
        try:
            selected_index_pattern = "low-alert*,med-alert*,high-alert*"
            indices = es.indices.get_alias(index=selected_index_pattern)
            index_list = list(indices.keys())
            app.logger.debug(f"Fetched indices: {index_list}")

            return jsonify({"indices": index_list}), 200

        except Exception as e:
            app.logger.error(f"Error fetching indices: {e}")
            return jsonify({"error": "Failed to fetch indices"}), 500

    @app.route('/save_remark', methods=['POST'])
    @auth_required()
    def save_remark():
        app.logger.info("Processing /save_remark request")
        try:
            data = request.json
            doc_id = data.get('id')
            remark = data.get('remark')

            if not doc_id or not isinstance(remark, str):
                return jsonify({"error": "Invalid data provided"}), 400

            app.logger.debug(f"Document ID: {doc_id}, Remark: {remark}")

            es.update(index='test', id=doc_id, body={"doc": {"remark": remark}})
            socketio.emit('transaction_updated', {'id': doc_id, 'remark': remark})

            app.logger.info("Successfully saved remark")
            return jsonify({"status": "success"})

        except Exception as e:
            app.logger.error(f"Error saving remark: {e}")
            return jsonify({"error": "Failed to save remark"}), 500

    @app.route('/toggle_tickbox', methods=['POST'])
    @auth_required()
    def toggle_tickbox():
        app.logger.info("Processing /toggle_tickbox request")
        try:
            data = request.json
            doc_id = data.get('id')
            tickbox = data.get('tickbox')

            if not doc_id or not isinstance(tickbox, bool):
                return jsonify({"error": "Invalid data provided"}), 400

            app.logger.debug(f"Document ID: {doc_id}, Tickbox: {tickbox}")

            es.update(index='test', id=doc_id, body={"doc": {"tickbox": tickbox}})
            socketio.emit('transaction_updated', {'id': doc_id, 'tickbox': tickbox})

            app.logger.info("Successfully toggled tickbox")
            return jsonify({"status": "success"})

        except Exception as e:
            app.logger.error(f"Error toggling tickbox: {e}")
            return jsonify({"error": "Failed to toggle tickbox"}), 500

        app.logger.info("Processing /logout request")
        try:
            logout_user()
            app.logger.info("User logged out successfully")
            return jsonify({"message": "Logged out successfully"})

        except Exception as e:
            app.logger.error(f"Error during logout: {e}")
            return jsonify({"error": "Logout failed"}), 500

    @app.route('/create_admin', methods=['GET'])
    def create_admin():
        app.logger.info("Processing /create_admin request")
        try:
            user = user_datastore.find_user(email='admin@mail.com')
            if user:
                admin_role = user_datastore.find_or_create_role(name='Admin', description='Administrator')
                if admin_role not in user.roles:
                    user_datastore.add_role_to_user(user, admin_role)
                    db.session.commit()
                    app.logger.info("Admin role added to existing user")
                    return jsonify({"message": "Admin role added to existing user!"}), 200
                return jsonify({"message": "Admin user already exists and has the admin role"}), 200

            admin_role = user_datastore.find_or_create_role(name='Admin', description='Administrator')
            user = user_datastore.create_user(email='admin@mail.com', password=hash_password('admin'))
            user_datastore.add_role_to_user(user, admin_role)
            db.session.commit()

            app.logger.info("Admin user created successfully")
            return jsonify({"message": "Admin user created!"}), 201

        except Exception as e:
            app.logger.error(f"Error creating admin: {e}")
            return jsonify({"error": "Failed to create admin"}), 500

    @app.route('/get_users', methods=['GET'])
    @roles_required('Admin')
    def get_users():
        app.logger.info("Processing /get_users request")
        try:
            users = User.query.all()
            formatted_users = [{'id': user.id, 'email': user.email, 'roles': [role.name for role in user.roles], 'active': user.active, 'confirmed_at': user.confirmed_at} for user in users]
            return jsonify({"users": formatted_users}), 200
        except Exception as e:
            app.logger.error(f"Error fetching users: {e}")
            return jsonify({"error": "Failed to fetch users"}), 500

    @app.route('/update_user', methods=['POST'])
    @roles_required('Admin')
    def update_user():
        app.logger.info("Processing /update_user request")
        try:
            data = request.json
            user_id = data.get('id')
            new_roles = data.get('roles')
            active_status = data.get('active')

            user = User.query.get(user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            if new_roles:
                user.roles.clear()
                for role_name in new_roles:
                    role = user_datastore.find_role(role_name)
                    if role:
                        user_datastore.add_role_to_user(user, role)

            if active_status is not None:
                user.active = active_status

            db.session.commit()
            return jsonify({"message": "User updated successfully"}), 200
        except Exception as e:
            app.logger.error(f"Error updating user: {e}")
            return jsonify({"error": "Failed to update user"}), 500

    @app.route('/delete_user', methods=['POST'])
    @roles_required('Admin')
    def delete_user():
        app.logger.info("Processing /delete_user request")
        try:
            data = request.json
            user_id = data.get('id')

            user = User.query.get(user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            db.session.delete(user)
            db.session.commit()
            return jsonify({"message": "User deleted successfully"}), 200
        except Exception as e:
            app.logger.error(f"Error deleting user: {e}")
            return jsonify({"error": "Failed to delete user"}), 500

    @app.route('/get_roles', methods=['GET'])
    def get_roles():
        try:
            roles = [role.name for role in Role.query.all()]
            return jsonify({"roles": roles}), 200
        except Exception as e:
            app.logger.error(f"Error fetching roles: {e}")
            return jsonify({"error": "Failed to fetch roles"}), 500

    @app.route('/blacklist', methods=['GET'])
    def get_blacklist():
        app.logger.info("Fetching all blacklisted entities")
        try:
            blacklist = Blacklist.query.all()
            result = [{"id": entry.id, "entity_type": entry.entity_type, "entity_value": entry.entity_value, "created_at": entry.created_at, "description": entry.description} for entry in blacklist]
            return jsonify({"blacklist": result}), 200
        except Exception as e:
            app.logger.error(f"Error fetching blacklist: {e}")
            return jsonify({"error": "Failed to fetch blacklist"}), 500

    @app.route('/blacklist/<int:id>', methods=['GET'])
    def get_blacklist_entry(id):
        app.logger.info(f"Fetching blacklist entry with ID: {id}")
        try:
            entry = Blacklist.query.get_or_404(id)
            result = {"id": entry.id, "entity_type": entry.entity_type, "entity_value": entry.entity_value, "created_at": entry.created_at, "description": entry.description}
            return jsonify({"blacklist": result}), 200
        except Exception as e:
            app.logger.error(f"Error fetching blacklist by ID: {e}")
            return jsonify({"error": "Failed to fetch blacklist by ID"}), 500

    @app.route('/blacklist/upload', methods=['POST'])
    def upload_blacklist():
        app.logger.info("Uploading CSV to update the blacklist")
        try:
            if 'file' not in request.files:
                return jsonify({"error": "No file provided"}), 400

            file = request.files['file']
            if file.filename == '':
                return jsonify({"error": "No file selected"}), 400

            file_data = file.read().decode('utf-8').strip()
            csv_input = csv.reader(file_data.splitlines())

            next(csv_input)

            for row in csv_input:
                row = [field.strip() for field in row]
                if len(row) != 4 or not any(row):
                    app.logger.error(f"Invalid row format: {row}")
                    continue

                entity_type, entity_value, description, created_at = row
                blacklist_entry = Blacklist(entity_type=entity_type, entity_value=entity_value, description=description, created_at=created_at)
                db.session.add(blacklist_entry)

            db.session.commit()
            return jsonify({"message": "CSV uploaded and processed successfully"}), 200

        except Exception as e:
            app.logger.error(f"Failed to process CSV upload: {e}")
            return jsonify({"error": "Failed to process CSV upload"}), 500

    @app.route('/export_blacklist', methods=['GET'])
    def export_blacklist():
        app.logger.info("Exporting blacklist data to CSV")
        try:
            export_blacklist_csv()
            return jsonify({"message": "Blacklist exported successfully"}), 200
        except Exception as e:
            app.logger.error(f"Error exporting blacklist: {e}")
            return jsonify({"error": "Failed to export blacklist"}), 500

    def export_blacklist_csv():
        try:
            blacklist_entries = Blacklist.query.all()
            current_date = datetime.now().strftime("%Y-%m-%d")
            csv_file_path = f'blacklist_export_{current_date}.csv'
            with open(csv_file_path, mode='w', newline='') as file:
                writer = csv.writer(file)
                writer.writerow(['ID', 'Entity Type', 'Entity Value', 'Description', 'Created At'])
                for entry in blacklist_entries:
                    writer.writerow([entry.id, entry.entity_type, entry.entity_value, entry.created_at])
            print(f"Blacklist exported to CSV successfully: {csv_file_path}")
        except Exception as e:
            print(f"Failed to export blacklist to CSV: {e}")
