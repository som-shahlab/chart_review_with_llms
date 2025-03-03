from app import create_app
from ehrllm.backend.app.config import IS_DEBUG

app = create_app()

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5001, debug=IS_DEBUG)