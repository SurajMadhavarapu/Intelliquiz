from rag_engine import RAGPipeline
import os

print("--- Testing Intelliquiz RAG Pipeline ---")

# 1. Initialize Pipeline
rag = RAGPipeline(model_name="mistral")

# 2. Process & Index Sample Files
sample_files = [
    "sample_data/unit1_rag_notes.txt",
    "sample_data/deep_learning_lecture.pptx"
]

print(f"Indexing sample files: {sample_files}")
index_res = rag.process_and_index_files(sample_files)
print("Index Result:", index_res)

# 3. Query RAG
query = "What is the mathematical formula for Scaled Dot-Product Attention?"
print(f"\nQuerying: '{query}'")
answer_res = rag.query_rag(query)
print("\n--- RAG Answer ---")
print(answer_res["answer"])
print("\n--- Citations ---")
print(answer_res["citations"])

print("\n--- Testing Quiz Generation ---")
quiz = rag.generate_quiz(num_questions=2)
print("Generated Quiz MCQs:")
for q in quiz:
    print(f"- Q: {q.get('question')}")
    print(f"  Options: {q.get('options')}")
    print(f"  Answer Index: {q.get('answer_index')}")

print("\nAll RAG Pipeline Tests Completed Successfully!")
