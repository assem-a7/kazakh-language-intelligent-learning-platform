"""
KazakhAnswerModel — TF-IDF + cosine similarity модель
Қазақ тілі жаттығуларының жауаптарын тексеруге арналған
"""
import json
import pickle
import re
import os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix


# ─── Нормализация ───────────────────────────────────────────────────────────
# Казахский тіліндегі жалғаулардың балама формалары
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
    # i → і нормализация (кодировка)
    "i": "і",
}


def normalise(text: str) -> str:
    """
    Казахский жауаптарды нормализациялау:
    1. trim + lowercase
    2. пунктуация алып тастау
    3. суффикс варианттарын унификациялау
    4. i/і кодировка нормализация
    """
    if not text:
        return ""

    text = text.strip().lower()

    # Пунктуация алып тастау
    text = re.sub(r"[.,!?;:\-–—\"'«»()]+", "", text)

    # Бірнеше бос орынды біреуге айналдыру
    text = re.sub(r"\s+", " ", text).strip()

    # i → і кодировка унификациясы (жиі кездесетін қате)
    text = text.replace("i", "і")

    return text


def suffix_normalise(text: str) -> str:
    """
    Суффикс варианттарын унификациялайды —
    дыбыс үйлесімі нұсқаларын бір формаға келтіреді
    """
    result = normalise(text)
    for pattern, replacement in SUFFIX_MAP.items():
        result = re.sub(pattern, replacement, result)
    return result


