from typing import Optional
from pydantic import BaseModel

class ClassifyResponse(BaseModel):
    category:         str
    confidence:       float
    classifier_used:  str
    matched_pattern:  Optional[str] = None
    latency_ms:       float
    