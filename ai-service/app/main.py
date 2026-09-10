import json
import re
import time
from contextlib import asynccontextmanager

import httpx
import psycopg2
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


# ============================================================
# CONFIGURATION
# ============================================================

OLLAMA_EMBED_URL = "http://localhost:11434/api/embeddings"
OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate"

EMBEDDING_MODEL = "mxbai-embed-large"
LLM_MODEL = "llama3.2:3b"

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "user": "vertexlearn",
    "password": "vertexlearn_dev",
    "dbname": "vertexlearn",
}


# ============================================================
# SHARED HTTP CLIENT
# ============================================================

http_client: httpx.AsyncClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client

    http_client = httpx.AsyncClient(
        timeout=300.0
    )

    print("AI service HTTP client initialized.")

    yield

    await http_client.aclose()

    print("AI service HTTP client closed.")


app = FastAPI(
    title="VertexLearn AI Service",
    version="1.0.0",
    lifespan=lifespan,
)


# ============================================================
# REQUEST MODELS
# ============================================================

class SummarizeRequest(BaseModel):
    lecture_title: str
    transcript: str


class ChatRequest(BaseModel):
    course_id: str
    question: str


class QuizGenerationRequest(BaseModel):
    lecture_title: str
    transcript: str
    question_count: int = 5


class StudyPlanRequest(BaseModel):
    course_id: str
    quiz_history: list


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():
    return {
        "success": True,
        "service": "ai-service",
        "message": "AI service is running",
    }


# ============================================================
# CREATE EMBEDDING
# ============================================================

async def create_embedding(text: str):
    if http_client is None:
        raise HTTPException(
            status_code=500,
            detail="AI service HTTP client is not initialized",
        )

    start_time = time.perf_counter()

    try:
        response = await http_client.post(
            OLLAMA_EMBED_URL,
            json={
                "model": EMBEDDING_MODEL,
                "prompt": text,
                "keep_alive": "10m",
            },
        )

    except httpx.RequestError as error:
        print(
            "Embedding request error:",
            repr(error),
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to connect to Ollama embedding service",
        )

    elapsed = time.perf_counter() - start_time

    print(
        f"[AI] Embedding generation: {elapsed:.2f}s"
    )

    if response.status_code != 200:
        print(
            "[AI] Embedding error:",
            response.text,
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to generate embedding",
        )

    data = response.json()

    embedding = data.get("embedding")

    if not embedding:
        raise HTTPException(
            status_code=502,
            detail="Embedding was not returned by Ollama",
        )

    return embedding


# ============================================================
# LECTURE SUMMARIZATION
# ============================================================

@app.post("/ai/summarize")
async def summarize_lecture(
    request: SummarizeRequest,
):
    if not request.transcript.strip():
        raise HTTPException(
            status_code=400,
            detail="Lecture transcript is required",
        )

    if http_client is None:
        raise HTTPException(
            status_code=500,
            detail="AI service HTTP client is not initialized",
        )

    prompt = f"""
You are an educational assistant for VertexLearn AI.

Summarize this lecture for a student.

Lecture title:
{request.lecture_title}

Transcript:
{request.transcript}

Return:

1. A short overview
2. 4-6 key points
3. Important terms
4. A one-sentence takeaway

Keep the explanation clear and beginner-friendly.

Use only information from the transcript.
Do not add outside information.
"""

    start_time = time.perf_counter()

    try:
        response = await http_client.post(
            OLLAMA_GENERATE_URL,
            json={
                "model": LLM_MODEL,
                "prompt": prompt,
                "stream": False,
                "keep_alive": "10m",
                "options": {
                    "temperature": 0.2,
                    "num_predict": 350,
                },
            },
        )

    except httpx.RequestError as error:
        print(
            "Ollama request error:",
            repr(error),
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to connect to Ollama",
        )

    elapsed = time.perf_counter() - start_time

    print(
        f"[AI] Lecture summary generation: "
        f"{elapsed:.2f}s"
    )

    if response.status_code != 200:
        print(
            "[AI] Summary generation error:",
            response.text,
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to generate lecture summary",
        )

    data = response.json()

    return {
        "success": True,
        "lecture_title": request.lecture_title,
        "summary": data.get("response", ""),
    }