# ─── Негізгі модель класы ────────────────────────────────────────────────────
class KazakhAnswerModel:
    MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            analyzer="char_wb",    # символ n-граммалар — қазақ тіліне оптималды
            ngram_range=(2, 5),    # 2-4 символды n-граммалар
            min_df=1,
            max_features=10000,
            sublinear_tf=True,
        )
        self.answer_vectors = None
        self.answer_labels = None   # True/False (дұрыс/бұрыс)
        self.answer_texts = []       # барлық нұсқалар
        self.answer_correct = []     # әрбір нұсқаның дұрыс жауабы

        self.qa_vectorizer = TfidfVectorizer(
            analyzer="word",
            ngram_range=(1, 3),
            min_df=1,
            max_features=8000,
            sublinear_tf=True,
        )
        self.qa_vectors = None
        self.qa_data = []            # {question, answer, keywords}

        self.is_trained = False
        self.metrics = {}

        # Болса жүктеу
        if os.path.exists(self.MODEL_PATH):
            self.load()

    # ── Оқыту ─────────────────────────────────────────────────────────────────
    def train(self, data_path: str) -> dict:
        """
        Модельді оқытады және метрикалар қайтарады.
        Метрикалар статьяға тікелей қолданылады.
        """
        with open(data_path, encoding="utf-8") as f:
            data = json.load(f)

        # ── 1. Жауап тексеру моделі ──────────────────────────────────────────
        texts, labels = [], []

        for pair in data["answer_pairs"]:
            correct_norm = normalise(pair["correct"])
            for variant in pair["variants"]:
                v_norm = normalise(variant)
                texts.append(v_norm)
                # Вариант дұрыс болса True, дұрыс емес болса False
                labels.append(v_norm == correct_norm or
                               suffix_normalise(v_norm) == suffix_normalise(correct_norm))

        self.answer_texts = texts
        self.answer_labels = labels

        # Train/test бөліну
        X_train, X_test, y_train, y_test = train_test_split(
            texts, labels, test_size=0.2, random_state=42, stratify=labels
        )

        # TF-IDF оқыту
        self.vectorizer.fit(X_train)
        train_vecs = self.vectorizer.transform(X_train)
        test_vecs  = self.vectorizer.transform(X_test)

        # Косинустық ұқсастықпен болжау
        self.answer_vectors = train_vecs
        self.answer_labels_train = y_train

        y_pred = []
        for vec in test_vecs:
            sims = cosine_similarity(vec, train_vecs)[0]
            best_idx = int(np.argmax(sims))
            best_sim = float(sims[best_idx])
            # Ұқсастық 0.75-тен жоғары болса — сол нұсқаның белгісін аламыз
            if best_sim >= 0.75:
                y_pred.append(y_train[best_idx])
            else:
                y_pred.append(False)

        # Метрикалар
        acc  = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec  = float(recall_score(y_test, y_pred, zero_division=0))
        f1   = float(f1_score(y_test, y_pred, zero_division=0))
        cm   = confusion_matrix(y_test, y_pred).tolist()

        self.metrics = {
            "accuracy":  round(acc,  4),
            "precision": round(prec, 4),
            "recall":    round(rec,  4),
            "f1_score":  round(f1,   4),
            "confusion_matrix": cm,
            "n_train":   len(X_train),
            "n_test":    len(X_test),
            "n_total":   len(texts),
        }

        # ── 2. QA тьютор моделі ─────────────────────────────────────────────
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

    # ── Жауап тексеру ─────────────────────────────────────────────────────────
    def check_answer(self, user_answer: str, correct_answer: str) -> dict:
        """
        Пайдаланушы жауабын тексереді.
        Қайтарады: score, is_correct, confidence
        """
        u_norm = normalise(user_answer)
        c_norm = normalise(correct_answer)

        # 1. Дәл сәйкестік
        if u_norm == c_norm:
            return {"score": 1.0, "is_correct": True, "confidence": "high"}

        # 2. Суффикс нормализациясымен сәйкестік
        u_sfx = suffix_normalise(user_answer)
        c_sfx = suffix_normalise(correct_answer)
        if u_sfx == c_sfx:
            return {"score": 0.95, "is_correct": True, "confidence": "high"}

        # 3. TF-IDF косинустық ұқсастық
        if self.is_trained:
            try:
                u_vec = self.vectorizer.transform([u_norm])
                c_vec = self.vectorizer.transform([c_norm])
                sim = float(cosine_similarity(u_vec, c_vec)[0][0])

                is_correct = sim >= 0.72
                if sim >= 0.90:
                    confidence = "high"
                elif sim >= 0.72:
                    confidence = "medium"
                else:
                    confidence = "low"

                return {
                    "score": round(sim, 4),
                    "is_correct": is_correct,
                    "confidence": confidence,
                }
            except Exception:
                pass

        # 4. Запасной вариант — символдық ұқсастық
        sim = self._char_similarity(u_norm, c_norm)
        return {
            "score": round(sim, 4),
            "is_correct": sim >= 0.80,
            "confidence": "low",
        }

    # ── QA тьютор ─────────────────────────────────────────────────────────────
    def get_answer(self, question: str, context: str = "") -> dict:
        """
        Сұраққа жауап іздейді TF-IDF ұқсастық арқылы.
        """
        if not self.is_trained or self.qa_vectors is None:
            return {
                "answer": "Модель әлі жүктелмеген. Кейінірек қайта байқаңыз.",
                "confidence": 0.0,
                "topic": "unknown",
            }

        q_clean = f"{normalise(question)} {normalise(context)}"
        q_vec   = self.qa_vectorizer.transform([q_clean])
        sims    = cosine_similarity(q_vec, self.qa_vectors)[0]

        top_idx  = int(np.argmax(sims))
        top_sim  = float(sims[top_idx])

        if top_sim < 0.15:
            return {
                "answer": (
                    "Кешіріңіз, бұл сұраққа нақты жауап таба алмадым. "
                    "Қазақ грамматикасы туралы сұрақты нақтырақ қойып көріңіз. "
                    "Мысалы: «Жатыс септігінің жалғаулары қандай?»"
                ),
                "confidence": round(top_sim, 4),
                "topic": "unknown",
            }

        best = self.qa_data[top_idx]
        return {
            "answer":     best["answer"],
            "confidence": round(top_sim, 4),
            "topic":      best["keywords"][0] if best["keywords"] else "general",
        }

    # ── Бағалау ───────────────────────────────────────────────────────────────
    def evaluate(self, test_pairs: list) -> dict:
        """
        Сыртқы тест жинағы бойынша модель бағалайды.
        Статья үшін қолданылады.
        """
        correct = 0
        total   = len(test_pairs)
        results = []

        for pair in test_pairs:
            result = self.check_answer(pair["user"], pair["correct"])
            predicted = result["is_correct"]
            actual    = pair.get("expected", True)
            if predicted == actual:
                correct += 1
            results.append({**result, "actual": actual})

        accuracy = correct / total if total > 0 else 0.0
        return {
            "accuracy":  round(accuracy, 4),
            "correct":   correct,
            "total":     total,
            "details":   results,
        }

    # ── Статистика ────────────────────────────────────────────────────────────
    def get_stats(self) -> dict:
        return {
            "is_trained":     self.is_trained,
            "accuracy":       self.metrics.get("accuracy", 0),
            "f1_score":       self.metrics.get("f1_score", 0),
            "precision":      self.metrics.get("precision", 0),
            "recall":         self.metrics.get("recall", 0),
            "n_answer_pairs": len(self.answer_texts),
            "n_qa_pairs":     len(self.qa_data),
        }

    # ── Сақтау/жүктеу ─────────────────────────────────────────────────────────
    def save(self):
        with open(self.MODEL_PATH, "wb") as f:
            pickle.dump({
                "vectorizer":         self.vectorizer,
                "answer_vectors":     self.answer_vectors,
                "answer_labels_train":self.answer_labels_train,
                "qa_vectorizer":      self.qa_vectorizer,
                "qa_vectors":         self.qa_vectors,
                "qa_data":            self.qa_data,
                "metrics":            self.metrics,
                "is_trained":         self.is_trained,
                "answer_texts":       self.answer_texts,
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
        except Exception as e:
            print(f"[model] Жүктеу қатесі: {e}")
            self.is_trained = False

    # ── Көмекші ───────────────────────────────────────────────────────────────
    @staticmethod
    def _char_similarity(a: str, b: str) -> float:
        """Levenshtein-ға жуық символдық ұқсастық"""
        if not a or not b:
            return 0.0
        if a == b:
            return 1.0
        # Bigram ұқсастық
        def bigrams(s):
            return set(s[i:i+2] for i in range(len(s) - 1))
        ba, bb = bigrams(a), bigrams(b)
        if not ba or not bb:
            return 0.0
        return 2 * len(ba & bb) / (len(ba) + len(bb))
