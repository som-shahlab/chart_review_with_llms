from flask import Flask
from flask_cors import CORS
from .routes import api
from .databases.mimiciv import MIMICIVNotesDatabase
from .databases.n2c22018 import N2C22018CTMatchingDatabase

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Initialize data service
    try:
        MIMICIVNotesDatabase.instance()
    except Exception as e:
        print(f"Error initializing MIMICIVNotesDatabase: {e}")

    try:
        N2C22018CTMatchingDatabase.instance()
    except Exception as e:
        print(f"Error initializing N2C22018CTMatchingDatabase: {e}")
    
    app.register_blueprint(api, url_prefix='/api')

    return app