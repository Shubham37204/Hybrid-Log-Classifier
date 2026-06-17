# # paste in python REPL from backend/
# from pathlib import Path
# from app.classifier.ml_classifier import MLClassifier

# ml = MLClassifier()
# result = ml.classify("Multiple login failures for user 5432")
# print(result)

# # validate_llm.py at backend/
# from dotenv import load_dotenv
# load_dotenv()

# from app.classifier.llm_classifier import LLMClassifier

# llm = LLMClassifier()
# result = llm.classify("some weird log that regex and ml both missed")
# print(result)


from dotenv import load_dotenv
load_dotenv()

from app.pipeline.orchestrator import Orchestrator

o = Orchestrator()

tests = [
    "Multiple login failures for user 9052",        # regex hit
    "phys_ram=64172MB used_ram=512MB",              # regex hit
    "something entirely ambiguous and novel",        # llm fallback
]

for text in tests:
    result = o.classify(text)
    print(f"\nInput:   {text}")
    print(f"Result:  {result.category.value} via {result.classifier_used} @ {result.confidence}")
    