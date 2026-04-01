"""
model.py — QazaqAI Hybrid TF-IDF Model (v3.1)
HybridVectorizer: char n-gram (3-5) + word n-gram (1-3)
"""
import os, re, json, pickle
import numpy as np
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")

# ─── Нормализация ─────────────────────────────────────────────────────────────
def normalise(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[.,!?;:«»""\'()\-–—_]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# ─── Гибридті векторизатор ────────────────────────────────────────────────────
class HybridVectorizer:
    """
    char n-gram (3-5) + word n-gram (1-3) біріктіреді.
    char: морфологиялық ұқсастық (жалғаулар, аффикстер)
    word: сөз тәртібін ажырату (word_order, adjective)
    """
    def __init__(self,
                 char_range=(3, 5),
                 word_range=(1, 3),
                 char_weight=0.30,
                 word_weight=0.70):
        self.char_vec = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=char_range,
            min_df=1,
            sublinear_tf=True,
        )
        self.word_vec = TfidfVectorizer(
            analyzer="word",
            ngram_range=word_range,
            min_df=1,
            sublinear_tf=True,
        )
        self.char_weight = char_weight
        self.word_weight = word_weight

    def fit(self, texts):
        self.char_vec.fit(texts)
        self.word_vec.fit(texts)
        return self

    def transform(self, texts):
        char_m = self.char_vec.transform(texts) * self.char_weight
        word_m = self.word_vec.transform(texts) * self.word_weight
        return hstack([char_m, word_m])

    def fit_transform(self, texts):
        self.fit(texts)
        return self.transform(texts)

# ─── Негізгі модель класы ─────────────────────────────────────────────────────
class KazakhAnswerModel:
    def __init__(self):
        self.vectorizer   = None
        self.pairs        = []
        self.qa_knowledge = []
        self.threshold    = 0.55
        self.version      = "3.1-hybrid"
        self._loaded      = False

    # ── Жүктеу ──────────────────────────────────────────────────────────────
    def load(self):
        """model.pkl файлынан модельді жүктейді."""
        if self._loaded:
            return
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"model.pkl табылмады: {MODEL_PATH}\n"
                "Алдымен 'py -3.12 train.py' іске қосыңыз."
            )
        with open(MODEL_PATH, "rb") as f:
            data = pickle.load(f)
        self.vectorizer   = data["vectorizer"]
        self.pairs        = data.get("pairs", [])
        self.qa_knowledge = data.get("qa_knowledge", [])
        self.threshold    = data.get("threshold", 0.55)
        self.version      = data.get("version", "unknown")
        self._loaded      = True

    # ── Жауапты тексеру ──────────────────────────────────────────────────────
    def check_answer(self, user_answer: str, correct_answer: str) -> dict:
        """
        Пайдаланушы жауабын дұрыс жауаппен салыстырады.
        Қайтарады: score, is_correct, confidence, feedback
        """
        self.load()

        u_norm = normalise(user_answer)
        c_norm = normalise(correct_answer)

        # 1) Толық сәйкестік
        if u_norm == c_norm:
            return {
                "score":      1.0,
                "is_correct": True,
                "confidence": "high",
                "feedback":   "Дұрыс! Жауабыңыз мінсіз сәйкес келді.",
            }

        # 2) TF-IDF cosine similarity
        try:
            u_vec = self.vectorizer.transform([u_norm])
            c_vec = self.vectorizer.transform([c_norm])
            score = float(cosine_similarity(u_vec, c_vec)[0][0])
        except Exception:
            score = 0.0

        is_correct = score >= self.threshold

        # Сенімділік деңгейі
        if score >= 0.85:
            confidence = "high"
            feedback   = "Дұрыс! Жауабыңыз өте жақын."
        elif score >= self.threshold:
            confidence = "medium"
            feedback   = f"Дұрыс, бірақ нақтылық жетіспейді. Дұрыс жауап: {correct_answer}"
        elif score >= 0.35:
            confidence = "low"
            feedback   = f"Жауап жақын, бірақ қате. Дұрыс жауап: {correct_answer}"
        else:
            confidence = "low"
            feedback   = f"Қате. Дұрыс жауап: {correct_answer}"

        return {
            "score":      round(score, 4),
            "is_correct": is_correct,
            "confidence": confidence,
            "feedback":   feedback,
        }

    # ── AI тьютор ────────────────────────────────────────────────────────────
    def get_answer(self, question: str) -> dict:
        """
        qa_knowledge базасынан сұраққа жауап іздейді.
        Қайтарады: answer, confidence, topic, found
        """
        self.load()

        if not self.qa_knowledge:
            return {
                "answer":     "Білім базасы бос. Деректерді тексеріңіз.",
                "confidence": 0.0,
                "topic":      "unknown",
                "found":      False,
            }

        q_norm = normalise(question)

        # Keyword matching (жылдам)
        keyword_match = None
        best_kw_count = 0
        for qa in self.qa_knowledge:
            keywords = qa.get("keywords", [])
            count = sum(1 for kw in keywords if kw.lower() in q_norm)
            if count > best_kw_count:
                best_kw_count = count
                keyword_match = qa

        # TF-IDF similarity (дәл)
        try:
            qa_texts = [normalise(qa["question"]) for qa in self.qa_knowledge]
            qa_vecs  = self.vectorizer.transform(qa_texts)
            q_vec    = self.vectorizer.transform([q_norm])
            sims     = cosine_similarity(q_vec, qa_vecs)[0]
            best_idx = int(np.argmax(sims))
            best_sim = float(sims[best_idx])
        except Exception:
            best_sim = 0.0
            best_idx = 0

        # Екеуін біріктіру
        if best_sim >= 0.25:
            best_qa = self.qa_knowledge[best_idx]
            confidence = best_sim
        elif keyword_match and best_kw_count >= 1:
            best_qa    = keyword_match
            confidence = 0.45 + best_kw_count * 0.05
        else:
            return {
                "answer":     (
                    "Кешіріңіз, бұл сұраққа жауап таба алмадым. "
                    "Сұрақты басқаша жазып көріңіз немесе "
                    "Грамматика бөліміндегі ережелерді қараңыз."
                ),
                "confidence": 0.0,
                "topic":      "not_found",
                "found":      False,
            }

        return {
            "answer":     best_qa["answer"],
            "confidence": round(min(confidence, 1.0), 4),
            "topic":      best_qa.get("topic", best_qa.get("question", "")[:30]),
            "found":      True,
        }

    # ── Модель статистикасы ──────────────────────────────────────────────────
    def get_stats(self) -> dict:
        """Модель метрикаларын қайтарады (evaluation_results.json-нан)."""
        self.load()
        eval_path = os.path.join(BASE_DIR, "evaluation_results.json")
        if os.path.exists(eval_path):
            with open(eval_path, encoding="utf-8") as f:
                data = json.load(f)
            return {
                "model_version":     self.version,
                "features":          data.get("features", "char(3-5)+word(1-3)"),
                "cross_validation":  data.get("cross_validation", {}),
                "final_metrics":     data.get("final_metrics", {}),
                "per_topic":         data.get("per_topic_accuracy", {}),
                "total_pairs":       len(self.pairs),
                "total_qa":          len(self.qa_knowledge),
                "threshold":         self.threshold,
            }
        return {
            "model_version": self.version,
            "total_pairs":   len(self.pairs),
            "total_qa":      len(self.qa_knowledge),
            "threshold":     self.threshold,
            "note":          "evaluation_results.json табылмады",
        }

    # ── Lazy singleton ───────────────────────────────────────────────────────
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
            cls._instance.load()
        return cls._instance
