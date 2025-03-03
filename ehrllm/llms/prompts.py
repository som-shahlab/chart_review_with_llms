from typing import List, Dict, Any

########################################################
# Prompts for /api/chat
########################################################

def CHAT_SYSTEM_PROMPT() -> str:
    return """
    You are a helpful medical assistant. You are given an EHR clinical note from a patient and a User Query.
    Your job is to answer the user's query based on the notes as accurately and comprehensively as possible.
    Be concise and to the point, but thorough. DO NOT make up information. Your answer must be grounded in the notes.
    
    If the User Query is not a medical query related to the notes AND does not relate to the prior conversation history, respond briefly and redirect the user to asking a medical question.
    
    REFUSE to answer any queries that are offensive, racist, sexist, or otherwise inappropriate in a professional hospital setting.
    """

def CHAT_USER_QUERY_OVER_ONE_NOTE_PROMPT(query: str, notes: List[Dict[str, Any]]) -> str:
    return f"""
    <Task>
    Please accurately answer the User Query based on the notes. 
    Take into account the entire conversation history as well in your response.
    </Task>
    
    <User Query>
    {query}
    </User Query>
    
    <Notes>
    {notes}
    </Notes>
    
    <Task>
    Please answer the User Query based on the notes in JSON format.
    </Task>
    
    <Response>
    """


def CHAT_USER_QUERY_AGGREGATE_RESPONSES_PROMPT(query: str, responses: List[Dict[str, Any]]) -> str:
    return f"""
    <Task>
    Previously, you read through a series of notes and answered the User Query based on each note independently.
    Now, your task is to aggregate these note-level responses into a single coherent response.
    Maintain all the proper evidence, quotes, note_ids, and thinking from the note-level responses that you incorporate into your answer.
    For 'source', specify the note_id of the note that the quote is from.
    </Task>
    
    <User Query>
    {query}
    </User Query>
    
    <Responses>
    {responses}
    </Responses>
    
    <Task>
    Please aggregate the responses from the LLM into a single accurate response to the User Query in the correct JSON format.
    Maintain all the proper evidence, quotes, note_ids, and thinking from the note-level responses that you incorporate into your answer.
    For 'source', specify the note_id of the note that the quote is from.
    </Task>
    
    <Response>
    """