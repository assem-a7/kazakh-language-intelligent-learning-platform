"""
KazakhAnswerModel — TF-IDF + cosine similarity модель
Қазақ тілі жаттығуларының жауаптарын тексеруге арналған

ИСПРАВЛЕНИЯ v2:
- Унифицирован порог τ=0.65 во всех методах (был 0.75 в train, 0.65 в check_answer)
- Порог параметризован: SIMILARITY_THRESHOLD
- Добавлен метод predict_batch() для baseline/ablation экспериментов
"""
import json
import pickle
import re
import os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, roc_auc_score,
)

# ─── Единый порог — используется везде ───────────────────────────────────────
SIMILARITY_THRESHOLD = 0.65   # τ (paper Section IV-A)


# ─── Нормализация ───────────────────────────────────────────────────────────
SUFFIX_MAP = {
    # Жатыс септік (местный)
    "де$": "да", "те$": "та",
    # Шығыс септік (исходный)
    "ден$": "дан", "тен$": "тан", "нен$": "нан",
    # Барыс септік (дательный)
    "ге$": "га", "ке$": "ка",
    # Табыс септік (винительный)
    "ні$": "ны", "ді$": "ды", "ті$": "ты",
    # Осы шақ (настоящее)
    "еді$": "ады", "йді$": "йды",
    # Өткен шақ (прошедшее)
    "ді$": "ды", "ті$": "ты",
    # Ілік (родительный)
    "нің$": "ның", "дің$": "дың", "тің$": "тың",
}


def normalise(text: str) -> str:
    """
    4-stage Kazakh normalization pipeline (paper Section IV-B):
    Stage 1: lowercase + trim
    Stage 2: punctuation removal
    Stage 3: unicode normalization (i → і)
    Stage 4: whitespace collapse
    """
    if not text:
        return ""
    # Stage 1
    text = text.strip().lower()
    # Stage 2
    text = re.sub(r"[.,!?;:\-–—\"'«»()]+", "", text)
    # Stage 3
    text = text.replace("i", "і")
    # Stage 4
    text = re.sub(r"\s+", " ", text).strip()
    return text


def suffix_normalise(text: str) -> str:
    """
    Stage 4 extension: vowel harmony suffix normalization
    Reduces orthographic variants to canonical form.
    """
    result = normalise(text)
    for pattern, replacement in SUFFIX_MAP.items():
        result = re.sub(pattern, replacement, result)
    return result


