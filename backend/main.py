"""
main.py — QazaqAI FastAPI Backend (v3.1)
Іске қосу: py -3.12 -m uvicorn main:app --reload --port 8000
"""
import os, json, time, logging
from dotenv import load_dotenv
load_dotenv()  # .env файлынан API key оқиды
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from groq import Groq

from model import KazakhAnswerModel

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("qazaqai")

# ─── Config ───────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL   = "llama-3.3-70b-versatile"
MAX_QUESTION_LEN = 500
MAX_HISTORY_TURNS = 8   # чат тарихының максимал ұзындығы

# ─── System Prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """Сен QazaqAI платформасының AI тьюторысың.
Міндетің: қазақ тілін үйренетін пайдаланушыларға ДҰРЫС және НАҚТЫ жауап беру.

ҚАТАҢ ЕРЕЖЕЛЕР:
1. Тек грамматика, сөздік, аударма тақырыптарына жауап бер.
2. Жауап тілі: пайдаланушы қазақша сұраса — қазақша, орысша сұраса — орысша, аралас болса — екі тілде.
3. Жауап қысқа, нақты, мысалдармен берілуі керек.
4. Егер білмесең — "Бұл сұрақ менің мамандығымнан тыс" де, өтірік айтпа.

НАҚТЫ БІЛІМДЕР (осылай жаз, өзгертпе):
- Қазақ алфавиті (кириллица): 42 әріп
- Қазақ алфавиті (латын, 2025+): 32 әріп
- Септіктер: 7 (атау, ілік, барыс, табыс, жатыс, шығыс, көмектес)
- Шақтар: 3 (өткен -ды/-ді, осы/келер -ады/-еді, ауыспалы осы шақ -а/-е+жатыр)
- Сөз тәртібі: SOV (Бастауыш + Толықтауыш + Баяндауыш)
- Үндестік заңы: жуан (а,о,ұ,ы) немесе жіңішке (ə,е,і,ө,ү) дауыстылар бір сөзде