# ============================================================
# QUIZ HELPERS
# ============================================================

def extract_json_object(raw_text: str):
    """
    Try multiple strategies to recover a JSON object
    from an LLM response.
    """

    cleaned = raw_text.strip()

    # --------------------------------------------------------
    # 1. Direct JSON parse
    # --------------------------------------------------------

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # --------------------------------------------------------
    # 2. Remove markdown code fences
    # --------------------------------------------------------

    cleaned_without_fences = re.sub(
        r"^```(?:json)?\s*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )

    cleaned_without_fences = re.sub(
        r"\s*```$",
        "",
        cleaned_without_fences,
    ).strip()

    try:
        return json.loads(
            cleaned_without_fences
        )
    except json.JSONDecodeError:
        pass

    # --------------------------------------------------------
    # 3. Extract first JSON object
    # --------------------------------------------------------

    start_index = cleaned.find("{")

    if start_index != -1:
        depth = 0
        in_string = False
        escape = False

        for index in range(
            start_index,
            len(cleaned),
        ):
            char = cleaned[index]

            if escape:
                escape = False
                continue

            if char == "\\" and in_string:
                escape = True
                continue

            if char == '"':
                in_string = not in_string
                continue

            if in_string:
                continue

            if char == "{":
                depth += 1

            elif char == "}":
                depth -= 1

                if depth == 0:
                    candidate = cleaned[
                        start_index:index + 1
                    ]

                    try:
                        return json.loads(candidate)
                    except json.JSONDecodeError:
                        break

    return None


def normalize_question_type(value):
    """
    Convert common LLM variations into supported types.
    """

    if not isinstance(value, str):
        return "mcq"

    normalized = (
        value.strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )

    if normalized in {
        "mcq",
        "multiple_choice",
        "multiplechoice",
        "single_choice",
        "singlechoice",
        "multiple_choice_question",
    }:
        return "mcq"

    if normalized in {
        "multi_select",
        "multiselect",
        "multiple_select",
        "multiple_answer",
        "multiple_answers",
        "select_all_that_apply",
    }:
        return "multi_select"

    return "mcq"


def normalize_bool(value):
    """
    Convert common truthy/falsy LLM values into bool.
    """

    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        normalized = value.strip().lower()

        if normalized in {
            "true",
            "yes",
            "1",
            "correct",
        }:
            return True

        if normalized in {
            "false",
            "no",
            "0",
            "incorrect",
        }:
            return False

    if isinstance(value, int):
        return value == 1

    return False


def normalize_option(option):
    """
    Normalize one option into the expected structure.
    """

    if isinstance(option, str):
        return {
            "option_text": option.strip(),
            "is_correct": False,
        }

    if not isinstance(option, dict):
        return None

    option_text = (
        option.get("option_text")
        or option.get("text")
        or option.get("option")
        or option.get("answer")
        or option.get("label")
    )

    if not isinstance(option_text, str):
        return None

    option_text = option_text.strip()

    if not option_text:
        return None

    correctness_value = option.get("is_correct")

    if correctness_value is None:
        correctness_value = option.get("correct")

    if correctness_value is None:
        correctness_value = option.get("isCorrect")

    if correctness_value is None:
        correctness_value = option.get("right")

    if correctness_value is None:
        correctness_value = option.get("is_answer")

    return {
        "option_text": option_text,
        "is_correct": normalize_bool(
            correctness_value
        ),
    }


def normalize_question(item):
    """
    Normalize a raw LLM question into the exact structure
    expected by the frontend/backend.
    """

    if not isinstance(item, dict):
        return None

    question_text = (
        item.get("question_text")
        or item.get("question")
        or item.get("text")
        or item.get("prompt")
    )

    if not isinstance(question_text, str):
        return None

    question_text = question_text.strip()

    if not question_text:
        return None

    question_type = normalize_question_type(
        item.get("question_type")
        or item.get("type")
        or item.get("questionType")
    )

    raw_options = (
        item.get("options")
        or item.get("choices")
        or item.get("answers")
    )

    # --------------------------------------------------------
    # Dictionary → list
    # --------------------------------------------------------

    if isinstance(raw_options, dict):
        converted_options = []

        for key, value in raw_options.items():

            if isinstance(value, dict):
                option = value.copy()

                if not option.get("option_text"):
                    option["option_text"] = str(key)

                converted_options.append(option)

            else:
                converted_options.append(
                    {
                        "option_text": str(key),
                        "is_correct": value,
                    }
                )

        raw_options = converted_options

    if not isinstance(raw_options, list):
        return None

    # --------------------------------------------------------
    # Normalize options
    # --------------------------------------------------------

    normalized_options = []

    for option in raw_options:

        normalized = normalize_option(option)

        if normalized:
            normalized_options.append(normalized)

    # --------------------------------------------------------
    # Remove duplicates
    # --------------------------------------------------------

    unique_options = []
    seen = set()

    for option in normalized_options:

        key = (
            option["option_text"]
            .strip()
            .lower()
        )

        if key in seen:
            continue

        seen.add(key)
        unique_options.append(option)

    normalized_options = unique_options

    # Exactly four options
    if len(normalized_options) > 4:
        normalized_options = normalized_options[:4]

    if len(normalized_options) != 4:
        return None

    # --------------------------------------------------------
    # Correct answer handling
    # --------------------------------------------------------

    correct_count = sum(
        1
        for option in normalized_options
        if option["is_correct"]
    )

    if correct_count == 0:

        correct_answer = (
            item.get("correct_answer")
            or item.get("correctAnswer")
            or item.get("answer")
            or item.get("correct_option")
            or item.get("correctOption")
        )

        if isinstance(correct_answer, int):

            if 0 <= correct_answer < 4:
                normalized_options[
                    correct_answer
                ]["is_correct"] = True

        elif isinstance(correct_answer, str):

            answer_text = (
                correct_answer
                .strip()
                .lower()
            )

            for index, option in enumerate(
                normalized_options
            ):

                option_text = (
                    option["option_text"]
                    .strip()
                    .lower()
                )

                if answer_text == option_text:
                    option["is_correct"] = True

                elif answer_text in {
                    "a",
                    "b",
                    "c",
                    "d",
                }:

                    correct_index = (
                        ord(answer_text)
                        - ord("a")
                    )

                    if index == correct_index:
                        option["is_correct"] = True

    correct_count = sum(
        1
        for option in normalized_options
        if option["is_correct"]
    )

    # --------------------------------------------------------
    # MCQ must have exactly one correct answer
    # --------------------------------------------------------

    if question_type == "mcq":

        if correct_count == 0:
            return None

        if correct_count > 1:

            first_correct_found = False

            for option in normalized_options:

                if option["is_correct"]:

                    if not first_correct_found:
                        first_correct_found = True

                    else:
                        option["is_correct"] = False

    # --------------------------------------------------------
    # Multi-select needs two or more correct answers
    # --------------------------------------------------------

    else:

        if correct_count < 2:
            return None

    return {
        "question_text": question_text,
        "question_type": question_type,
        "options": normalized_options,
    }


# ============================================================
# AI QUIZ GENERATION
# ============================================================

@app.post("/ai/generate-quiz")
async def generate_quiz(
    request: QuizGenerationRequest,
):

    transcript = request.transcript.strip()

    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="Lecture transcript is required",
        )

    if request.question_count < 5:
        question_count = 5
    elif request.question_count > 10:
        question_count = 10
    else:
        question_count = request.question_count

    if http_client is None:
        raise HTTPException(
            status_code=500,
            detail="AI service HTTP client is not initialized",
        )

    requested_from_model = min(
        question_count + 3,
        13,
    )

    prompt = f"""
You are an expert educational quiz creator for VertexLearn AI.

Create a quiz from the lecture transcript below.

Lecture title:
{request.lecture_title}

Lecture transcript:
{transcript}

Generate EXACTLY {requested_from_model} candidate questions.

IMPORTANT:

1. Use ONLY information explicitly present in the transcript.
2. Do not invent facts.
3. Questions must be meaningful and beginner-friendly.
4. Use only these question types:
   - mcq
   - multi_select
5. Each question must have exactly 4 options.
6. Each MCQ must have exactly ONE correct option.
7. Each multi_select question must have AT LEAST TWO correct options.
8. Keep option text concise.
9. Avoid ambiguous questions.
10. Do not include explanations.
11. Do not include answer explanations.
12. Do not include markdown.
13. Return ONLY JSON.
14. The root object must contain a "questions" array.
15. Each option must contain:
    "option_text"
    "is_correct"

Return this structure:

{{
  "questions": [
    {{
      "question_text": "Question here",
      "question_type": "mcq",
      "options": [
        {{
          "option_text": "Option A",
          "is_correct": true
        }},
        {{
          "option_text": "Option B",
          "is_correct": false
        }},
        {{
          "option_text": "Option C",
          "is_correct": false
        }},
        {{
          "option_text": "Option D",
          "is_correct": false
        }}
      ]
    }}
  ]
}}
"""

    start_time = time.perf_counter()

    try:

        response = await http_client.post(
            OLLAMA_GENERATE_URL,
            json={
                "model": LLM_MODEL,
                "prompt": prompt,
                "stream": False,
                "keep_alive": "10m",
                "format": "json",
                "options": {
                    "temperature": 0.1,
                    "num_predict": 1600,
                },
            },
        )

    except httpx.RequestError as error:

        print(
            "Ollama quiz generation error:",
            repr(error),
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to connect to Ollama",
        )

    elapsed = time.perf_counter() - start_time

    print(
        f"[AI] Quiz generation: "
        f"{elapsed:.2f}s"
    )

    if response.status_code != 200:

        print(
            "[AI] Quiz generation error:",
            response.text,
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to generate AI quiz",
        )

    data = response.json()

    raw_response = data.get("response", "")

    if (
        not isinstance(raw_response, str)
        or not raw_response.strip()
    ):
        raise HTTPException(
            status_code=502,
            detail="AI quiz generator returned an empty response",
        )

    print(
        "\n[AI] Raw quiz response:\n"
        + raw_response
        + "\n"
    )

    quiz_data = extract_json_object(raw_response)

    if not isinstance(quiz_data, dict):
        raise HTTPException(
            status_code=502,
            detail="AI returned invalid quiz JSON",
        )

    generated_questions = quiz_data.get(
        "questions"
    )

    if not isinstance(
        generated_questions,
        list,
    ):
        raise HTTPException(
            status_code=502,
            detail="AI quiz response does not contain a questions array",
        )

    cleaned_questions = []

    for item in generated_questions:

        normalized = normalize_question(item)

        if normalized is None:
            continue

        question_key = (
            normalized["question_text"]
            .strip()
            .lower()
        )

        already_exists = any(
            existing["question_text"]
            .strip()
            .lower()
            == question_key
            for existing in cleaned_questions
        )

        if already_exists:
            continue

        cleaned_questions.append(normalized)

        if len(cleaned_questions) >= question_count:
            break

    print(
        "[AI] Model candidate questions:",
        len(generated_questions),
    )

    print(
        "[AI] Valid normalized questions:",
        len(cleaned_questions),
    )

    if len(cleaned_questions) < question_count:

        raise HTTPException(
            status_code=502,
            detail=(
                f"AI generated only "
                f"{len(cleaned_questions)} valid questions "
                f"out of {question_count} required. "
                f"Please try again."
            ),
        )

    for index, question in enumerate(
        cleaned_questions
    ):
        question["order_index"] = index + 1

    total_elapsed = (
        time.perf_counter()
        - start_time
    )

    print(
        f"[AI] Total quiz generation: "
        f"{total_elapsed:.2f}s"
    )

    return {
        "success": True,
        "lecture_title": request.lecture_title,
        "questions": cleaned_questions,
    }