# ─── Негізгі модель класы ────────────────────────────────────────────────────
class KazakhAnswerModel:
    MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

    def __init__(self, threshold: float = SIMILARITY_THRESHOLD,
                 ngram_range: tuple = (2, 4),
                 max_features: int = 10000):
        """
        Parameters
        ----------
        threshold    : cosine similarity decision boundary τ
        ngram_range  : char_wb n-gram range (for ablation study)
        max_features : TF-IDF vocabulary size (for ablation study)
        """
        self.threshold = threshold
        self.vectorizer = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=ngram_range,
            min_df=1,
            max_features=max_features,
            sublinear_tf=True,
        )
        self.answer_vectors      = None
        self.answer_labels_train = []
        self.answer_texts        = []
        self.answer_labels       = []

        self.qa_vectorizer = TfidfVectorizer(
            analyzer="word",
            ngram_range=(1, 3),
            min_df=1,
            max_features=8000,
            sublinear_tf=True,
        )
        self.qa_vectors = None
        self.qa_data    = []

        self.is_trained = False
        self.metrics    = {}

        if os.path.exists(self.MODEL_PATH):
            self.load()

    # ── Оқыту ─────────────────────────────────────────────────────────────────
    def train(self, data_path: str) -> dict:
        """Train model and return evaluation metrics for paper Table II."""
        with open(data_path, encoding="utf-8") as f:
            data = json.load(f)

        # Build dataset
        texts, labels = [], []
        for pair in data["answer_pairs"]:
            correct_norm = normalise(pair["correct"])
            for variant in pair["variants"]:
                v_norm = normalise(variant)
                texts.append(v_norm)
                labels.append(
                    v_norm == correct_norm
                    or suffix_normalise(v_norm) == suffix_normalise(pair["correct"])
                )

        self.answer_texts  = texts
        self.answer_labels = labels

        # Stratified 80/20 split
        X_train, X_test, y_train, y_test = train_test_split(
            texts, labels, test_size=0.2, random_state=42, stratify=labels
        )

        # Fit vectorizer on training data only
        self.vectorizer.fit(X_train)
        train_vecs = self.vectorizer.transform(X_train)
        test_vecs  = self.vectorizer.transform(X_test)

        self.answer_vectors      = train_vecs
        self.answer_labels_train = y_train

        # Predict using unified threshold τ
        y_pred, y_scores = self._predict_vecs(test_vecs, train_vecs, y_train)

        # Metrics
        acc  = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec  = float(recall_score(y_test, y_pred, zero_division=0))
        f1   = float(f1_score(y_test, y_pred, zero_division=0))
        cm   = confusion_matrix(y_test, y_pred).tolist()
        try:
            auc = float(roc_auc_score(y_test, y_scores))
        except Exception:
            auc = None

        self.metrics = {
            "accuracy":         round(acc,  4),
            "precision":        round(prec, 4),
            "recall":           round(rec,  4),
            "f1_score":         round(f1,   4),
            "auc_roc":          round(auc, 4) if auc else None,
            "confusion_matrix": cm,
            "n_train":          len(X_train),
            "n_test":           len(X_test),
            "n_total":          len(texts),
            "threshold":        self.threshold,
        }

        # QA tutor model
        self.qa_data = data["qa_knowledge"]
        qa_texts = [
            f"{q['question']} {' '.join(q['keywords'])}"
            for q in self.qa_data
        ]
        self.qa_vectorizer.fit(qa_texts)
        self.qa_vectors = self.qa_vectorizer.transform(qa_texts)

        self.is_trained = True
        self.save()
        return self.metrics

    def _predict_vecs(self, test_vecs, train_vecs, y_train):
        """Shared prediction logic using unified threshold τ."""
        y_pred, y_scores = [], []
        y_train_arr = list(y_train)
        for vec in test_vecs:
            sims    = cosine_similarity(vec, train_vecs)[0]
            best_idx = int(np.argmax(sims))
            best_sim = float(sims[best_idx])
            y_scores.append(best_sim)
            # Unified τ — same in train() and check_answer()
            if best_sim >= self.threshold:
                y_pred.append(y_train_arr[best_idx])
            else:
                y_pred.append(False)
        return y_pred, y_scores

    def predict_batch(self, texts: list) -> tuple:
        """
        Predict labels for a list of normalised texts.
        Used by train.py for baseline comparison and ablation study.
        Returns (y_pred, y_scores).
        """
        vecs = self.vectorizer.transform(texts)
        return self._predict_vecs(vecs, self.answer_vectors, self.answer_labels_train)

    # ── Жауап тексеру ─────────────────────────────────────────────────────────
    def check_answer(self, user_answer: str, correct_answer: str) -> dict:
        """Check a single user answer. Unified threshold τ applied."""
        u_norm = normalise(user_answer)
        c_norm = normalise(correct_answer)

        # 1. Exact match
        if u_norm == c_norm:
            return {"score": 1.0, "is_correct": True, "confidence": "high"}

        # 2. Suffix-normalised match
        if suffix_normalise(user_answer) == suffix_normalise(correct_answer):
            return {"score": 0.95, "is_correct": True, "confidence": "high"}

        # 3. TF-IDF cosine similarity with unified τ
        if self.is_trained:
            try:
                u_vec = self.vectorizer.transform([u_norm])
                c_vec = self.vectorizer.transform([c_norm])
                sim   = float(cosine_similarity(u_vec, c_vec)[0][0])

                is_correct = sim >= self.threshold
                confidence = (
                    "high"   if sim >= 0.90 else
                    "medium" if sim >= 0.72 else
                    "low"
                )
                return {
                    "score":      round(sim, 4),
                    "is_correct": is_correct,
                    "confidence": confidence,
                }
            except Exception:
                pass

        # 4. Character bigram fallback
        sim = self._char_similarity(u_norm, c_norm)
        return {
            "score":      round(sim, 4),
            "is_correct": sim >= 0.80,
            "confidence": "low",
        }

    # ── QA тьютор ─────────────────────────────────────────────────────────────
    def get_answer(self, question: str, context: str = "") -> dict:
        if not self.is_trained or self.qa_vectors is None:
            return {
                "answer":     "Модель әлі жүктелмеген.",
                "confidence": 0.0,
                "topic":      "unknown",
            }
        q_clean = f"{normalise(question)} {normalise(context)}"
        q_vec   = self.qa_vectorizer.transform([q_clean])
        sims    = cosine_similarity(q_vec, self.qa_vectors)[0]
        top_idx = int(np.argmax(sims))
        top_sim = float(sims[top_idx])

        if top_sim < 0.15:
            return {
                "answer": (
                    "Кешіріңіз, бұл сұраққа нақты жауап таба алмадым. "
                    "Қазақ грамматикасы туралы сұрақты нақтырақ қойып көріңіз."
                ),
                "confidence": round(top_sim, 4),
                "topic":      "unknown",
            }

        best = self.qa_data[top_idx]
        return {
            "answer":     best["answer"],
            "confidence": round(top_sim, 4),
            "topic":      best["keywords"][0] if best["keywords"] else "general",
        }

    # ── Статистика ────────────────────────────────────────────────────────────
    def get_stats(self) -> dict:
        return {
            "is_trained":     self.is_trained,
            "accuracy":       self.metrics.get("accuracy", 0),
            "f1_score":       self.metrics.get("f1_score", 0),
            "precision":      self.metrics.get("precision", 0),
            "recall":         self.metrics.get("recall", 0),
            "auc_roc":        self.metrics.get("auc_roc"),
            "threshold":      self.threshold,
            "n_answer_pairs": len(self.answer_texts),
            "n_qa_pairs":     len(self.qa_data),
        }

    # ── Сақтау/жүктеу ─────────────────────────────────────────────────────────
    def save(self):
        with open(self.MODEL_PATH, "wb") as f:
            pickle.dump({
                "vectorizer":          self.vectorizer,
                "answer_vectors":      self.answer_vectors,
                "answer_labels_train": self.answer_labels_train,
                "qa_vectorizer":       self.qa_vectorizer,
                "qa_vectors":          self.qa_vectors,
                "qa_data":             self.qa_data,
                "metrics":             self.metrics,
                "is_trained":          self.is_trained,
                "answer_texts":        self.answer_texts,
                "answer_labels":       self.answer_labels,
                "threshold":           self.threshold,
            }, f)

    def load(self):
        try:
            with open(self.MODEL_PATH, "rb") as f:
                d = pickle.load(f)
            self.vectorizer          = d["vectorizer"]
            self.answer_vectors      = d["answer_vectors"]
            self.answer_labels_train = d["answer_labels_train"]
            self.qa_vectorizer       = d["qa_vectorizer"]
            self.qa_vectors          = d["qa_vectors"]
            self.qa_data             = d["qa_data"]
            self.metrics             = d["metrics"]
            self.is_trained          = d["is_trained"]
            self.answer_texts        = d.get("answer_texts", [])
            self.answer_labels       = d.get("answer_labels", [])
            self.threshold           = d.get("threshold", SIMILARITY_THRESHOLD)
        except Exception as e:
            print(f"[model] Жүктеу қатесі: {e}")
            self.is_trained = False

    @staticmethod
    def _char_similarity(a: str, b: str) -> float:
        """Dice bigram similarity — character-level fallback."""
        if not a or not b:
            return 0.0
        if a == b:
            return 1.0
        def bigrams(s):
            return set(s[i:i+2] for i in range(len(s) - 1))
        ba, bb = bigrams(a), bigrams(b)
        if not ba or not bb:
            return 0.0
        return 2 * len(ba & bb) / (len(ba) + len(bb))
