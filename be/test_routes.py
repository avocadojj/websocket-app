import os
import io  # Add this import to fix the error
import pytest
from app import app, db
from models import Blacklist

@pytest.fixture
def client():
    # Configure the app for testing
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'  # Use an in-memory database for tests
    client = app.test_client()

    # Set up the database
    with app.app_context():
        db.create_all()

    yield client

    # Clean up
    with app.app_context():
        db.drop_all()

def test_upload_csv(client):
    """Test the CSV upload functionality"""
    csv_data = """entity_type,entity_value,description,created_at
Customer,12345,Test description,2024-09-03 05:03:52
Phone,9876543210,Fraudulent phone,2024-09-03 05:03:52
"""
    response = client.post('/blacklist/upload', data={
        'file': (io.BytesIO(csv_data.encode()), 'test.csv')
    })

    assert response.status_code == 200
    assert b"CSV uploaded and processed successfully" in response.data

    # Verify the data in the database
    with app.app_context():
        entries = Blacklist.query.all()
        assert len(entries) == 2

def test_get_blacklist(client):
    """Test fetching all blacklisted entries"""
    response = client.get('/blacklist')
    assert response.status_code == 200
    assert isinstance(response.json.get('blacklist'), list)
