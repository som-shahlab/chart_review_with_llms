from ehrllm.backend.app.databases.base import BaseDatabase
from ehrllm.backend.app.services.chat import aggregate_responses, run_query_over_notes
from ehrllm.llms.models import LLM_ChatCompletionResponse, LLM_AggregateChatCompletionResponse
from ehrllm.llms.utils import DEFAULT_MODEL
from flask import Blueprint, jsonify, request
from .databases.mimiciv import MIMICIVNotesDatabase
from .databases.n2c22018 import N2C22018CTMatchingDatabase
from typing import Any, Dict, List, Optional
from loguru import logger
import uuid

api = Blueprint('api', __name__)

def get_db(settings: Dict[str, Any]) -> BaseDatabase:
    if settings.get('database') == 'mimiciv-notes':
        return MIMICIVNotesDatabase.instance()
    elif settings.get('database') == 'n2c2-2018':
        return N2C22018CTMatchingDatabase.instance()
    else:
        logger.error(f"Invalid database: {settings.get('database')}")
        raise ValueError(f"Invalid database: {settings.get('database')}")

@api.route('/patient/<patient_id>', methods=['POST'])
def get_patient_info(patient_id: str):
    data = request.json
    settings: Dict[str, Any] = data.get('settings', {})
    logger.info(f"get_patient_info() -- patient_id: {patient_id} | settings: {settings}")

    # Initialize database
    db: BaseDatabase = get_db(settings)
    logger.info(f"get_patient_info() -- patient_id: {patient_id}")

    # Confirm patient exists
    if not db.is_patient_exists(patient_id):
        return jsonify({"error": f"Patient with ID '{patient_id}' not found in database '{db.name}'"}), 400

    # Get patient data
    metadata: Dict[str, Any] = db.get_patient_metadata(patient_id)
    notes: List[Dict[str, Any]] = db.get_patient_notes(patient_id)

    return jsonify({
        "data": {
            "metadata": {
                **metadata,
                "n_notes": len(notes),
            },
            "notes" : notes,
        }
    })

@api.route('/chat', methods=['POST'])
def chat():
    data = request.json
    patient_id: str = data.get('patientId')
    messages: List[Dict[str, Any]] = data.get('messages', [])
    settings: Dict[str, Any] = data.get('settings', {})
    logger.info(f"chat() -- patient {patient_id} | n_messages: {len(messages)} | settings: {settings}")
    
    # Initialize database
    db: BaseDatabase = get_db(settings)
    model: str = settings.get('model', DEFAULT_MODEL)
    
    # Validate data
    if not patient_id or len(messages) == 0:
        return jsonify({"error": "Missing Patient ID or messages"}), 400
    patient_id = str(patient_id)
    if not db.is_patient_exists(patient_id):
        logger.error(f"chat() -- patient_id: {patient_id} not found in database '{db.name}' | type: {type(patient_id)}")
        return jsonify({"error": f"Patient with ID '{patient_id}' not found in database '{db.name}'"}), 400
    if messages[-1]['role'] != 'user':
        return jsonify({"error": "Last message must be a user message"}), 400

    # Get query from last message
    query: str = messages[-1]['content']
    
    # Load patient notes
    notes: List[Dict[str, Any]] = db.get_patient_notes(patient_id)
    
    # Run query over notes
    note_responses: Optional[List[LLM_ChatCompletionResponse]] = run_query_over_notes(messages, notes, model=model)
    if note_responses is None:
        return jsonify({"error": "Failed to run query over notes"}), 500
    logger.info(f"chat() -- received {len(note_responses)} note_responses")

    # Synthesize `note_responses` across notes
    response: Optional[LLM_AggregateChatCompletionResponse] = aggregate_responses(messages, note_responses, model=model)
    logger.info(f"chat() -- response: {response}")
    if response is None:
        return jsonify({"error": "Failed to aggregate responses"}), 500
    
    response = response.model_dump()
    return jsonify({
        "data": {
            "patient_id": patient_id,
            "query": query,
            "message_id" : uuid.uuid4(),
            "response": response,
        }
    })
