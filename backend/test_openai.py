import asyncio
import os
import sys

# Ensure backend imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.services.ai_service import ai_resolve_conflict
from dotenv import load_dotenv

async def main():
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY is not set in backend/.env")
        return

    print("Testing OpenAI Conflict Resolution...")
    
    sample_conflict = """def calculate_sum(a, b):
<<<<<<< HEAD
    return a + b + 0
=======
    result = a + b
    return result
>>>>>>> other-branch
"""

    print("\n[Input Conflict Text]:")
    print(sample_conflict)
    print("\n--- Sending to GitSync AI ---")

    try:
        suggestion = await ai_resolve_conflict("utils.py", sample_conflict)
        print("\n[AI Resolution Output]:")
        print("Explanation:", suggestion.explanation)
        print("Confidence Score:", suggestion.confidence_score)
        print("\nMerged Code:\n" + suggestion.merged_code)
        print("\nTest SUCCESSFUL!")
    except Exception as e:
        print(f"\nTest FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(main())
