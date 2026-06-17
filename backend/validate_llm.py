# # paste in python REPL from backend/
# from pathlib import Path
# from app.classifier.ml_classifier import MLClassifier

# ml = MLClassifier()
# result = ml.classify("Multiple login failures for user 5432")
# print(result)

# validate_llm.py at backend/
from dotenv import load_dotenv
load_dotenv()

from app.classifier.llm_classifier import LLMClassifier

llm = LLMClassifier()
result = llm.classify("some weird log that regex and ml both missed")
print(result)