# ============================================================
# AI TUTOR CHAT - RAG
# ============================================================

@app.post("/ai/chat")
async def chat(
    request: ChatRequest,
):

    if not request.course_id.strip():
        raise HTTPException(
            status_code=400,
            detail="course_id is required",
        )

    if not request.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Question is required",
        )

    if http_client is None:
        raise HTTPException(
            status_code=500,
            detail="AI service HTTP client is not initialized",
        )

    total_start = time.perf_counter()

    try:

        # =====================================================
        # 1. CREATE QUERY EMBEDDING
        # =====================================================

        query_embedding = await create_embedding(
            request.question.strip()
        )

        # =====================================================
        # 2. VECTOR SEARCH
        # =====================================================

        db_start = time.perf_counter()

        conn = psycopg2.connect(
            **DB_CONFIG
        )

        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                dc.lecture_id,
                l.title AS lecture_title,
                dc.chunk_text,
                1 - (
                    dc.embedding <=> %s::vector
                ) AS similarity
            FROM document_chunks dc
            JOIN lectures l
                ON dc.lecture_id = l.id
            WHERE dc.course_id = %s
            ORDER BY dc.embedding <=> %s::vector
            LIMIT 2
            """,
            (
                str(query_embedding),
                request.course_id,
                str(query_embedding),
            ),
        )

        chunks = cursor.fetchall()

        cursor.close()
        conn.close()

        db_elapsed = (
            time.perf_counter()
            - db_start
        )

        print(
            f"[AI] PostgreSQL vector search: "
            f"{db_elapsed:.2f}s"
        )

        # =====================================================
        # 3. NO RELEVANT MATERIAL
        # =====================================================

        if not chunks:

            total_elapsed = (
                time.perf_counter()
                - total_start
            )

            print(
                f"[AI] Total request: "
                f"{total_elapsed:.2f}s"
            )

            return {
                "success": True,
                "answer": (
                    "I could not find relevant "
                    "material in this course."
                ),
                "sources": [],
            }

        # =====================================================
        # 4. BUILD RAG CONTEXT
        # =====================================================

        context_parts = []

        for (
            lecture_id,
            lecture_title,
            chunk_text,
            similarity,
        ) in chunks:

            context_parts.append(
                f"""
