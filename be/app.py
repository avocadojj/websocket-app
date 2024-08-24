from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from elasticsearch import Elasticsearch
from config import DevelopmentConfig
from models import db, User, Role
from flask_security import Security, SQLAlchemyUserDatastore
from flask_migrate import Migrate
import logging
from logging.handlers import RotatingFileHandler

# Initialize the Flask app
app = Flask(__name__)
app.config.from_object(DevelopmentConfig)  # Use the config

# Disable CSRF Protection
app.config['WTF_CSRF_ENABLED'] = False

# Initialize CORS and SocketIO
CORS(app)
socketio = SocketIO(app, cors_allowed_origins=app.config['CORS_ALLOWED_ORIGINS'])

# Setup Elasticsearch client with basic authentication
es = Elasticsearch(
    app.config['ES_HOST'],
    ssl_context=app.config['SSL_CONTEXT'],
    basic_auth=app.config['ES_BASIC_AUTH']
)

# Initialize SQLAlchemy and Flask-Migrate
db.init_app(app)
migrate = Migrate(app, db)  # This initializes Flask-Migrate

# Setup Flask-Security
user_datastore = SQLAlchemyUserDatastore(db, User, Role)
security = Security(app, user_datastore)

# Setup logging to a file
handler = RotatingFileHandler('app.log', maxBytes=100000, backupCount=3)
handler.setLevel(logging.DEBUG)  # Use DEBUG to capture more detailed logs
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
app.logger.addHandler(handler)

app.logger.setLevel(logging.DEBUG)  # Ensure the logger is set to capture debug level logs

# Import routes after all the initializations to avoid circular imports
from routes import init_routes
init_routes(app)

# Create roles before the first request
@app.before_request
def create_roles():
    app.before_request_funcs[None].remove(create_roles)
    db.create_all()
    if not Role.query.filter_by(name='Admin').first():
        user_datastore.create_role(name='Admin', description='Administrator')
    if not Role.query.filter_by(name='Fraud Analyst').first():
        user_datastore.create_role(name='Fraud Analyst', description='Handles fraud analysis')
    if not Role.query.filter_by(name='Rule Maker').first():
        user_datastore.create_role(name='Rule Maker', description='Manages rules')
    db.session.commit()

if __name__ == '__main__':
    socketio.run(app, debug=True)
