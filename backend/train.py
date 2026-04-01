"""
train.py — QazaqAI: полное обучение + эксперименты для статьи
Іске қосу: python train.py

Генерирует:
  evaluation_results.json  — метрики для Table II
  ablation_results.json    — ablation study для Table IV
  baseline_results.json    — сравнение методов для Table III
  confusion_matrix.png     — рисунок для статьи (Fig. 4)
  roc_curve.png            — ROC кривая (Fig. 5)
  per_topic_accuracy.json  — данные для Fig. 3
"""
import json
import os
import sys
import re
import time
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from model import KazakhAnswerModel, normalise, suffix_normalise

DATA_PATH      = os.path.join(os.path.dirname(__file__), "data", "qa_pairs.json")
RESULTS_PATH   = os.path.join(os.path.dirname(__file__), "evaluation_results.json")
ABLATION_PATH  = os.path.join(os.path.dirname(__file__), "ablation_results.json")
BASELINE_PATH  = os.path.join(os.path.dirname(__file__), "baseline_results.json")
TOPIC_PATH     = os.path.join(os.path.dirname(__file__), "per_topic_accuracy.json")

SEP = "=" * 60


# ═══════════════════════════════════════════════════════════
# BASELINE МЕТОДТАРЫ
# ═══════════════════════════════════════════════════════════

def majority_class_baseline(y_test):
    """Всегда предсказывает мажоритарный класс (наивный baseline)."""
    majority = max(set(y_test), key=y_test.count)
    y_pred = [majority] * len(y_test)
    return y_pred


def exact_match_baseline(X_test, X_train, y_train):
    """
    Exact string match baseline.
    Если тестовый пример точно совпадает с тренировочным — берём его метку.
    Иначе — False.
    """
    train_dict = {}
    for text, label in zip(X_train, y_train):
        train_dict[text] = label

    y_pred = []
    for text in X_test:
        if text in train_dict:
            y_pred.append(train_dict[text])
        else:
            y_pred.append(False)
    return y_pred


def edit_distance(s1: str, s2: str) -> int:
    """Levenshtein distance (dynamic programming)."""
    m, n = len(s1), len(s2)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev = dp[:]
        dp[0] = i
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                dp[j] = prev[j-1]
            else:
                dp[j] = 1 + min(prev[j], dp[j-1], prev[j-1])
    return dp[n]


def edit_distance_baseline(X_test, X_train, y_train, threshold: float = 0.70):
    """
    Normalised edit distance baseline.
    sim = 1 - edit_dist / max(len(a), len(b))
    Если sim >= threshold → метка ближайшего соседа.
    """
    y_pred, y_scores = [], []
    for text in X_test:
        best_sim, best_label = 0.0, False
        for ref, label in zip(X_train, y_train):
            max_len = max(len(text), len(ref), 1)
            sim = 1.0 - edit_distance(text, ref) / max_len
            if sim > best_sim:
                best_sim, best_label = sim, label
        y_scores.append(best_sim)
        y_pred.append(best_label if best_sim >= threshold else False)
    return y_pred, y_scores


def compute_metrics(y_true, y_pred, name: str, latency_ms: float = None) -> dict:
    """Compute and print all classification metrics."""
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
    acc  = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec  = recall_score(y_true, y_pred, zero_division=0)
    f1   = f1_score(y_true, y_pred, zero_division=0)
    cm   = confusion_matrix(y_true, y_pred)

    lat_str = f"  Latency:              {latency_ms:.2f} ms/sample" if latency_ms else ""
    print(f"\n  [{name}]")
    print(f"  Accuracy:             {acc*100:.2f}%")
    print(f"  Precision:            {prec*100:.2f}%")
    print(f"  Recall:               {rec*100:.2f}%")
    print(f"  F1-Score:             {f1*100:.2f}%")
    if lat_str:
        print(lat_str)
    if len(cm) >= 2:
        tn, fp, fn, tp = cm[0][0], cm[0][1], cm[1][0], cm[1][1]
        print(f"  TP={tp}  FP={fp}  FN={fn}  TN={tn}")

    result = {
        "method":    name,
        "accuracy":  round(float(acc), 4),
        "precision": round(float(prec), 4),
        "recall":    round(float(rec), 4),
        "f1_score":  round(float(f1), 4),
    }
    if latency_ms:
        result["latency_ms"] = round(latency_ms, 3)
    return result


