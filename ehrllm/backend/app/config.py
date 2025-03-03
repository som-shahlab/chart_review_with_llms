from dotenv import load_dotenv
import os
load_dotenv()

ENVIRONMENT=os.getenv("ENVIRONMENT", "dev")
IS_DEBUG = ENVIRONMENT == "dev"

def get_rel_path(path: str) -> str:
    """Get the absolute path for `path`, relative from the root of the project"""
    return os.path.abspath(os.path.join(os.path.join(os.path.dirname(__file__), '../'), path))

# Paths
PATH_TO_MIMICIV_NOTES_DIR = os.getenv("PATH_TO_MIMICIV_NOTES_DIR", get_rel_path("./data/mimiciv-notes/"))
PATH_TO_MIMICIV_DIR = os.getenv("PATH_TO_MIMICIV_DIR", get_rel_path("./data/mimiciv/"))
PATH_TO_CACHE_DIR = os.getenv("PATH_TO_CACHE_DIR", get_rel_path("./cache/"))