Lecture: {lecture_title}

Lecture ID: {lecture_id}

Content:
{chunk_text}
"""
            )

        context = "\n\n".join(
            context_parts
        )

        # =====================================================
        # 5. LLM PROMPT
        # =====================================================

        prompt = f"""
You are the VertexLearn AI Tutor.

Answer the student's question using ONLY the
lecture material provided below.

Important rules:

- Do not invent facts.
- Do not use outside knowledge.
- If the answer is not present in the provided
  material, say exactly:

"I couldn't find that information in the course material."

- Keep the answer clear and student-friendly.
- Prefer a concise explanation.
- Use short paragraphs or bullet points when helpful.

Student question:
{request.question.strip()}

Retrieved course material:
{context}
"""

        # =====================================================
        # 6. GENERATE ANSWER
        # =====================================================

        llm_start = time.perf_counter()

        response = await http_client.post(
            OLLAMA_GENERATE_URL,
            json={
                "model": LLM_MODEL,
                "prompt": prompt,
                "stream": False,
                "keep_alive": "10m",
                "options": {
                    "temperature": 0.2,
                    "num_predict": 80,
                },
            },
        )

        llm_elapsed = (
            time.perf_counter()
            - llm_start
        )

        print(
            f"[AI] Llama generation: "
            f"{llm_elapsed:.2f}s"
        )

        if response.status_code != 200:

            print(
                "[AI] Llama error:",
                response.text,
            )

            raise HTTPException(
                status_code=502,
                detail="Failed to generate AI response",
            )

        data = response.json()

        # =====================================================
        # 7. SOURCE CITATIONS
        # =====================================================

        sources = []

        for (
            lecture_id,
            lecture_title,
            _chunk_text,
            similarity,
        ) in chunks:

            sources.append(
                {
                    "lecture_id": lecture_id,
                    "lecture_title": lecture_title,
                    "similarity": round(
                        float(similarity),
                        4,
                    ),
                }
            )

        # =====================================================
        # 8. TOTAL TIME
        # =====================================================

        total_elapsed = (
            time.perf_counter()
            - total_start
        )

        print(
            f"[AI] Total chat request: "
            f"{total_elapsed:.2f}s"
        )

        return {
            "success": True,
            "answer": data.get(
                "response",
                "",
            ),
            "sources": sources,
        }

    except psycopg2.Error as error:

        print(
            "Database error:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve course material",
        )

    except httpx.RequestError as error:

        print(
            "Ollama request error:",
            repr(error),
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to connect to Ollama",
        )


# ============================================================
# AI PERSONALIZED STUDY PLAN
# ============================================================

@app.post("/ai/study-plan")
async def generate_study_plan(
    request: StudyPlanRequest,
):

    if not request.course_id.strip():
        raise HTTPException(
            status_code=400,
            detail="course_id is required",
        )

    if not request.quiz_history:
        raise HTTPException(
            status_code=400,
            detail="Quiz history is required",
        )

    if http_client is None:
        raise HTTPException(
            status_code=500,
            detail="AI service HTTP client is not initialized",
        )

    quiz_history_text = json.dumps(
        request.quiz_history,
        indent=2,
        default=str,
    )

    prompt = f"""
