import os

def get_rel_path(path: str) -> str:
    """Get the absolute path for `path`, relative from the root of the project"""
    return os.path.abspath(os.path.join(os.path.join(os.path.dirname(__file__), '../'), path))