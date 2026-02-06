import hmac
import hashlib
import base64
import time
import requests

API_KEY = 'YOUR_API_KEY'
API_SECRET = 'YOUR_API_SECRET'

method = 'GET'
// If running in test env(nile testnet)，path prefix should be '/nile'
// If running in mainnet (mainnet), path prefix should be '/tron'
path = '/nile/api/v1/config/token/all'
timestamp = int(time.time())
message = f"{method}{path}{timestamp}"
signature = base64.b64encode(
    hmac.new(
        API_SECRET.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).digest()
).decode('utf-8')

url = 'https://open-test.gasfree.io' + path
headers = {
    'Timestamp': f'{timestamp}',
    'Authorization': f'ApiKey {API_KEY}:{signature}'
}

response = requests.get(url, headers=headers)
print(response.json())