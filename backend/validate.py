# paste in python REPL from backend/
from pathlib import Path
from app.classifier.ml_classifier import MLClassifier

ml = MLClassifier()
result = ml.classify("Multiple login failures for user 5432")
print(result)
