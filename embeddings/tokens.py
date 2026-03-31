from sentence_transformers import SentenceTransformer
import json

model_name = "all-MiniLM-L6-v2"
model = SentenceTransformer(model_name)

tokenizer = model.tokenizer

file_path = "D:\Abeer\Documents\GitHub\GP-Recommender\data\projects\F01-42-20.json"

with open(file_path, "r", encoding="utf-8") as f:
    project = json.load(f)

text = project.get("abstract", "")

tokens = tokenizer(
    text,
    truncation=False,   
    return_tensors=None
)

num_tokens = len(tokens["input_ids"])

print("Number of tokens:", num_tokens)