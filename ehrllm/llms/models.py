from pydantic import BaseModel
from typing import List, Optional

########################################################
# Chat completion request
########################################################

class LLM_Quote(BaseModel):
    quote: str
    source: str

class LLM_Evidence(BaseModel):
    quotes: List[LLM_Quote]
    claim: str

class LLM_ChatCompletionResponse(BaseModel):
    thinking: str
    reflection: str
    is_relevant: bool
    evidence: List[LLM_Evidence]
    answer: Optional[str] = None

class LLM_AggregateChatCompletionResponse(BaseModel):
    thinking: str
    reflection: str
    evidence: List[LLM_Evidence]
    answer: str