You are the VertexLearn AI personalized study planner.

Create a practical and personalized study plan for a student
based ONLY on the student's quiz performance data below.

Course ID:
{request.course_id}

Quiz performance:
{quiz_history_text}

Analyze the scores and identify areas where the student
appears to need more practice.

Return ONLY valid JSON.

Use exactly this structure:

{{
  "overview": "A short summary of the student's current learning situation and main focus.",
  "goals": [
    "Learning goal 1",
    "Learning goal 2",
    "Learning goal 3"
  ],
  "focus_areas": [
    "Topic or area that needs more attention",
    "Another topic that needs more attention"
  ],
  "schedule": [
    {{
      "title": "Day 1",
      "task": "Study and revise the weak areas identified from the quiz results.",
      "duration": "45 minutes"
    }},
    {{
      "title": "Day 2",
      "task": "Practice concepts related to the weaker quiz performance.",
      "duration": "45 minutes"
    }},
    {{
      "title": "Day 3",
      "task": "Take another quiz or revise previous mistakes.",
      "duration": "30 minutes"
    }}
  ],
  "recommendations": [
    "Personalized recommendation 1",
    "Personalized recommendation 2",
    "Personalized recommendation 3"
  ]
}}

Rules:

1. Use ONLY the provided quiz performance data.
2. Do not invent specific topics that are not represented in the data.
3. Keep the plan practical and student-friendly.
4. Use simple language.
5. Focus more attention on lower scores.
6. If scores are generally high, recommend revision and practice.
7. Do not include markdown.
8. Do not include explanations outside the JSON.
"""

    start_time = time.perf_counter()

    try:

        response = await http_client.post(
            OLLAMA_GENERATE_URL,
            json={
                "model": LLM_MODEL,
                "prompt": prompt,
                "stream": False,
                "keep_alive": "10m",
                "format": "json",
                "options": {
                    "temperature": 0.2,
                    "num_predict": 900,
                },
            },
        )

    except httpx.RequestError as error:

        print(
            "Ollama study plan error:",
            repr(error),
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to connect to Ollama",
        )

    elapsed = (
        time.perf_counter()
        - start_time
    )

    print(
        f"[AI] Study plan generation: "
        f"{elapsed:.2f}s"
    )

    if response.status_code != 200:

        print(
            "[AI] Study plan generation error:",
            response.text,
        )

        raise HTTPException(
            status_code=502,
            detail="Failed to generate study plan",
        )

    data = response.json()

    raw_response = data.get(
        "response",
        "",
    )

    if (
        not isinstance(raw_response, str)
        or not raw_response.strip()
    ):
        raise HTTPException(
            status_code=502,
            detail="AI study plan generator returned an empty response",
        )

    print(
        "\n[AI] Raw study plan response:\n"
        + raw_response
        + "\n"
    )

    try:
        plan = json.loads(raw_response)

    except json.JSONDecodeError:

        plan = extract_json_object(
            raw_response
        )

    if not isinstance(plan, dict):
        raise HTTPException(
            status_code=502,
            detail="AI returned invalid study plan JSON",
        )

    return {
        "success": True,
        "course_id": request.course_id,
        "plan": plan,
    }


# ============================================================
# SERVER START
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )