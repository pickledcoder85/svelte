"""Make a VAPID key pair for reminder notifications (once per server).

Usage (on the server; appends to the environment file without showing the private key):
    sudo sh -c 'python -m scripts.generate_vapid_keys >> /etc/relish/relish.env'
"""
from backend.app.services.push import generate_keys

if __name__ == "__main__":
    private, public = generate_keys()
    print(f"VAPID_PRIVATE_KEY={private}")
    print(f"VAPID_PUBLIC_KEY={public}")
