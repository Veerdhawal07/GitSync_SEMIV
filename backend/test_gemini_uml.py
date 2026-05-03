import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
gemini_key = os.getenv("GEMINI_API_KEY")

prompt = "Analyze this repo structure and generate PlantUML Class diagram code:\nRepo: test\nStructure:\nsrc\n  main.py\n\nIMPORTANT: The plant_uml_code MUST start with @startuml and end with @enduml. Do NOT wrap it in markdown formatting like ```plantuml."

genai.configure(api_key=gemini_key)
model = genai.GenerativeModel('gemini-2.5-flash')
response = model.generate_content(
    f"System: You are an architect. Output JSON matching: {{plant_uml_code: str, analysis_summary: str}}\nUser: {prompt}",
    generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
)
print("RAW RESPONSE:")
print(repr(response.text))
