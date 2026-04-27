import sys
import os
import requests
from pathlib import Path

BASE_DIR = Path(r"c:\Users\syedk\OneDrive\Desktop\FinRobot\backend")
sys.path.append(str(BASE_DIR))
os.chdir(str(BASE_DIR))

from brain import llm_engine

for model in ["meta/llama-3.1-70b-instruct", "meta/llama-3.1-8b-instruct", "meta/llama3-8b-instruct", "meta/llama-3.2-3b-instruct"]:
    print(f"Testing model {model}...")
    llm_engine.NVIDIA_MODEL = model
    try:
        res = llm_engine.call_nvidia_llm([{"role": "user", "content": "Return a JSON with key 'test' and value 'ok'"}], max_tokens=10)
        print("SUCCESS for", model)
        break
    except Exception as e:
        print("ERROR:", e)
