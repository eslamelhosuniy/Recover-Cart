import traceback
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

try:
    response = client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'admin'})
    print('status_code=', response.status_code)
    print('body=', response.text)
except Exception as ex:
    traceback.print_exc()
