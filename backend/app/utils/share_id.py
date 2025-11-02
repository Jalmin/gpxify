"""
Utility functions for generating short shareable IDs
"""
import hashlib
import secrets
import string


def generate_share_id(length: int = 8) -> str:
    """
    Generate a random short ID for sharing

    Uses cryptographically secure random generation with Base62 encoding
    (alphanumeric: a-z, A-Z, 0-9) for URL-friendly IDs

    Args:
        length: Length of the ID (default: 8 characters)

    Returns:
        Random Base62-encoded string

    Examples:
        >>> generate_share_id(8)
        'xK9mP2vL'
        >>> generate_share_id(12)
        'aB3cD4eF5gH6'
    """
    # Base62 alphabet (URL-safe, case-sensitive)
    alphabet = string.ascii_letters + string.digits  # a-zA-Z0-9

    # Generate cryptographically secure random ID
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def hash_state_to_id(state_json: dict, length: int = 8) -> str:
    """
    Generate a deterministic short ID from state JSON (alternative approach)

    Uses SHA-256 hash of the state JSON, then Base62 encodes the first N bytes

    Args:
        state_json: State dictionary to hash
        length: Length of the resulting ID

    Returns:
        Deterministic Base62-encoded hash

    Note: This approach allows deduplication (same state = same ID)
    but may have collision risks for large-scale usage
    """
    import json

    # Serialize state to stable JSON string
    json_str = json.dumps(state_json, sort_keys=True, separators=(',', ':'))

    # Generate SHA-256 hash
    hash_obj = hashlib.sha256(json_str.encode('utf-8'))
    hash_bytes = hash_obj.digest()

    # Convert to Base62
    alphabet = string.ascii_letters + string.digits
    num = int.from_bytes(hash_bytes[:6], byteorder='big')  # Use first 6 bytes

    result = []
    while num > 0 and len(result) < length:
        result.append(alphabet[num % 62])
        num //= 62

    return ''.join(result[:length])
