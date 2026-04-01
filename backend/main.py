"""
main.py — QazaqAI FastAPI backend
Іске қосу: py -3.12 -m uvicorn main:app --reload --port 8000

SETUP: API ключін .env файлына қой:
  GROQ_API_KEY=gsk_...
Немесе environment variable ретінде бер:
  export GROQ_API_KEY=gsk_...
"""
import os
import sys
import json
from datetime import datetime
from typing import Optional

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from model import KazakhAnswerModel

# ─── API KEY — environment variable арқылы ғана ──────────────────────────────
# .env файлын қолданасың ба? pip install python-dotenv, сонан соң:
# from dotenv import load_dotenv; load_dotenv()
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

SYSTEM_PROMPT = """Сен QazaqAI платформасының AI тьюторысың.
Міндетің: қазақ тілін үйренетін орыс тілді пайдаланушыларға көмектесу.

МАҢЫЗДЫ ФАКТІЛЕР (дәл осылай жауап бер):
- Қазақ алфавиті (кириллица): 42 әріп. Арнайы қазақ әріптері: Ә, Ғ, Қ, Ң, Ө, Ү, Ұ, І (8 әріп).
- Қазақ тілінде 7 септік: атау, ілік, барыс, табыс, жатыс, шығыс, көмектес.
- Сөз тәртібі: SOV (Бастауыш — Толықтауыш — Баяндауыш). Глагол сөйлем соңында.
- Қазақ тілі — агглютинативті тіл (суффикстер арқылы).
- Дыбыс үйлесімі: жуан сөзге жуан жалғау (а,ы,о,у), жіңішке сөзге жіңішке жалғау (е,і,ө,ү).
- Прилагательное өзгермейді (падеж/число бойынша).
- Числительнен кейін зат есім жекеше тұрады (бес бала — не балалар).
- Предлог жоқ — послелоглар қолданылады (үстінде, алдында, артында).

АУДАРМА ЕРЕЖЕЛЕРІ:
- Мен = Я, Сен = Ты, Ол = Он/Она, Біз = Мы, Сіз = Вы
- барамын = иду, келемін = прихожу, оқимын = читаю, жазамын = пишу
- мектепке = в школу, үйге = домой, Алматыға = в Алматы
- барды = пошёл, келді = пришёл, оқыды = читал

ЖАУАП ЕРЕЖЕЛЕРІ:
- Жауапты ҚЫСҚА бер (максимум 4-5 сөйлем)
- Орысша сұрақ → орысша жауап
- Қазақша сұрақ → қазақша жауап
- Аударма сұрақтарына: аударманы + 1 сөйлем түсіндірме
- Грамматика сұрақтарына: ереже + мысал
- Emoji қолданба"""

groq_client = None


def init_groq(api_key: str):
    global groq_client
    if not api_key:
        print("[startup] GROQ_API_KEY орнатылмаған — TF-IDF қолданылады")
        return False
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "hi"}],
            max_tokens=5,
        )
        groq_client = client
        print("[startup] Groq AI дайын ✓")
        return True
    except ImportError:
        print("[startup] groq пакеті жоқ: pip install groq")
        return False
    except Exception as e:
        print(f"[startup] Groq қосылмады: {e} — TF-IDF қолданылады")
        return False


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="QazaqAI Backend", version="3.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Модель жүктеу ────────────────────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "qa_pairs.json")
model = KazakhAnswerModel()

if not model.is_trained:
    print("[startup] Модель оқытылуда...")
    model.train(DATA_PATH)

init_groq(GROQ_API_KEY)

session_log    = []
prediction_log = []


# ─── Схемалар ─────────────────────────────────────────────────────────────────
class CheckAnswerRequest(BaseModel):
    user_answer:    str
    correct_answer: str
    sentence_id:    Optional[int] = None
    topic:          Optional[str] = None


class AskTutorRequest(BaseModel):
    question: str
    context:  Optional[str] = ""


class LogSessionRequest(BaseModel):
    participant_id: str
    attempts:       list


# ─── Эндпойнттар ──────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {
        "status":       "ok",
        "model_loaded": model.is_trained,
        "groq_ready":   groq_client is not None,
        "timestamp":    datetime.utcnow().isoformat(),
    }


@app.post("/api/ask-tutor")
def ask_tutor(req: AskTutorRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="question бос болмауы керек")

    if groq_client is not None:
        try:
            prompt = req.question
            if req.context:
                prompt = f"Контекст: {req.context}\n\nСұрақ: {req.question}"

            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                max_tokens=400,
                temperature=0.3,
            )
            return {
                "answer":     response.choices[0].message.content.strip(),
                "confidence": 1.0,
                "source":     "groq",
            }
        except Exception as e:
            print(f"[groq] Қате: {e}")

    result = model.get_answer(req.question, req.context or "")
    return {
        "answer":     result["answer"],
        "confidence": result["confidence"],
        "source":     "tfidf",
    }


@app.post("/api/check-answer")
def check_answer(req: CheckAnswerRequest):
    if not req.user_answer.strip():
        raise HTTPException(status_code=400, detail="user_answer бос болмауы керек")
    result = model.check_answer(req.user_answer, req.correct_answer)
    prediction_log.append({
        "topic":      req.topic,
        "is_correct": result["is_correct"],
        "score":      result["score"],
        "timestamp":  datetime.utcnow().isoformat(),
    })
    return result


@app.post("/api/verify")
def verify_answer(req: CheckAnswerRequest):
    return check_answer(req)


@app.get("/api/model-stats")
def model_stats():
    stats = model.get_stats()
    return {
        **stats,
        "groq_ready":          groq_client is not None,
        "total_predictions":   len(prediction_log),
        "correct_predictions": sum(1 for p in prediction_log if p["is_correct"]),
    }


@app.post("/api/log-session")
def log_session(req: LogSessionRequest):
    correct  = sum(1 for a in req.attempts if a.get("correct"))
    total    = len(req.attempts)
    accuracy = correct / total if total > 0 else 0
    entry = {
        "participant_id": req.participant_id,
        "timestamp":      datetime.utcnow().isoformat(),
        "attempts_count": total,
        "correct_count":  correct,
        "accuracy":       round(accuracy, 4),
    }
    session_log.append(entry)
    log_path = os.path.join(os.path.dirname(__file__), "sessions.jsonl")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return {"saved": True}
