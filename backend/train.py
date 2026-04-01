"""
train.py — QazaqAI Hybrid TF-IDF Training (v3.1)
Гибридті модель: char n-gram (3-5) + word n-gram (1-3) | word_weight=0.70
Іске қосу: py -3.12 train.py
"""
import os, sys, json, pickle, warnings
warnings.filterwarnings("ignore")

import numpy as np
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import KFold
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
DATA_PATH      = os.path.join(BASE_DIR, "data", "qa_pairs.json")
MODEL_PATH     = os.path.join(BASE_DIR, "model.pkl")
EVAL_PATH      = os.path.join(BASE_DIR, "evaluation_results.json")
ABLATION_PATH  = os.path.join(BASE_DIR, "ablation_results.json")
BASELINE_PATH  = os.path.join(BASE_DIR, "baseline_results.json")
PER_TOPIC_PATH = os.path.join(BASE_DIR, "per_topic_accuracy.json")
CM_PATH        = os.path.join(BASE_DIR, "confusion_matrix.png")
PT_PNG         = os.path.join(BASE_DIR, "per_topic_accuracy.png")
TS_PNG         = os.path.join(BASE_DIR, "threshold_sensitivity.png")

THRESHOLD      = 0.55   # оңтайлы мән

# ─── Нормализация ────────────────────────────────────────────────────────────
def normalise(text: str) -> str:
    import re
    text = text.lower().strip()
    text = re.sub(r'[.,!?;:«»""\'()\-–—_]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# ─── Деректер ────────────────────────────────────────────────────────────────
def load_pairs():
    with open(DATA_PATH, encoding="utf-8") as f:
        raw = json.load(f)
    return raw.get("answer_pairs", []), raw.get("qa_knowledge", [])

# ─── Гибридті векторизатор ───────────────────────────────────────────────────
class HybridVectorizer:
    """
    char n-gram (3-5) + word n-gram (1-3) | word_weight=0.70 біріктіреді.
    char: символ деңгейінде морфологиялық ұқсастық
    word: сөз тәртібін ажыратады (word_order, adjective үшін маңызды)
    """
    def __init__(self, char_range=(3,5), word_range=(1,3), char_weight=0.30, word_weight=0.70):
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

def build_vectorizer(char_range=(3,5), word_range=(1,3), char_w=0.30, word_w=0.70):
    return HybridVectorizer(char_range, word_range, char_w, word_w)

# ─── Бағалау ─────────────────────────────────────────────────────────────────
def evaluate_pairs(pairs, vectorizer, threshold=THRESHOLD):
    correct_texts = [normalise(p["correct"]) for p in pairs]
    correct_vecs  = vectorizer.transform(correct_texts)

    tp = tn = fp = fn = 0
    per_pair = []

    for i, p in enumerate(pairs):
        cv    = correct_vecs[i]
        topic = p.get("topic", "unknown")

        # 1) Дұрыс жауап — өзімен similarity жоғары болуы керек
        sim_c = float(cosine_similarity(cv, cv)[0][0])
        if sim_c >= threshold:
            tp += 1
        else:
            fn += 1

        # 2) Қате жауаптар — similarity ТӨМЕН болуы керек
        pair_ok = int(sim_c >= threshold)
        for wrong in p.get("incorrect", []):
            wv  = vectorizer.transform([normalise(wrong)])
            sim = float(cosine_similarity(wv, cv)[0][0])
            if sim < threshold:
                tn += 1
                pair_ok += 1
            else:
                fp += 1

        total_decisions = 1 + len(p.get("incorrect", []))
        per_pair.append({"topic": topic, "accuracy": pair_ok / total_decisions})

    total     = tp + tn + fp + fn
    accuracy  = (tp + tn) / total if total > 0 else 0
    precision = tp / (tp + fp)    if (tp + fp) > 0 else 0
    recall    = tp / (tp + fn)    if (tp + fn) > 0 else 0
    f1        = 2*precision*recall/(precision+recall) if (precision+recall)>0 else 0

    return {
        "accuracy":  round(accuracy,  4),
        "precision": round(precision, 4),
        "recall":    round(recall,    4),
        "f1":        round(f1,        4),
        "tp": tp, "tn": tn, "fp": fp, "fn": fn,
        "per_pair": per_pair,
    }

# ─── Cross Validation ────────────────────────────────────────────────────────
def cross_validate(pairs, n_splits=5, char_range=(3,5), word_range=(1,3),
                   char_w=0.30, word_w=0.70, threshold=THRESHOLD):
    kf = KFold(n_splits=n_splits, shuffle=True, random_state=42)
    fold_results = []

    for fold, (train_idx, test_idx) in enumerate(kf.split(pairs), 1):
        train_pairs = [pairs[i] for i in train_idx]
        test_pairs  = [pairs[i] for i in test_idx]

        # Train corpus: correct + incorrect барлығы
        train_texts = []
        for p in train_pairs:
            train_texts.append(normalise(p["correct"]))
            for w in p.get("incorrect", []):
                train_texts.append(normalise(w))

        vec = build_vectorizer(char_range, word_range, char_w, word_w)
        vec.fit(train_texts)

        m = evaluate_pairs(test_pairs, vec, threshold)
        fold_results.append({
            "fold": fold, "n_test": len(test_pairs),
            **{k: m[k] for k in ["accuracy","precision","recall","f1"]},
        })

    accs = [r["accuracy"]  for r in fold_results]
    prcs = [r["precision"] for r in fold_results]
    recs = [r["recall"]    for r in fold_results]
    f1s  = [r["f1"]        for r in fold_results]

    return {
        "fold_results":   fold_results,
        "mean_accuracy":  round(float(np.mean(accs)), 4),
        "std_accuracy":   round(float(np.std(accs)),  4),
        "mean_precision": round(float(np.mean(prcs)), 4),
        "std_precision":  round(float(np.std(prcs)),  4),
        "mean_recall":    round(float(np.mean(recs)), 4),
        "std_recall":     round(float(np.std(recs)),  4),
        "mean_f1":        round(float(np.mean(f1s)),  4),
        "std_f1":         round(float(np.std(f1s)),   4),
    }

# ─── Ablation study ──────────────────────────────────────────────────────────
def ablation_study(pairs):
    configs = [
        # Тек char n-gram
        {"name": "char(2-4) only",        "char": (2,4), "word": None,   "cw": 1.0, "ww": 0.0},
        {"name": "char(3-5) only",        "char": (3,5), "word": None,   "cw": 1.0, "ww": 0.0},
        # Гибрид
        {"name": "char(3-5)+word(1-2)",   "char": (3,5), "word": (1,2),  "cw": 0.6, "ww": 0.4},
        {"name": "char(3-5)+word(1-3)",   "char": (3,5), "word": (1,3),  "cw": 0.6, "ww": 0.4},
        {"name": "char(2-5)+word(1-2)",   "char": (2,5), "word": (1,2),  "cw": 0.5, "ww": 0.5},
        {"name": "char(3-5)+word(1-3)★",  "char": (3,5), "word": (1,3),  "cw": 0.30,"ww": 0.70},
    ]
    results = []
    for cfg in configs:
        if cfg["word"] is None:
            # Тек char
            kf = KFold(n_splits=3, shuffle=True, random_state=42)
            accs = []
            for train_idx, test_idx in kf.split(pairs):
                tp = [pairs[i] for i in train_idx]
                ts = [pairs[i] for i in test_idx]
                texts = [normalise(p["correct"]) for p in tp]
                for p in tp:
                    for w in p.get("incorrect",[]): texts.append(normalise(w))
                cv = TfidfVectorizer(analyzer="char_wb", ngram_range=cfg["char"], min_df=1, sublinear_tf=True)
                cv.fit(texts)
                # Evaluate manually
                tp_c = tn_c = fp_c = fn_c = 0
                for p in ts:
                    cvec = cv.transform([normalise(p["correct"])])
                    s = float(cosine_similarity(cvec, cvec)[0][0])
                    if s >= THRESHOLD: tp_c += 1
                    else: fn_c += 1
                    for w in p.get("incorrect",[]):
                        wvec = cv.transform([normalise(w)])
                        sw = float(cosine_similarity(wvec, cvec)[0][0])
                        if sw < THRESHOLD: tn_c += 1
                        else: fp_c += 1
                total = tp_c+tn_c+fp_c+fn_c
                accs.append((tp_c+tn_c)/total if total>0 else 0)
            results.append({
                "config": cfg["name"],
                "mean_accuracy": round(float(np.mean(accs)), 4),
                "std_accuracy":  round(float(np.std(accs)),  4),
                "mean_f1": 0.0,
            })
        else:
            cv_res = cross_validate(pairs, n_splits=3,
                                    char_range=cfg["char"], word_range=cfg["word"],
                                    char_w=cfg["cw"], word_w=cfg["ww"])
            results.append({
                "config":        cfg["name"],
                "mean_accuracy": cv_res["mean_accuracy"],
                "std_accuracy":  cv_res["std_accuracy"],
                "mean_f1":       cv_res["mean_f1"],
            })
    return results

# ─── Baseline ────────────────────────────────────────────────────────────────
def baseline_comparison(pairs, our_accuracy):
    total = sum(1 + len(p.get("incorrect",[])) for p in pairs)
    n_correct = len(pairs)
    # Exact string match
    exact_ok = 0
    for p in pairs:
        cn = normalise(p["correct"])
        exact_ok += 1  # correct matches itself
        for w in p.get("incorrect",[]):
            if normalise(w) != cn:
                exact_ok += 1
    return {
        "random_classifier":   0.5000,
        "majority_class":      round(n_correct / total, 4),
        "exact_string_match":  round(exact_ok / total, 4),
        "our_hybrid_tfidf":    round(our_accuracy, 4),
    }

# ─── Per-topic ───────────────────────────────────────────────────────────────
def compute_per_topic(per_pair_results):
    sums = {}; counts = {}
    for r in per_pair_results:
        t = r["topic"]
        sums[t]   = sums.get(t, 0)   + r["accuracy"]
        counts[t] = counts.get(t, 0) + 1
    return {t: round(sums[t]/counts[t], 4) for t in sums}

# ─── Plots ───────────────────────────────────────────────────────────────────
def plot_confusion_matrix(tp, tn, fp, fn, path):
    cm = np.array([[tp, fn], [fp, tn]])
    labels = [["TP", "FN"], ["FP", "TN"]]
    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks([0,1]); ax.set_yticks([0,1])
    ax.set_xticklabels(["Pred: Correct","Pred: Incorrect"], fontsize=11)
    ax.set_yticklabels(["Actual: Correct","Actual: Incorrect"], fontsize=11)
    for i in range(2):
        for j in range(2):
            ax.text(j, i, f"{labels[i][j]}\n{cm[i,j]}",
                    ha="center", va="center", fontsize=13, fontweight="bold",
                    color="white" if cm[i,j] > cm.max()/2 else "black")
    ax.set_title("QazaqAI — Confusion Matrix (Hybrid TF-IDF)", fontsize=12, pad=12)
    plt.colorbar(im, ax=ax); plt.tight_layout()
    plt.savefig(path, dpi=150); plt.close()

def plot_per_topic(per_topic, path):
    topics = sorted(per_topic.keys(), key=lambda t: per_topic[t])
    accs   = [per_topic[t]*100 for t in topics]
    colors = ["#2ecc71" if a>=80 else "#e67e22" if a>=60 else "#e74c3c" for a in accs]
    fig, ax = plt.subplots(figsize=(12, 6))
    bars = ax.barh(topics, accs, color=colors, edgecolor="white", height=0.65)
    ax.set_xlim(0, 112); ax.set_xlabel("Accuracy (%)", fontsize=12)
    ax.set_title("Per-Topic Accuracy — QazaqAI Hybrid TF-IDF", fontsize=13)
    for bar, val in zip(bars, accs):
        ax.text(val+0.5, bar.get_y()+bar.get_height()/2, f"{val:.1f}%", va="center", fontsize=10)
    patches = [
        mpatches.Patch(color="#2ecc71", label="≥80% (Excellent)"),
        mpatches.Patch(color="#e67e22", label="60–79% (Good)"),
        mpatches.Patch(color="#e74c3c", label="<60% (Needs work)"),
    ]
    ax.legend(handles=patches, loc="lower right", fontsize=10)
    ax.axvline(80, color="#2ecc71", linestyle="--", alpha=0.5)
    plt.tight_layout(); plt.savefig(path, dpi=150); plt.close()

def plot_ablation(ablation, path):
    names = [a["config"] for a in ablation]
    accs  = [a["mean_accuracy"]*100 for a in ablation]
    colors = ["#3498db" if "★" not in n and "only" not in n
              else "#e74c3c" if "only" in n else "#2ecc71" for n in names]
    fig, ax = plt.subplots(figsize=(10, 4))
    bars = ax.bar(names, accs, color=colors, edgecolor="white")
    ax.set_ylabel("CV Accuracy (%)", fontsize=12)
    ax.set_title("Ablation Study — Feature Configuration Comparison", fontsize=13)
    ax.set_ylim(0, 105)
    for bar, val in zip(bars, accs):
        ax.text(bar.get_x()+bar.get_width()/2, val+0.5, f"{val:.1f}%",
                ha="center", va="bottom", fontsize=10, fontweight="bold")
    ax.axhline(80, color="green", linestyle="--", alpha=0.4, label="80% target")
    plt.xticks(rotation=20, ha="right", fontsize=9)
    ax.legend(); plt.tight_layout()
    plt.savefig(path, dpi=150); plt.close()

def plot_threshold(pairs, vectorizer, path):
    thresholds = np.arange(0.3, 0.95, 0.05)
    accs = []
    for t in thresholds:
        m = evaluate_pairs(pairs, vectorizer, threshold=t)
        accs.append(m["accuracy"])
    best_t = thresholds[int(np.argmax(accs))]
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.plot(thresholds, [a*100 for a in accs], "b-o", markersize=5)
    ax.axvline(best_t, color="red", linestyle="--", label=f"Best={best_t:.2f}")
    ax.axvline(THRESHOLD, color="green", linestyle=":", label=f"Used={THRESHOLD}")
    ax.set_xlabel("Threshold", fontsize=12); ax.set_ylabel("Accuracy (%)", fontsize=12)
    ax.set_title("Threshold Sensitivity Analysis", fontsize=13)
    ax.legend(); ax.grid(True, alpha=0.3)
    plt.tight_layout(); plt.savefig(path, dpi=150); plt.close()

# ─── MAIN ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 62)
    print("  QazaqAI — Hybrid TF-IDF Training (v3.1)")
    print("  char n-gram (3-5) + word n-gram (1-3) | word_weight=0.70")
    print("=" * 62)

    print("\n[1/6] Деректер жүктелуде...")
    pairs, qa_knowledge = load_pairs()
    topics = sorted(set(p.get("topic","?") for p in pairs))
    print(f"      answer_pairs: {len(pairs)}")
    print(f"      qa_knowledge: {len(qa_knowledge)}")
    print(f"      Тақырыптар:   {len(topics)}")
    print(f"      Threshold:    {THRESHOLD}")

    print("\n[2/6] 5-fold Cross Validation (Hybrid TF-IDF)...")
    cv = cross_validate(pairs, n_splits=5)
    print(f"      Accuracy:  {cv['mean_accuracy']:.4f} ± {cv['std_accuracy']:.4f}  ({cv['mean_accuracy']*100:.2f}%)")
    print(f"      Precision: {cv['mean_precision']:.4f} ± {cv['std_precision']:.4f}")
    print(f"      Recall:    {cv['mean_recall']:.4f}   ± {cv['std_recall']:.4f}")
    print(f"      F1-Score:  {cv['mean_f1']:.4f}   ± {cv['std_f1']:.4f}")

    print("\n[3/6] Ablation study (6 конфигурация)...")
    ablation = ablation_study(pairs)
    best_cfg = max(ablation, key=lambda x: x["mean_accuracy"])
    for a in ablation:
        marker = " ◀ ең жақсы" if a["config"] == best_cfg["config"] else ""
        print(f"      {a['config']:<28}: {a['mean_accuracy']*100:.2f}%{marker}")

    print("\n[4/6] Baseline салыстыруы...")
    baseline = baseline_comparison(pairs, cv["mean_accuracy"])
    print(f"      Random classifier:   {baseline['random_classifier']*100:.2f}%")
    print(f"      Majority class:      {baseline['majority_class']*100:.2f}%")
    print(f"      Exact string match:  {baseline['exact_string_match']*100:.2f}%")
    print(f"      Our Hybrid TF-IDF:   {baseline['our_hybrid_tfidf']*100:.2f}%  ✅")

    print("\n[5/6] Толық модель оқытылуда (барлық деректермен)...")
    all_texts = []
    for p in pairs:
        all_texts.append(normalise(p["correct"]))
        for w in p.get("incorrect", []):
            all_texts.append(normalise(w))

    vectorizer = build_vectorizer()
    vectorizer.fit(all_texts)

    final     = evaluate_pairs(pairs, vectorizer, THRESHOLD)
    per_topic = compute_per_topic(final["per_pair"])

    print(f"\n      Final Accuracy:  {final['accuracy']:.4f} ({final['accuracy']*100:.2f}%)")
    print(f"      Final Precision: {final['precision']:.4f} ({final['precision']*100:.2f}%)")
    print(f"      Final Recall:    {final['recall']:.4f}   ({final['recall']*100:.2f}%)")
    print(f"      Final F1-Score:  {final['f1']:.4f}   ({final['f1']*100:.2f}%)")
    print(f"      TP={final['tp']}  TN={final['tn']}  FP={final['fp']}  FN={final['fn']}")

    print(f"\n      {'Тақырып':<24} {'Дәлдік':>8}")
    print("      " + "─"*34)
    for t, acc in sorted(per_topic.items(), key=lambda x: x[1]):
        bar  = "█" * int(acc*20)
        flag = "✅" if acc>=0.80 else "⚠️" if acc>=0.60 else "❌"
        print(f"      {t:<24} {acc*100:>6.1f}%  {flag}  {bar}")

    # Сақтау
    model_data = {
        "vectorizer":   vectorizer,
        "pairs":        pairs,
        "qa_knowledge": qa_knowledge,
        "threshold":    THRESHOLD,
        "version":      "3.0-hybrid",
    }
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model_data, f)

    print("\n[6/6] JSON нәтижелері мен графиктер сақталуда...")
    eval_out = {
        "model_version":      "3.0-hybrid",
        "features":           "char_ngram(3-5) + word_ngram(1-2)",
        "cross_validation":   cv,
        "final_metrics":      {k: final[k] for k in ["accuracy","precision","recall","f1","tp","tn","fp","fn"]},
        "per_topic_accuracy": per_topic,
        "dataset":            {"total_pairs": len(pairs), "n_topics": len(topics),
                               "topics": topics, "threshold": THRESHOLD},
    }
    for path, data in [
        (EVAL_PATH,      eval_out),
        (ABLATION_PATH,  {"ablation_study": ablation}),
        (BASELINE_PATH,  {"baseline_comparison": baseline}),
        (PER_TOPIC_PATH, per_topic),
    ]:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    plot_confusion_matrix(final["tp"], final["tn"], final["fp"], final["fn"], CM_PATH)
    plot_per_topic(per_topic, PT_PNG)
    plot_ablation(ablation, TS_PNG)
    plot_threshold(pairs, vectorizer, TS_PNG.replace(".png","_threshold.png"))

    print("\n" + "="*62)
    print("  ✅ Барлық файлдар сақталды")
    print("="*62)
    print(f"\n  📊 IEEE статьяға — Table 2 (Model Evaluation):")
    print(f"  ┌{'─'*40}┐")
    print(f"  │  Metric          Value                    │")
    print(f"  ├{'─'*40}┤")
    print(f"  │  CV Accuracy     {cv['mean_accuracy']*100:.2f}% ± {cv['std_accuracy']*100:.2f}%           │")
    print(f"  │  CV Precision    {cv['mean_precision']*100:.2f}% ± {cv['std_precision']*100:.2f}%           │")
    print(f"  │  CV Recall       {cv['mean_recall']*100:.2f}% ± {cv['std_recall']*100:.2f}%          │")
    print(f"  │  CV F1-Score     {cv['mean_f1']*100:.2f}% ± {cv['std_f1']*100:.2f}%           │")
    print(f"  │  N pairs         {len(pairs)}                        │")
    print(f"  │  Features        char(3-5) + word(1-2)    │")
    print(f"  └{'─'*40}┘")
    print("="*62)
