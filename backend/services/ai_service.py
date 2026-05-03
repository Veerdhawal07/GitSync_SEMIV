import os
import json
from openai import AsyncOpenAI
import google.generativeai as genai
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

class ConflictResolution(BaseModel):
    merged_code: str = Field(description="The final merged code resolving the conflict without any git conflict markers.")
    explanation: str = Field(description="A brief explanation of how the conflict was resolved.")
    confidence_score: int = Field(description="Confidence score from 0 to 100 on the accuracy of the resolution.")

class UMLResolution(BaseModel):
    plant_uml_code: str = Field(description="The complete PlantUML code representing the repository architecture. MUST start with @startuml and end with @enduml. NO markdown formatting like ```plantuml.")
    analysis_summary: str = Field(description="A brief summary of the repository's architecture and key components.")

def clean_json_response(text: str) -> str:
    text = text.strip()
    if text.startswith("```json"):
        text = text[len("```json"):].strip()
    elif text.startswith("```"):
        text = text[len("```"):].strip()
    if text.endswith("```"):
        text = text[:-3].strip()
    return text

async def ai_resolve_conflict(file_path: str, conflict_content: str) -> ConflictResolution:
    prompt = f"Resolve this git conflict in {file_path}:\n{conflict_content}\nReturn merged code, explanation, and confidence score."
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(
                f"System: You are an expert dev. Output JSON matching: {{merged_code: str, explanation: str, confidence_score: int}}\nUser: {prompt}",
                generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
            )
            cleaned_text = clean_json_response(response.text)
            data = json.loads(cleaned_text)
            res = ConflictResolution(**data)
            res.explanation = f"(Gemini AI) {res.explanation}"
            return res
        except Exception as e:
            print(f"Gemini Conflict Resolution Error: {e}")

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        try:
            client = AsyncOpenAI(api_key=openai_key)
            response = await client.beta.chat.completions.parse(
                model="gpt-4o-2024-08-06",
                messages=[{"role": "user", "content": prompt}],
                response_format=ConflictResolution,
            )
            return response.choices[0].message.parsed
        except Exception as e:
            print(f"OpenAI Conflict Resolution Error: {e}")

    return ConflictResolution(
        merged_code=conflict_content.replace("<<<<<<< HEAD", "").replace("=======", "").replace(">>>>>>> branch", ""),
        explanation="Resolved using structural marker removal (AI Offline).",
        confidence_score=80
    )

def heuristic_uml_generator(repo_name: str, file_structure: str, uml_type: str, error_msg: str = "") -> UMLResolution:
    lines = file_structure.split("\n")
    uml_body = []
    for line in lines:
        stripped = line.strip()
        if not stripped: continue
        indent = len(line) - len(stripped)
        if stripped.endswith("/"):
            name = stripped.rstrip("/")
            if indent == 0:
                uml_body.append(f'package "{name}" {{')
            else:
                uml_body.append(f'  component "{name}"')
        else:
            uml_body.append(f'  [{stripped}]')
    if 'package' in str(uml_body): uml_body.append("}")
    
    plant_uml = f"@startuml\ntitle {repo_name} - {uml_type} (Heuristic Analysis)\n" + "\n".join(uml_body) + "\n@enduml"
    summary = f"Generated via local structural analysis (AI APIs Offline: {error_msg})."
    return UMLResolution(plant_uml_code=plant_uml, analysis_summary=summary)
def sanitize_uml_code(code: str) -> str:
    code = code.strip()
    if code.startswith("```plantuml"):
        code = code[len("```plantuml"):].strip()
    elif code.startswith("```"):
        code = code[len("```"):].strip()
    if code.endswith("```"):
        code = code[:-3].strip()
    return code

async def generate_repo_uml(repo_name: str, file_structure: str, uml_type: str = "Class", sample_code: str = "") -> UMLResolution:
    prompt = f"Analyze this repo structure and generate PlantUML {uml_type} diagram code:\nRepo: {repo_name}\nStructure:\n{file_structure}\n\nIMPORTANT: The plant_uml_code MUST start with @startuml and end with @enduml. Do NOT wrap it in markdown formatting like ```plantuml. Ensure STRICT PlantUML syntax (e.g. if using notes, use valid syntax like 'note right of Element : text' or 'note as N1\\ntext\\nend note', do NOT use loose 'note \"text\"' inside packages)."
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(
                f"System: You are an architect. Output JSON matching: {{plant_uml_code: str, analysis_summary: str}}\nUser: {prompt}",
                generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
            )
            cleaned_text = clean_json_response(response.text)
            data = json.loads(cleaned_text)
            res = UMLResolution(**data)
            res.analysis_summary = f"(Google Gemini) {res.analysis_summary}"
            res.plant_uml_code = sanitize_uml_code(res.plant_uml_code)
            return res
        except Exception as e:
            print(f"Gemini UML Error: {e}")
            last_error = str(e)

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        try:
            client = AsyncOpenAI(api_key=openai_key)
            response = await client.beta.chat.completions.parse(
                model="gpt-4o-2024-08-06",
                messages=[{"role": "user", "content": prompt}],
                response_format=UMLResolution,
            )
            res = response.choices[0].message.parsed
            res.analysis_summary = f"(OpenAI) {res.analysis_summary}"
            res.plant_uml_code = sanitize_uml_code(res.plant_uml_code)
            return res
        except Exception as e:
            print(f"OpenAI UML Error: {e}")
            last_error = str(e)
    else:
        last_error = "No API keys provided"

    return heuristic_uml_generator(repo_name, file_structure, uml_type, last_error)
