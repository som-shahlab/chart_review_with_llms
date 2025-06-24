import os
import hashlib

def get_rel_path(path: str) -> str:
    """Get the absolute path for `path`, relative from the root of the project"""
    return os.path.abspath(os.path.join(os.path.join(os.path.dirname(__file__), '../'), path))

def hash_str(s: str) -> str:
    """Hash a string using SHA-256"""
    return hashlib.sha256(s.encode()).hexdigest()