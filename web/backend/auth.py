"""Password hashing and bearer tokens, using only the standard library."""

import hashlib
import hmac
import secrets
from datetime import timedelta

from db import now

SCRYPT_N, SCRYPT_R, SCRYPT_P = 2**14, 8, 1
TOKEN_LIFETIME = timedelta(days=30)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, n, r, p, salt, digest = stored.split("$")
        candidate = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p))
    except ValueError:
        return False
    return hmac.compare_digest(candidate.hex(), digest)


def new_token() -> tuple[str, str]:
    """Returns (token for the client, hash to store)."""
    token = secrets.token_urlsafe(32)
    return token, hash_token(token)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def token_expiry():
    return now() + TOKEN_LIFETIME
