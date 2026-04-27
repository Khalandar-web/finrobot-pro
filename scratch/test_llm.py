import sys
import os
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(r"c:\Users\syedk\OneDrive\Desktop\FinRobot\backend")
sys.path.append(str(BASE_DIR))
os.chdir(str(BASE_DIR))

from brain import llm_engine

try:
    print("Testing LLM...")
    res = llm_engine.call_nvidia_llm_json([{"role": "user", "content": "Return a JSON with key 'test' and value 'ok'"}])
    print("SUCCESS:", res)
except Exception as e:
    print("ERROR:", type(e), e)
