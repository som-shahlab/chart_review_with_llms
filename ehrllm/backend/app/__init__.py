from flask import Flask
from flask_cors import CORS
from .routes import api
from .services.database import MIMICIVNotesDatabase

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Initialize data service
    MIMICIVNotesDatabase.instance()

    app.register_blueprint(api, url_prefix='/api')

    return app