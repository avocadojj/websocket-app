from flask_sqlalchemy import SQLAlchemy
from flask_security import UserMixin, RoleMixin
import uuid
from datetime import datetime

db = SQLAlchemy()

# Association table for the many-to-many relationship between roles and users
roles_users = db.Table(
    'roles_users',
    db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer(), db.ForeignKey('role.id'))
)

# Role model
class Role(db.Model, RoleMixin):
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(80), unique=True)
    description = db.Column(db.String(255))

class Blacklist(db.Model):
    __tablename__ = 'blacklist'

    id = db.Column(db.Integer, primary_key=True)
    entity_type = db.Column(db.String(100), nullable=False)
    entity_value = db.Column(db.String(255), unique=True, nullable=False)  # e.g., "Customer", "Sales", "Phone", "Address"
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'entity_type': self.entity_type,
            'entity_value': self.entity_value,
            'description': self.description,
            'created_at': self.created_at,
        }


# User model
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True)
    password = db.Column(db.String(255))
    active = db.Column(db.Boolean())
    confirmed_at = db.Column(db.DateTime())
    fs_uniquifier = db.Column(db.String(64), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))

    # New fields for tracking login activity
    current_login_at = db.Column(db.DateTime())
    last_login_at = db.Column(db.DateTime())
    current_login_ip = db.Column(db.String(100))
    last_login_ip = db.Column(db.String(100))
    login_count = db.Column(db.Integer(), default=0)

    roles = db.relationship('Role', secondary=roles_users, backref=db.backref('users', lazy='dynamic'))

    # Ensure fs_uniquifier is set when creating a new user
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.fs_uniquifier:
            self.fs_uniquifier = str(uuid.uuid4())
