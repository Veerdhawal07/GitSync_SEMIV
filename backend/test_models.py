import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
gemini_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=gemini_key)

for m in genai.list_models():
    print(m.name)