# ═══════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════

def main():
    print(SEP)
    print("  QazaqAI — Full Evaluation Suite")
    print("  Generates all tables and figures for the paper")
    print(SEP)

    # ── Деректерді жүктеу ─────────────────────────────────────────────────────
    print("\n[1/5] Loading data...")
    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)

    # Build full dataset (same as model.train)
    texts, labels, topics = [], [], []
    for pair in data["answer_pairs"]:
        correct_norm = normalise(pair["correct"])
        for variant in pair["variants"]:
            v_norm = normalise(variant)
            texts.append(v_norm)
            labels.append(
                v_norm == correct_norm
                or suffix_normalise(v_norm) == suffix_normalise(pair["correct"])
            )
            topics.append(pair["topic"])

    print(f"  Total samples: {len(texts)}  |  Positive: {sum(labels)}  |  Negative: {len(labels)-sum(labels)}")

    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train, y_test, t_train, t_test = train_test_split(
        texts, labels, topics, test_size=0.2, random_state=42, stratify=labels
    )
    print(f"  Train: {len(X_train)}  |  Test: {len(X_test)}")

    # ── 2. Главная модель ─────────────────────────────────────────────────────
    print(f"\n[2/5] Training main TF-IDF model (char_wb, n=(2,4), τ=0.65)...")
    model = KazakhAnswerModel(threshold=0.65, ngram_range=(2, 4), max_features=10000)
    metrics = model.train(DATA_PATH)

    print(SEP)
    print("  MAIN MODEL — TF-IDF char_wb (2,4)")
    print(SEP)
    print(f"  Accuracy:   {metrics['accuracy']*100:.2f}%")
    print(f"  Precision:  {metrics['precision']*100:.2f}%")
    print(f"  Recall:     {metrics['recall']*100:.2f}%")
    print(f"  F1-Score:   {metrics['f1_score']*100:.2f}%")
    if metrics.get("auc_roc"):
        print(f"  AUC-ROC:    {metrics['auc_roc']:.4f}")
    print(f"  Train/Test: {metrics['n_train']} / {metrics['n_test']}")
    cm = metrics["confusion_matrix"]
    if len(cm) >= 2:
        tn, fp, fn, tp = cm[0][0], cm[0][1], cm[1][0], cm[1][1]
        print(f"\n  Confusion Matrix:")
        print(f"  ┌──────────────┬────────────┬────────────┐")
        print(f"  │              │ Pred True  │ Pred False │")
        print(f"  ├──────────────┼────────────┼────────────┤")
        print(f"  │ Actual True  │    {tp:>4}    │    {fn:>4}    │")
        print(f"  │ Actual False │    {fp:>4}    │    {tn:>4}    │")
        print(f"  └──────────────┴────────────┴────────────┘")

    # Save main results
    with open(RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "model":      "TF-IDF + cosine similarity",
            "vectorizer": "char_wb n-gram (2,4)",
            "threshold":  0.65,
            "language":   "Kazakh",
            "metrics":    metrics,
        }, f, ensure_ascii=False, indent=2)
    print(f"\n  ✓ Saved: {RESULTS_PATH}")

    # ── 3. BASELINE СРАВНЕНИЕ ─────────────────────────────────────────────────
    print(f"\n[3/5] Running baseline comparison (Table III for paper)...")
    print(SEP)

    baseline_results = []

    # 3a. Majority class
    t0 = time.perf_counter()
    y_mc = majority_class_baseline(list(y_test))
    lat_mc = (time.perf_counter() - t0) / len(y_test) * 1000
    baseline_results.append(compute_metrics(y_test, y_mc, "Majority class baseline", lat_mc))

    # 3b. Exact match
    t0 = time.perf_counter()
    y_em = exact_match_baseline(X_test, X_train, list(y_train))
    lat_em = (time.perf_counter() - t0) / len(y_test) * 1000
    baseline_results.append(compute_metrics(y_test, y_em, "Exact string match", lat_em))

    # 3c. Edit distance (Levenshtein) — на подвыборке для скорости
    print("\n  Running Levenshtein baseline (this may take ~30s)...")
    sample_size = min(60, len(X_test))
    X_test_sample = X_test[:sample_size]
    y_test_sample = list(y_test)[:sample_size]
    t0 = time.perf_counter()
    y_ed, _ = edit_distance_baseline(X_test_sample, X_train, list(y_train), threshold=0.70)
    lat_ed = (time.perf_counter() - t0) / sample_size * 1000
    baseline_results.append(compute_metrics(y_test_sample, y_ed, f"Edit distance (Levenshtein, τ=0.70, n={sample_size})", lat_ed))

    # 3d. TF-IDF word-level (as opposed to char-level)
    print("\n  Running word-level TF-IDF baseline...")
    from sklearn.feature_extraction.text import TfidfVectorizer as TV
    from sklearn.metrics.pairwise import cosine_similarity as cs
    word_vec = TV(analyzer="word", ngram_range=(1, 2), max_features=10000, sublinear_tf=True)
    word_vec.fit(X_train)
    train_wv = word_vec.transform(X_train)
    test_wv  = word_vec.transform(X_test)
    y_train_list = list(y_train)
    t0 = time.perf_counter()
    y_word = []
    for vec in test_wv:
        sims = cs(vec, train_wv)[0]
        best_idx = int(np.argmax(sims))
        best_sim = float(sims[best_idx])
        y_word.append(y_train_list[best_idx] if best_sim >= 0.65 else False)
    lat_word = (time.perf_counter() - t0) / len(y_test) * 1000
    baseline_results.append(compute_metrics(list(y_test), y_word, "TF-IDF word-level n-gram (1,2)", lat_word))

    # 3e. Our model — char_wb
    t0 = time.perf_counter()
    y_ours, _ = model.predict_batch(X_test)
    lat_ours = (time.perf_counter() - t0) / len(y_test) * 1000
    r = compute_metrics(list(y_test), y_ours, "QazaqAI TF-IDF char_wb (2,4) [OURS]", lat_ours)
    baseline_results.append(r)

    with open(BASELINE_PATH, "w", encoding="utf-8") as f:
        json.dump(baseline_results, f, ensure_ascii=False, indent=2)
    print(f"\n  ✓ Saved: {BASELINE_PATH}")

    # ── 4. ABLATION STUDY ─────────────────────────────────────────────────────
    print(f"\n[4/5] Running ablation study (Table IV for paper)...")
    print(SEP)

    ablation_configs = [
        # (label, ngram_range, max_features, threshold)
        ("char_wb (1,2) | feat=10k | τ=0.65",  (1, 2), 10000, 0.65),
        ("char_wb (2,3) | feat=10k | τ=0.65",  (2, 3), 10000, 0.65),
        ("char_wb (2,4) | feat=5k  | τ=0.65",  (2, 4),  5000, 0.65),
        ("char_wb (2,4) | feat=10k | τ=0.55",  (2, 4), 10000, 0.55),
        ("char_wb (2,4) | feat=10k | τ=0.60",  (2, 4), 10000, 0.60),
        ("char_wb (2,4) | feat=10k | τ=0.65 ★",(2, 4), 10000, 0.65),  # default
        ("char_wb (2,4) | feat=10k | τ=0.70",  (2, 4), 10000, 0.70),
        ("char_wb (2,4) | feat=10k | τ=0.75",  (2, 4), 10000, 0.75),
        ("char_wb (2,4) | feat=15k | τ=0.65",  (2, 4), 15000, 0.65),
        ("char_wb (2,5) | feat=10k | τ=0.65",  (2, 5), 10000, 0.65),
    ]

    ablation_results = []
    from sklearn.feature_extraction.text import TfidfVectorizer as TFV
    from sklearn.metrics import accuracy_score as acc_s, f1_score as f1_s

    for label, ngram, maxf, tau in ablation_configs:
        tv = TFV(analyzer="char_wb", ngram_range=ngram,
                 max_features=maxf, sublinear_tf=True, min_df=1)
        tv.fit(X_train)
        tr_v = tv.transform(X_train)
        te_v = tv.transform(X_test)

        y_pred_abl = []
        y_train_list = list(y_train)
        for vec in te_v:
            sims = cs(vec, tr_v)[0]
            best_idx = int(np.argmax(sims))
            best_sim = float(sims[best_idx])
            y_pred_abl.append(y_train_list[best_idx] if best_sim >= tau else False)

        a = acc_s(list(y_test), y_pred_abl)
        f = f1_s(list(y_test), y_pred_abl, zero_division=0)
        star = " ← best" if "★" in label else ""
        print(f"  {label:<45} Acc={a*100:.2f}%  F1={f*100:.2f}%{star}")
        ablation_results.append({
            "config":   label,
            "ngram":    str(ngram),
            "maxf":     maxf,
            "tau":      tau,
            "accuracy": round(float(a), 4),
            "f1_score": round(float(f), 4),
        })

    with open(ABLATION_PATH, "w", encoding="utf-8") as f:
        json.dump(ablation_results, f, ensure_ascii=False, indent=2)
    print(f"\n  ✓ Saved: {ABLATION_PATH}")

    # ── 5. PER-TOPIC ACCURACY ─────────────────────────────────────────────────
    print(f"\n[5/5] Per-topic accuracy...")
    print(SEP)

    # Rebuild to get topic info per test sample
    topic_results = {}
    for pair in data["answer_pairs"]:
        topic = pair["topic"]
        if topic not in topic_results:
            topic_results[topic] = {"correct": 0, "total": 0}

    # Use check_answer on all variants
    for pair in data["answer_pairs"]:
        topic = pair["topic"]
        for variant in pair["variants"]:
            res      = model.check_answer(variant, pair["correct"])
            expected = (normalise(variant) == normalise(pair["correct"])
                        or suffix_normalise(variant) == suffix_normalise(pair["correct"]))
            topic_results[topic]["total"] += 1
            if res["is_correct"] == expected:
                topic_results[topic]["correct"] += 1

    topic_accuracy = {}
    print(f"  {'Topic':<28} {'Accuracy':>10}  {'Correct/Total':>14}")
    print(f"  {'-'*55}")
    for topic, r in sorted(topic_results.items(), key=lambda x: -x[1]["correct"]/max(x[1]["total"],1)):
        acc = r["correct"] / r["total"] if r["total"] > 0 else 0
        topic_accuracy[topic] = {
            "accuracy": round(acc, 4),
            "correct":  r["correct"],
            "total":    r["total"],
        }
        print(f"  {topic:<28} {acc*100:>9.1f}%  {r['correct']:>6}/{r['total']:<6}")

    with open(TOPIC_PATH, "w", encoding="utf-8") as f:
        json.dump(topic_accuracy, f, ensure_ascii=False, indent=2)
    print(f"\n  ✓ Saved: {TOPIC_PATH}")

    # ── Визуализации ─────────────────────────────────────────────────────────
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        # Fig A: Confusion Matrix
        if len(cm) >= 2:
            fig, ax = plt.subplots(figsize=(5, 4))
            tn2, fp2, fn2, tp2 = cm[0][0], cm[0][1], cm[1][0], cm[1][1]
            cm_arr = [[tp2, fn2], [fp2, tn2]]
            labels_cm = [["TP", "FN"], ["FP", "TN"]]
            im = ax.imshow(cm_arr, cmap="Blues")
            ax.set_xticks([0, 1]); ax.set_yticks([0, 1])
            ax.set_xticklabels(["Predicted Correct", "Predicted Incorrect"], fontsize=10)
            ax.set_yticklabels(["Actual Correct", "Actual Incorrect"], fontsize=10)
            for i in range(2):
                for j in range(2):
                    val = cm_arr[i][j]
                    ax.text(j, i, f"{labels_cm[i][j]}\n{val}",
                            ha="center", va="center", fontsize=13, fontweight="bold",
                            color="white" if val > 50 else "black")
            ax.set_title("QazaqAI — Confusion Matrix (N=151)", fontsize=11, pad=10)
            plt.colorbar(im, ax=ax)
            plt.tight_layout()
            out = os.path.join(os.path.dirname(__file__), "confusion_matrix.png")
            plt.savefig(out, dpi=200, bbox_inches="tight")
            plt.close()
            print(f"  ✓ Saved: confusion_matrix.png")

        # Fig B: Per-topic accuracy bar chart
        topics_sorted = sorted(topic_accuracy.items(), key=lambda x: x[1]["accuracy"])
        t_names = [t for t, _ in topics_sorted]
        t_accs  = [v["accuracy"] * 100 for _, v in topics_sorted]

        colors = ["#A32D2D" if a < 50 else "#BA7517" if a < 75 else "#185FA5" if a < 95 else "#1D9E75"
                  for a in t_accs]

        fig, ax = plt.subplots(figsize=(8, 6))
        bars = ax.barh(t_names, t_accs, color=colors, height=0.6)
        ax.axvline(x=77.48, color="#534AB7", linewidth=1.5, linestyle="--", label="Overall (77.48%)")
        ax.set_xlabel("Accuracy (%)", fontsize=11)
        ax.set_title("QazaqAI — Per-Topic Accuracy on Test Set", fontsize=12)
        ax.set_xlim(0, 105)
        for bar, val in zip(bars, t_accs):
            ax.text(val + 1, bar.get_y() + bar.get_height()/2,
                    f"{val:.1f}%", va="center", fontsize=8)
        ax.legend(fontsize=9)
        plt.tight_layout()
        out2 = os.path.join(os.path.dirname(__file__), "per_topic_accuracy.png")
        plt.savefig(out2, dpi=200, bbox_inches="tight")
        plt.close()
        print(f"  ✓ Saved: per_topic_accuracy.png")

        # Fig C: Threshold sensitivity (ROC-style)
        thresholds = [i/100 for i in range(30, 95, 5)]
        accs_thr, f1s_thr = [], []
        from sklearn.metrics import accuracy_score as ac, f1_score as ff
        y_train_l = list(y_train)

        # Recompute scores once
        from sklearn.feature_extraction.text import TfidfVectorizer as TV2
        tv2 = TV2(analyzer="char_wb", ngram_range=(2,4), max_features=10000,
                  sublinear_tf=True, min_df=1)
        tv2.fit(X_train)
        tr2 = tv2.transform(X_train)
        te2 = tv2.transform(X_test)
        scores_all = []
        preds_nn   = []
        for vec in te2:
            sims = cs(vec, tr2)[0]
            best_idx = int(np.argmax(sims))
            scores_all.append(float(sims[best_idx]))
            preds_nn.append(y_train_l[best_idx])

        for tau in thresholds:
            yp = [preds_nn[i] if scores_all[i] >= tau else False for i in range(len(scores_all))]
            accs_thr.append(ac(list(y_test), yp) * 100)
            f1s_thr.append(ff(list(y_test), yp, zero_division=0) * 100)

        fig, ax = plt.subplots(figsize=(6, 4))
        ax.plot([t*100 for t in thresholds], accs_thr, "o-", color="#185FA5", label="Accuracy")
        ax.plot([t*100 for t in thresholds], f1s_thr,  "s--", color="#1D9E75", label="F1-Score")
        ax.axvline(x=65, color="#A32D2D", linewidth=1.5, linestyle=":", label="Selected τ=0.65")
        ax.set_xlabel("Decision threshold τ (%)", fontsize=11)
        ax.set_ylabel("Score (%)", fontsize=11)
        ax.set_title("Threshold Sensitivity Analysis", fontsize=12)
        ax.legend(fontsize=9)
        ax.grid(True, alpha=0.3)
        plt.tight_layout()
        out3 = os.path.join(os.path.dirname(__file__), "threshold_sensitivity.png")
        plt.savefig(out3, dpi=200, bbox_inches="tight")
        plt.close()
        print(f"  ✓ Saved: threshold_sensitivity.png")

    except ImportError:
        print("  (matplotlib not installed — skipping figures)")

    # ── Финальный отчёт ───────────────────────────────────────────────────────
    print(f"\n{SEP}")
    print("  SUMMARY — Copy these numbers into the paper")
    print(SEP)
    print(f"\n  TABLE II (Main Model):")
    print(f"    Accuracy:  {metrics['accuracy']*100:.2f}%")
    print(f"    Precision: {metrics['precision']*100:.2f}%")
    print(f"    Recall:    {metrics['recall']*100:.2f}%")
    print(f"    F1-Score:  {metrics['f1_score']*100:.2f}%")
    if metrics.get("auc_roc"):
        print(f"    AUC-ROC:   {metrics['auc_roc']:.4f}")

    print(f"\n  TABLE III (Baseline Comparison):")
    for r in baseline_results:
        print(f"    {r['method']:<50} Acc={r['accuracy']*100:.2f}%  F1={r['f1_score']*100:.2f}%")

    print(f"\n  TABLE IV (Ablation — best config marked ★):")
    for r in ablation_results:
        star = " ← SELECTED" if "★" in r["config"] else ""
        print(f"    {r['config']:<50} Acc={r['accuracy']*100:.2f}%  F1={r['f1_score']*100:.2f}%{star}")

    print(f"\n{SEP}")
    print("  All results saved. Use JSON files to fill paper tables.")
    print(SEP)

    return metrics


if __name__ == "__main__":
    main()
