import base64
import os
import json
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP, AES
from Crypto.Hash import SHA256

app = FastAPI(title="ECI Voter Search API")

# Allow CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ECI Public Key for request encryption (SPKI format)
PUBLIC_KEY_B64 = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArb7++BxL/YN8OIln+6FL9Gnw5DNmQ/VFZXss+J+TuQyJc891JbqbijxYQNEin2c2u+CnpXpoGQ/1gUSzDMJeNS3sNSlIUykp2dt7xIm/cmV4sZ/c769vCxVRosMfRaZJnBAah+m1X26lEhnOo0wpAB9Txr8RIyBe6h7PiQWykeJeh6UacOBBX28kgkq7+vJhW8HgB38lt32XRocznRYwS9LqR7ZweFmQhTr1+EGrqiEKCOCxMYgHR2SQckb96hZ9kWzfzeun4bUO5oXKJciLkiS1IgKieADEvYLgu129ZIpn1H+8H+8ikNNVETqEDDMtqcQcQmWppJvcWHaXAs+f8QIDAQAB"

# ECI Decryption Key for captcha decryption
DECRYPT_KEY_B64 = "SFfIO0YsOlOKawZe855n97lc4tcPkj7WWsi38yNWpalLBLZzQdkqHWYbZ0=GhSJk2raUo"[15:59]

# Common Headers for ECI Gateway API calls
COMMON_HEADERS = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.6",
    "appName": "ELECTORAL-SEARCH",
    "applicationName": "ELECTORAL-SEARCH",
    "channelidobo": "ELECTORAL-SEARCH",
    "Origin": "https://electoralsearch.eci.gov.in",
    "referer": "https://electoralsearch.eci.gov.in/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "sec-ch-ua": '"Brave";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
}

def get_pem_public_key(b64_key):
    chunks = [b64_key[i:i+64] for i in range(0, len(b64_key), 64)]
    return "-----BEGIN PUBLIC KEY-----\n" + "\n".join(chunks) + "\n-----END PUBLIC KEY-----"

def decrypt_data(encrypted_b64):
    encrypted_bytes = base64.b64decode(encrypted_b64)
    iv = encrypted_bytes[:12]
    ciphertext_with_tag = encrypted_bytes[12:]
    ciphertext = ciphertext_with_tag[:-16]
    auth_tag = ciphertext_with_tag[-16:]
    
    dec_key_bytes = base64.b64decode(DECRYPT_KEY_B64)
    cipher_aes = AES.new(dec_key_bytes, AES.MODE_GCM, nonce=iv)
    decrypted_bytes = cipher_aes.decrypt_and_verify(ciphertext, auth_tag)
    return json.loads(decrypted_bytes.decode('utf-8'))

def encrypt_payload(data):
    aes_key = os.urandom(32)
    iv = os.urandom(12)
    
    json_str = json.dumps(data, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')
    
    cipher_aes = AES.new(aes_key, AES.MODE_GCM, nonce=iv)
    ciphertext, auth_tag = cipher_aes.encrypt_and_digest(json_bytes)
    
    encrypted_payload = ciphertext + auth_tag
    
    pem_key = get_pem_public_key(PUBLIC_KEY_B64)
    rsa_key = RSA.importKey(pem_key)
    cipher_rsa = PKCS1_OAEP.new(rsa_key, hashAlgo=SHA256)
    encrypted_key = cipher_rsa.encrypt(aes_key)
    
    return {
        "encryptedPayload": base64.b64encode(encrypted_payload).decode('utf-8'),
        "encryptedKey": base64.b64encode(encrypted_key).decode('utf-8'),
        "iv": base64.b64encode(iv).decode('utf-8')
    }

class SearchRequest(BaseModel):
    epicNumber: str
    stateCd: str
    captchaId: str
    captchaData: str

@app.get("/api/captcha")
def get_captcha():
    url = "https://gateway-voters.eci.gov.in/api/v1/captcha-service/getCaptcha/sir"
    try:
        response = requests.get(url, headers=COMMON_HEADERS, timeout=15)
        if response.status_code == 200:
            res_json = response.json()
            encrypted_data = res_json.get("data")
            if encrypted_data:
                decrypted = decrypt_data(encrypted_data)
                return {
                    "status": "success",
                    "captcha_id": decrypted.get("id"),
                    "captcha_image": decrypted.get("captcha")
                }
        raise HTTPException(status_code=500, detail="Failed to retrieve captcha data from ECI gateway.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching CAPTCHA: {str(e)}")

@app.post("/api/search")
def search_voter(req: SearchRequest):
    search_payload = {
        "isPortal": True,
        "epicNumber": req.epicNumber.strip().upper(),
        "stateCd": req.stateCd.strip().upper(),
        "captchaId": req.captchaId,
        "captchaData": req.captchaData.strip(),
        "securityKey": "na"
    }
    
    try:
        encrypted_body = encrypt_payload(search_payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Encryption error: {str(e)}")
        
    search_url = "https://gateway-voters.eci.gov.in/api/v1/elastic/search-by-epic-from-national-display-v1"
    
    try:
        response = requests.post(search_url, json=encrypted_body, headers=COMMON_HEADERS, timeout=30)
        if response.status_code == 200:
            try:
                data = response.json()
                return data
            except Exception:
                raise HTTPException(status_code=500, detail=f"Response is not valid JSON. Response text: {response.text[:200]}")
        else:
            raise HTTPException(status_code=response.status_code, detail=f"ECI search failed with status code {response.status_code}. Response: {response.text[:200]}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")

# Only serve static files locally
if not os.environ.get("VERCEL"):
    from fastapi.staticfiles import StaticFiles
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)
    app.mount("/", StaticFiles(directory=parent_dir, html=True), name="static")

