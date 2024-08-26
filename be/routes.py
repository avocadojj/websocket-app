import logging
from flask import jsonify, request
from flask_security import roles_required, auth_required, current_user, logout_user, login_user
from flask_security.utils import hash_password, send_mail
from datetime import datetime
from app import es, socketio, user_datastore, db
from models import Role, User  # Ensure Role and User models are imported

def init_routes(app):
    @app.route('/get_transactions', methods=['GET'])
    def get_transactions():
        app.logger.info("Processing /get_transactions request")
        
        try:
            index = request.args.get('index', 'default_index')
            page = int(request.args.get('page', 1))
            size = int(request.args.get('size', 10))  # Default size to 10 if not provided
            from_index = (page - 1) * size

            app.logger.debug(f"Index: {index}, Page: {page}, Size: {size}, From: {from_index}")

            if not es.indices.exists(index=index):
                app.logger.warning(f"Index '{index}' does not exist.")
                return jsonify({"error": f"Index '{index}' does not exist."}), 404

            query = {
                "query": {
                    "match_all": {}  # Adjust the query as needed
                },
                "size": size,
                "from": from_index,
                "sort": [
                    {"@timestamp": "asc"}
                ]
            }

            app.logger.debug(f"Elasticsearch query: {query}")

            res = es.search(index=index, body=query)
            transactions = res['hits']['hits']

            app.logger.debug(f"Number of transactions fetched: {len(transactions)}")

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

            app.logger.info("Successfully processed /get_transactions request")

            return jsonify({
                "total": res['hits']['total']['value'],
                "transactions": formatted_transactions
            })

        except Exception as e:
            app.logger.error(f"Error fetching transactions: {e}")
            return jsonify({"error": "Failed to fetch transactions"}), 500

    @app.route('/save_remark', methods=['POST'])
    @auth_required()
    def save_remark():
        app.logger.info("Processing /save_remark request")
        try:
            data = request.json
            doc_id = data['id']
            remark = data['remark']

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
            doc_id = data['id']
            tickbox = data['tickbox']

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
            data = request.json
            email = data['email']
            password = data['password']
            role_name = data['role']

            app.logger.debug(f"Email: {email}, Role: {role_name}")

            if user_datastore.find_user(email=email):
                app.logger.warning(f"User with email {email} already exists")
                return jsonify({"error": "User already exists"}), 400

            user = user_datastore.create_user(email=email, password=hash_password(password))
            role = user_datastore.find_role(role_name)
            if role:
                user_datastore.add_role_to_user(user, role)

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

            app.logger.debug(f"Login attempt for email: {email}")

            user = user_datastore.find_user(email=email)
            if user:
                app.logger.debug(f"User found: {user.email}")
                if user.verify_and_update_password(password):
                    app.logger.debug("Password verified successfully")
                    login_user(user)
                    return jsonify({"message": "Logged in successfully", "user_id": user.id})
                else:
                    app.logger.warning("Password verification failed")
            else:
                app.logger.warning("User not found")

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

    # Get all users
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

    # Delete user
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

    # Get Roles
    @app.route('/get_roles', methods=['GET'])
    def get_roles():
        try:
            roles = [role.name for role in Role.query.all()]
            return jsonify({"roles": roles}), 200
        except Exception as e:
            app.logger.error(f"Error fetching roles: {e}")
            return jsonify({"error": "Failed to fetch roles"}), 500