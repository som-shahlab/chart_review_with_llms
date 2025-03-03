from typing import Any, Dict, List, Optional
from ehrllm.backend.app.models import Note
from loguru import logger
from ehrllm.llms.models import LLM_ChatCompletionResponse, LLM_AggregateChatCompletionResponse
from ehrllm.llms.prompts import (
    CHAT_SYSTEM_PROMPT, 
    CHAT_USER_QUERY_OVER_ONE_NOTE_PROMPT, 
    CHAT_USER_QUERY_AGGREGATE_RESPONSES_PROMPT
)
from ehrllm.llms.utils import call_llm_with_retries, run_in_parallel


def aggregate_responses(messages: List[Dict[str, Any]], responses: List[LLM_ChatCompletionResponse], **kwargs) -> Optional[LLM_AggregateChatCompletionResponse]:
    """Given a list of LLM_ChatCompletionResponse objects (actually dicts), 
        aggregate them into a single response"""
    query: str = messages[-1]['content']
    if messages[-1]['role'] != 'user':
        logger.error(f"Most recent message must be a user message. Instead got: {messages[-1]}")
        return None

    # Remove responses that are `is_relevant == False`
    logger.info(f"aggregate_responses() -- received {len(responses)} responses")
    responses = [ r for r in responses if r.is_relevant ]
    logger.info(f"aggregate_responses() -- filtered to {len(responses)} relevant responses")
    
    try:
        prompts = [
            { 'role' : 'system', 'content' : CHAT_SYSTEM_PROMPT() },
            { 'role' : 'user', 'content' : CHAT_USER_QUERY_AGGREGATE_RESPONSES_PROMPT(query, responses) },
        ]
        response = call_llm_with_retries(prompts, response_format=LLM_AggregateChatCompletionResponse, **kwargs)
        return response
    except Exception as e:
        logger.error(f"Error aggregating responses: {e}")
        return None

def run_query_over_notes(messages: List[Dict[str, Any]], notes: List[Note], **kwargs) -> Optional[List[LLM_ChatCompletionResponse]]:
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
            { 'role' : 'user', 'content' : CHAT_USER_QUERY_OVER_ONE_NOTE_PROMPT(query, note.text) } 
        ]
        for note in notes 
    ]
    
    try:
        # Send chat completion requests
        args_list = [ (p, ) for p in prompts ]
        kwargs_list = [ { **kwargs, 'max_retries' : 2, 'response_format' : LLM_ChatCompletionResponse } for _ in prompts ]
        responses: List[LLM_ChatCompletionResponse] = run_in_parallel(call_llm_with_retries, 
                                                                    args_list, 
                                                                    kwargs_list=kwargs_list, 
                                                                    max_workers=min(10, len(prompts)), 
                                                                    pool_strat='thread', 
                                                                    merge_strat='append')
        # Collect responses + add citation note_ids
        for idx, r in enumerate(responses):
            for evidence in r.evidence:
                for quote in evidence.quotes:
                    quote.source = notes[idx].note_id
        # r_dicts: List[Dict[str, Any]] = []
        # for idx in range(len(responses)):
        #     resp = responses[idx]
        #     r_dict = resp.model_dump()
        #     # Add note_id to this response's evidence
        #     for evidence in r_dict['evidence']:
        #         for quote in evidence['quotes']:
        #             quote['source'] = notes[idx].note_id
        #     r_dicts.append(r_dict)

        return responses
    except Exception as e:
        logger.error(f"Error running query over notes: {e}")
        return None