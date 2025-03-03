from ehrllm.llms.models import LLM_ChatCompletionResponse, LLM_AggregateChatCompletionResponse
from ehrllm.llms.prompts import (
    CHAT_SYSTEM_PROMPT, 
    CHAT_USER_QUERY_OVER_ONE_NOTE_PROMPT, 
    CHAT_USER_QUERY_AGGREGATE_RESPONSES_PROMPT
)
from ehrllm.llms.utils import call_llm_with_retries, run_in_parallel
from flask import Blueprint, jsonify, request
from .services.database import MIMICIVNotesDatabase
from typing import Any, Dict, List, Optional
from loguru import logger
import uuid

api = Blueprint('api', __name__)

def aggregate_responses(messages: List[Dict[str, Any]], responses: List[LLM_ChatCompletionResponse]) -> Dict[str, Any]:
    """Given a list of LLM_ChatCompletionResponse objects (actually dicts), 
        aggregate them into a single response"""
    query: str = messages[-1]['content']
    if messages[-1]['role'] != 'user':
        logger.error(f"Most recent message must be a user message. Instead got: {messages[-1]}")
        return None

    # Remove responses that are `is_relevant == False`
    logger.info(f"aggregate_responses() -- received {len(responses)} responses")
    responses = [ r for r in responses if r['is_relevant'] ]
    logger.info(f"aggregate_responses() -- filtered to {len(responses)} relevant responses")
    
    try:
        prompts = [
            { 'role' : 'system', 'content' : CHAT_SYSTEM_PROMPT() },
            { 'role' : 'user', 'content' : CHAT_USER_QUERY_AGGREGATE_RESPONSES_PROMPT(query, responses) },
        ]
        response = call_llm_with_retries(prompts, response_format=LLM_AggregateChatCompletionResponse)    
        return response
    except Exception as e:
        logger.error(f"Error aggregating responses: {e}")
        return None

def run_query_over_notes(messages: List[Dict[str, Any]], notes: List[Dict[str, Any]]) -> Optional[List[LLM_ChatCompletionResponse]]:
    """Given a list of messages and notes, run the conversation over each individual 
        note and return the responses"""
    query: str = messages[-1]['content']
    if messages[-1]['role'] != 'user':
        logger.error(f"Most recent message must be a user message. Instead got: {messages[-1]}")
        return None
    
    # Create prompts
    prompts: List[List[Dict[str, Any]]] = [ 
        [
            { 'role' : 'system', 'content' : CHAT_SYSTEM_PROMPT() },
            *[
                { 'role' : message['role'], 'content' : message['content'] } 
                for message in messages[:-1] # Exclude the most recent message (user's query)
            ],
            { 'role' : 'user', 'content' : CHAT_USER_QUERY_OVER_ONE_NOTE_PROMPT(query, note) } 
        ]
        for note in notes 
    ]
    
    try:
        # Send chat completion requests
        args_list = [ (p, ) for p in prompts ]
        kwargs_list = [ { 'max_retries' : 1, 'response_format' : LLM_ChatCompletionResponse } for _ in prompts ]
        responses: List[LLM_ChatCompletionResponse] = run_in_parallel(call_llm_with_retries, 
                                                                    args_list, 
                                                                    kwargs_list=kwargs_list, 
                                                                    max_workers=min(10, len(prompts)), 
                                                                    pool_strat='thread', 
                                                                    merge_strat='append')
        # Collect responses + add citation note_ids
        r_dicts: List[Dict[str, Any]] = []
        for idx in range(len(responses)):
            resp = responses[idx]
            r_dict = resp.model_dump()
            # Add note_id to this response's evidence
            for evidence in r_dict['evidence']:
                for quote in evidence['quotes']:
                    quote['note_id'] = notes[idx]['note_id']
            r_dicts.append(r_dict)

        return r_dicts
    except Exception as e:
        logger.error(f"Error running query over notes: {e}")
        return None

@api.route('/patient/<patient_id>', methods=['GET'])
def get_patient_info(patient_id: int):
    db = MIMICIVNotesDatabase.instance()
    logger.info(f"get_patient_info() -- patient_id: {patient_id}")

    # Try casting patient_id to an integer
    try:
        patient_id = int(patient_id)
    except ValueError:
        return jsonify({"error": "Patient ID must be an integer"}), 400

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
    patient_id: int = data.get('patientId')
    messages: List[Dict[str, Any]] = data.get('messages', [])
    logger.info(f"chat() -- patient {patient_id} | messages: {messages}")
    
    db = MIMICIVNotesDatabase.instance()

    # Validate data
    if not patient_id or len(messages) == 0:
        return jsonify({"error": "Missing Patient ID or messages"}), 400
    try:
        patient_id = int(patient_id)
    except:
        return jsonify({"error": f"Patient ID '{patient_id}' is invalid -- it must be an integer"}), 400
    if not db.is_patient_exists(patient_id):
        return jsonify({"error": f"Patient with ID '{patient_id}' not found"}), 400
    if messages[-1]['role'] != 'user':
        print(messages[-1])
        return jsonify({"error": "Last message must be a user message"}), 400

    # Get query from last message
    query: str = messages[-1]['content']
    
    # Load patient notes
    notes: List[Dict[str, Any]] = db.get_patient_notes(patient_id)
    
    # Run query over notes
    note_responses: Optional[List[LLM_ChatCompletionResponse]] = run_query_over_notes(messages, notes)
    if note_responses is None:
        return jsonify({"error": "Failed to run query over notes"}), 500
    logger.info(f"chat() -- received {len(note_responses)} note_responses")

    # Synthesize `note_responses` across notes
    response: LLM_AggregateChatCompletionResponse = aggregate_responses(messages, note_responses)
    if response is None:
        return jsonify({"error": "Failed to aggregate responses"}), 500
    logger.info(f"chat() -- response: {response}")
    
    response = response.model_dump()
    return jsonify({
        "data": {
            "patient_id": patient_id,
            "query": query,
            "message_id" : uuid.uuid4(),
            "response": response,
        }
    })
