import os
import faiss
import json
from sentence_transformers import SentenceTransformer

quran_index_path = "quran_english.index"
quran_metadata_path = "quran_english_metadata.json"
hadith_index_path = "hadith.index"
hadith_metadata_path = "processed_hadith/hadith_chunks.json"

print("Loading model...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("Loading indexes...")
quran_index = faiss.read_index(quran_index_path)
hadith_index = faiss.read_index(hadith_index_path)

with open(quran_metadata_path, "r", encoding="utf-8") as f:
    quran_metadata = json.load(f)

with open(hadith_metadata_path, "r", encoding="utf-8") as f:
    hadith_metadata = json.load(f)

def test_query(query):
    print(f"\n--- QUERY: {query} ---")
    query_embedding = model.encode([query]).astype("float32")
    
    # Quran
    q_dist, q_idx = quran_index.search(query_embedding, 1)
    q_val = q_dist[0][0] if len(q_idx[0]) > 0 else 9.9
        
    # Hadith
    h_dist, h_idx = hadith_index.search(query_embedding, 1)
    h_val = h_dist[0][0] if len(h_idx[0]) > 0 else 9.9
    
    print(f"  Quran Min Dist: {q_val:.4f}")
    print(f"  Hadith Min Dist: {h_val:.4f}")

# Irrelevant
test_query("What is the capital of France?")
test_query("Explain quantum entanglement.")
test_query("Who won the world cup in 2022?")

# Real
test_query("What breaks wudu?")
test_query("I forgot I was fasting and ate")