ЖАУАП ФОРМАТЫ:
- Қысқа анықтама
- Мысалдар (кемінде 2)
- Ереже (қажет болса)
- Ұзындық: 3-8 сөйлем, артық емес"""

# ─── FastAPI app ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="QazaqAI Backend",
    description="Қазақ тілін үйренуге арналған AI платформасы",
    version="3.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Rate limiting (қарапайым) ────────────────────────────────────────────────
_rate_store: dict = {}

def check_rate_limit(ip: str, limit: int = 30, window: int = 60) -> bool:
    """IP бойынша rate limiting: 30 сұраным / 60 сек."""
    now = time.time()
    if ip not in _rate_store:
        _rate_store[ip] = []
    # Ескі жазбаларды тазалау
    _rate_store[ip] = [t for t in _rate_store[ip] if now - t < window]
    if len(_rate_store[ip]) >= limit:
        return False
    _rate_store[ip].append(now)
    return True

# ─── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    """Сервер іске қосылғанда модельді жүктейді."""
    try:
        model = KazakhAnswerModel.get_instance()
        logger.info(f"✅ Модель жүктелді: {model.version}")
        logger.info(f"   Pairs: {len(model.pairs)}, QA: {len(model.qa_knowledge)}")
        logger.info(f"   Threshold: {model.threshold}")
    except Exception as e:
        logger.error(f"❌ Модель жүктелмеді: {e}")

# ─── Pydantic schemas ─────────────────────────────────────────────────────────
class CheckAnswerRequest(BaseModel):
    user_answer:    str
    correct_answer: str
    sentence_id:    Optional[int] = None
    topic:          Optional[str] = None

    @field_validator("user_answer", "correct_answer")
    @classmethod
    def not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Жауап бос болмауы керек")
        if len(v) > MAX_QUESTION_LEN:
            raise ValueError(f"Жауап {MAX_QUESTION_LEN} символдан аспауы керек")
        return v

class TutorMessage(BaseModel):
    role:    str   # "user" | "assistant"
    content: str

class TutorRequest(BaseModel):
    question: str
    history:  Optional[list[TutorMessage]] = []

    @field_validator("question")
    @classmethod
    def not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Сұрақ бос болмауы керек")
        if len(v) > MAX_QUESTION_LEN:
            raise ValueError(f"Сұрақ {MAX_QUESTION_LEN} символдан аспауы керек")
        return v

class SessionLog(BaseModel):
    participant_id: Optional[str] = "anonymous"
    topic:          Optional[str] = None
    attempts:       list

# ─── Эндпойнттар ─────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    """Сервер күйін тексеру."""
    try:
        model = KazakhAnswerModel.get_instance()
        return {
            "status":       "ok",
            "model_loaded": model._loaded,
            "version":      model.version,
            "pairs":        len(model.pairs),
            "threshold":    model.threshold,
            "timestamp":    datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "error", "detail": str(e)})


@app.post("/api/check-answer")
async def check_answer(req: CheckAnswerRequest, request: Request):
    """
    Пайдаланушы жауабын тексереді.
    TF-IDF cosine similarity арқылы дұрыс/қате анықтайды.
    """
    ip = request.client.host
    if not check_rate_limit(ip):
        raise HTTPException(status_code=429, detail="Тым көп сұраным. 1 минут күтіңіз.")

    try:
        model  = KazakhAnswerModel.get_instance()
        result = model.check_answer(req.user_answer, req.correct_answer)
        logger.info(
            f"check-answer | topic={req.topic} | "
            f"score={result['score']:.2f} | correct={result['is_correct']}"
        )
        return {
            **result,
            "sentence_id": req.sentence_id,
            "topic":       req.topic,
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"check-answer error: {e}")
        raise HTTPException(status_code=500, detail="Сервер қатесі. Кейінірек қайталаңыз.")


@app.post("/api/ask-tutor")
async def ask_tutor(req: TutorRequest, request: Request):
    """
    AI тьюторға сұрақ қою.
    1) TF-IDF базасынан іздейді (жылдам, тегін)
    2) Табылмаса → Groq (Llama) арқылы жауап береді
    """
    ip = request.client.host
    if not check_rate_limit(ip, limit=20):
        raise HTTPException(status_code=429, detail="Тым көп сұраным. 1 минут күтіңіз.")

    try:
        model = KazakhAnswerModel.get_instance()

        # 1) TF-IDF базасынан іздеу
        local_result = model.get_answer(req.question)

        if local_result["found"] and local_result["confidence"] >= 0.35:
            logger.info(f"ask-tutor | source=local | conf={local_result['confidence']:.2f}")
            return {
                "answer":     local_result["answer"],
                "confidence": local_result["confidence"],
                "source":     "local",
                "topic":      local_result["topic"],
            }

        # 2) Groq-қа жіберу
        if not GROQ_API_KEY:
            # Groq жоқ болса — local нәтижені қайтар
            return {
                "answer":     local_result["answer"],
                "confidence": local_result["confidence"],
                "source":     "local_fallback",
                "topic":      "not_found",
            }

        client = Groq(api_key=GROQ_API_KEY)

        # Чат тарихын дайындау (максимал MAX_HISTORY_TURNS)
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        history  = req.history or []
        for msg in history[-MAX_HISTORY_TURNS:]:
            if msg.role in ("user", "assistant"):
                messages.append({"role": msg.role, "content": msg.content[:500]})
        messages.append({"role": "user", "content": req.question})

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            max_tokens=400,
            temperature=0.3,
        )
        answer = response.choices[0].message.content.strip()

        logger.info(f"ask-tutor | source=groq | tokens={response.usage.total_tokens}")
        return {
            "answer":     answer,
            "confidence": 0.90,
            "source":     "groq",
            "topic":      "ai_generated",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ask-tutor error: {e}")
        raise HTTPException(status_code=500, detail="AI тьютор қолжетімсіз. Кейінірек қайталаңыз.")


@app.get("/api/model-stats")
async def model_stats():
    """Модель метрикаларын қайтарады (IEEE статья үшін)."""
    try:
        model = KazakhAnswerModel.get_instance()
        return model.get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/log-session")
async def log_session(req: SessionLog):
    """Пайдаланушы сессиясын сақтайды."""
    try:
        log_dir  = os.path.join(os.path.dirname(__file__), "logs")
        os.makedirs(log_dir, exist_ok=True)

        filename = os.path.join(log_dir, f"session_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json")
        payload  = {
            "participant_id": req.participant_id,
            "topic":          req.topic,
            "timestamp":      datetime.utcnow().isoformat(),
            "n_attempts":     len(req.attempts),
            "attempts":       req.attempts,
        }
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        # Жылдам статистика
        correct = sum(1 for a in req.attempts if a.get("is_correct"))
        return {
            "saved":       True,
            "filename":    os.path.basename(filename),
            "n_attempts":  len(req.attempts),
            "n_correct":   correct,
            "accuracy":    round(correct / len(req.attempts), 4) if req.attempts else 0,
        }
    except Exception as e:
        logger.error(f"log-session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/topics")
async def get_topics():
    """Барлық тақырыптар тізімін қайтарады."""
    try:
        model  = KazakhAnswerModel.get_instance()
        topics = sorted(set(p.get("topic", "unknown") for p in model.pairs))
        return {"topics": topics, "count": len(topics)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
