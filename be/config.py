# config.py

import ssl

class Config:
    SECRET_KEY = 'supersecretkey'
    CORS_ALLOWED_ORIGINS = "*"
    
    # Elasticsearch Configuration
    ES_HOST = "https://localhost:9200"
    ES_BASIC_AUTH = ('elastic', 'jV-LSiIG7v6mq7002Wns')  # Replace with your actual username and password
    SSL_CONTEXT = ssl.create_default_context(cafile="http_ca.crt")
    
    # SQLAlchemy and Flask-Security Configuration
    SQLALCHEMY_DATABASE_URI = 'postgresql://admin:admin@localhost/frauddb'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    #Login
    SECURITY_PASSWORD_SALT = 'somesalt'
    SECURITY_PASSWORD_HASH = 'bcrypt'
    SECURITY_REGISTERABLE = True
    SECURITY_RECOVERABLE = True  # Enables the forgot password feature
    SECURITY_TRACKABLE = True
    SECURITY_SEND_REGISTER_EMAIL = False
    SECURITY_SEND_PASSWORD_RESET_NOTICE_EMAIL = False
    MAIL_SERVER = 'smtp.example.com'  # Configure your SMTP server
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = 'you@example.com'
    MAIL_PASSWORD = 'yourpassword'
# Development configuration
class DevelopmentConfig(Config):
    DEBUG = True

# Production configuration
class ProductionConfig(Config):
    DEBUG = False
