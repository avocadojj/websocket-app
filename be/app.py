from flask import Flask
from flask_socketio import SocketIO
from elasticsearch import Elasticsearch
from config import DevelopmentConfig
from models import db, User, Role
from flask_security import Security, SQLAlchemyUserDatastore
from flask_migrate import Migrate
import logging
from logging.handlers import RotatingFileHandler
from flask_cors import CORS

# Initialize the Flask app
app = Flask(__name__)
app.config.from_object(DevelopmentConfig)  # Use the config

# Set secret key for sessions
app.secret_key = 'SECRET_KEY'  # Replace with a secure random key

# Initialize CORS and SocketIO
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
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
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
app.logger.addHandler(handler)

app.logger.setLevel(logging.DEBUG)

# Import routes after all initializations to avoid circular imports
from routes import init_routes
init_routes(app)

if __name__ == '__main__':
    app.logger.info("Start Web Fraud App")
    socketio.run(app, debug=True)
