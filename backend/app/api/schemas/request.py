from pydantic import BaseModel, field_validator

class ClassifyRequest(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def text_must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("text must not be empty")
        if len(v) > 10_000:
            raise ValueError("text must not exceed 10,000 characters")
        return v