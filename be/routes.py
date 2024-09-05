import logging
from flask import jsonify, request
from flask_security import roles_required, auth_required, current_user, logout_user, login_user
from flask_security.utils import hash_password, send_mail
from datetime import datetime
import pytz
from app import es, socketio, user_datastore, db
from models import Role, User

# Define the global variable `latest_timestamp` at the module level
latest_timestamp = None

def init_routes(app):

    @app.route('/get_transactions', methods=['GET'])
    def get_transactions():
        global latest_timestamp

        app.logger.info("Processing /get_transactions request")

        try:
            # Retrieve query parameters with default values
            index = request.args.get('index', 'default_index')
            page = int(request.args.get('page', 1))

            # Check if the size parameter is 'all' and set size accordingly
            size_param = request.args.get('size', '10')
            if size_param == 'all':
                size = 10000  # Set a large number to fetch all results; adjust as needed
            else:
                size = int(size_param)

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
                    {"@timestamp": "desc"}  # Sort by timestamp descending
                ]
            }

            # Add filtering by order_id if provided
            if order_id:
                query["query"]["bool"]["must"].append({
                    "term": {"Order ID.keyword": order_id}  # Adjust to match Elasticsearch field
                })

            # Add filtering by customer_id if provided
            if customer_id:
                query["query"]["bool"]["must"].append({
                    "term": {"Customer ID.keyword": customer_id}  # Adjust to match Elasticsearch field
                })

            app.logger.debug(f"Elasticsearch query: {query}")

            # Execute the query against Elasticsearch
            res = es.search(index=index, body=query)
            transactions = res.get('hits', {}).get('hits', [])

            app.logger.debug(f"Number of transactions fetched: {len(transactions)}")

            # Format the fetched transactions
            formatted_transactions = []
            for transaction in transactions:
                source = transaction.get('_source', {})
                utc_timestamp = source.get('@timestamp')

                # Append formatted transaction data
                formatted_transactions.append({
                    'id': transaction.get('_id', 'N/A'),
                    'timestamp': utc_timestamp if utc_timestamp else 'N/A',
                    'data': source,  # Include all data here
                    'tickbox': source.get('tickbox', False),
                    'remark': source.get('remark', '')
                })

            # Check if there is new data based on the timestamp
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
            # Define the pattern or list of indices to fetch
            selected_index_pattern = "low-alert*,med-alert*,high-alert*"  # Use patterns or specific indices

            # Fetch only the indices matching the pattern
            indices = es.indices.get_alias(index=selected_index_pattern)
            index_list = list(indices.keys())

            # Log the fetched indices
            app.logger.debug(f"Fetched indices: {index_list}")

            return jsonify({"indices": index_list}), 200

        except NotFoundError as e:
            # More specific error handling for index not found
            app.logger.error(f"Index not found: {e.info.get('index')}")
            return jsonify({"error": f"Index not found: {e.info.get('index')}" }), 404

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

    @app.route('/create_user', methods=['POST'])
    @roles_required('Admin')
    def create_user():
        app.logger.info("Processing /create_user request")
        try:
            if not current_user.is_authenticated:
                app.logger.warning("User is not authenticated")
                return jsonify({"error": "Not authenticated"}), 403

            if 'Admin' not in [role.name for role in current_user.roles]:
                app.logger.warning(f"User {current_user.email} does not have the Admin role")
                return jsonify({"error": "Forbidden"}), 403

            data = request.json
            email = data.get('email')
            password = data.get('password')
            role_name = data.get('role')

            if not email or not password or not role_name:
                return jsonify({"error": "Invalid data provided"}), 400

            app.logger.debug(f"Email: {email}, Role: {role_name}")

            if user_datastore.find_user(email=email):
                app.logger.warning(f"User with email {email} already exists")
                return jsonify({"error": "User already exists"}), 400

            user = user_datastore.create_user(email=email, password=hash_password(password))
            role = user_datastore.find_role(role_name)
            if role:
                user_datastore.add_role_to_user(user, role)
            else:
                app.logger.warning(f"Role {role_name} does not exist")
                return jsonify({"error": f"Role {role_name} does not exist"}), 400

            db.session.commit()
            app.logger.info(f"User {email} created successfully with role {role_name}")
            return jsonify({"message": f"User {email} created with role {role_name}"}), 201

        except Exception as e:
            app.logger.error(f"Error creating user: {e}")
            return jsonify({"error": "Failed to create user"}), 500

    @app.route('/login', methods=['POST'])
    def login():
        app.logger.info("Processing /login request")
        try:
            data = request.json
            email = data.get('email')
            password = data.get('password')

            if not email or not password:
                return jsonify({"error": "Invalid email or password provided"}), 400

            app.logger.debug(f"Login attempt for email: {email}")

            user = user_datastore.find_user(email=email)
            if user and user.verify_and_update_password(password):
                app.logger.debug("Password verified successfully")
                login_user(user)
                app.logger.debug(f"User logged in successfully")
                return jsonify({"message": "Logged in successfully", "user_id": user.id})
            else:
                app.logger.warning("Invalid credentials")

            return jsonify({"error": "Invalid email or password"}), 401

        except Exception as e:
            app.logger.error(f"Error during login: {e}")
            return jsonify({"error": "Login failed"}), 500

    @app.route('/forgot_password', methods=['POST'])
    def forgot_password():
        app.logger.info("Processing /forgot_password request")
        try:
            data = request.json
            email = data.get('email')

            user = user_datastore.find_user(email=email)
            if user:
                send_reset_password_instructions(user)
                app.logger.info(f"Password reset instructions sent to {email}")
                return jsonify({"message": "Password reset instructions sent"})
            app.logger.warning(f"User not found: {email}")
            return jsonify({"error": "User not found"}), 404

        except Exception as e:
            app.logger.error(f"Error during forgot password: {e}")
            return jsonify({"error": "Failed to process forgot password"}), 500

    @app.route('/logout', methods=['POST'])
    @auth_required()
    def logout():
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
            formatted_users = []
            for user in users:
                formatted_users.append({
                    'id': user.id,
                    'email': user.email,
                    'roles': [role.name for role in user.roles],
                    'active': user.active,
                    'confirmed_at': user.confirmed_at
                })

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
            new_roles = data.get('roles')  # Expecting a list of roles
            active_status = data.get('active')

            user = User.query.get(user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404

            if new_roles:
                # Clear existing roles and assign new roles
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
