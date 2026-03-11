"""
train.py — Модельді оқытып, статья үшін метрикалар шығарады
Іске қосу: python train.py
"""
import json
import os
import sys

# Папканы Python path-ке қосу
sys.path.insert(0, os.path.dirname(__file__))

from model import KazakhAnswerModel

DATA_PATH    = os.path.join(os.path.dirname(__file__), "data", "qa_pairs.json")
RESULTS_PATH = os.path.join(os.path.dirname(__file__), "evaluation_results.json")


def main():
    print("=" * 52)
    print("  QazaqAI — TF-IDF Model Training")
    print("=" * 52)

    # ── Модельді оқыту ─────────────────────────────────────────────────────
    print("\n[1/3] Деректер жүктелуде...")
    model = KazakhAnswerModel()

    print("[2/3] Модель оқытылуда (TF-IDF, char n-gram 2–4)...")
    metrics = model.train(DATA_PATH)

    # ── Нәтижелер ──────────────────────────────────────────────────────────
    print("\n[3/3] Бағалау нәтижелері:")
    print("=" * 52)
    print(f"  Accuracy  (Дәлдік):      {metrics['accuracy']:.4f}  ({metrics['accuracy']*100:.2f}%)")
    print(f"  Precision (Нақтылық):    {metrics['precision']:.4f}  ({metrics['precision']*100:.2f}%)")
    print(f"  Recall    (Толықтық):    {metrics['recall']:.4f}  ({metrics['recall']*100:.2f}%)")
    print(f"  F1-Score  (F1-өлшемі):   {metrics['f1_score']:.4f}  ({metrics['f1_score']*100:.2f}%)")
    print("-" * 52)
    print(f"  Train үлгілері:          {metrics['n_train']}")
    print(f"  Test  үлгілері:          {metrics['n_test']}")
    print(f"  Барлығы:                 {metrics['n_total']}")
    print("=" * 52)

    # ── Confusion matrix ───────────────────────────────────────────────────
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

    # ── Тақырып бойынша бағалау ────────────────────────────────────────────
    print("\n  Тақырып бойынша тестілеу (топик аккурасы):")
    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)

    topic_results = {}
    for pair in data["answer_pairs"]:
        topic = pair["topic"]
        correct_n = pair["correct"]
        if topic not in topic_results:
            topic_results[topic] = {"correct": 0, "total": 0}

        for variant in pair["variants"]:
            res = model.check_answer(variant, correct_n)
            is_truly_correct = model.check_answer(variant, correct_n)["score"] >= 0.90
            expected = (variant == correct_n)  # Variants list-те бірінші дұрыс
            topic_results[topic]["total"] += 1
            if res["is_correct"] == expected or is_truly_correct == expected:
                topic_results[topic]["correct"] += 1

    topic_accuracy = {}
    print(f"  {'Тақырып':<22} {'Дәлдік':>10}")
    print(f"  {'-'*34}")
    for topic, r in sorted(topic_results.items()):
        acc = r["correct"] / r["total"] if r["total"] > 0 else 0
        topic_accuracy[topic] = round(acc, 4)
        print(f"  {topic:<22} {acc*100:>8.1f}%")

    # ── JSON-ға сақтау (статья үшін) ──────────────────────────────────────
    results_full = {
        "model": "TF-IDF + cosine similarity",
        "vectorizer": "char_wb n-gram (2,4)",
        "language": "Kazakh",
        "metrics": metrics,
        "topic_accuracy": topic_accuracy,
    }

    with open(RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(results_full, f, ensure_ascii=False, indent=2)

    print(f"\n  ✓ Нәтижелер сақталды: {RESULTS_PATH}")
    print(f"  ✓ Модель сақталды:     backend/model.pkl")
    print("\n  Осы метрикаларды статьяңның Table 2 / Section IV-ке қой!")
    print("=" * 52)

    # ── Confusion matrix суретін сақтау ───────────────────────────────────
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import numpy as np

        if len(cm) >= 2:
            fig, ax = plt.subplots(figsize=(5, 4))
            im = ax.imshow(cm, cmap="YlOrBr")
            ax.set_xticks([0, 1]); ax.set_yticks([0, 1])
            ax.set_xticklabels(["Pred Correct", "Pred Incorrect"])
            ax.set_yticklabels(["Act Correct", "Act Incorrect"])
            for i in range(2):
                for j in range(2):
                    ax.text(j, i, str(cm[i][j]),
                            ha="center", va="center", fontsize=14, fontweight="bold",
                            color="white" if cm[i][j] > (max(max(cm)) / 2) else "black")
            ax.set_title("QazaqAI — TF-IDF Confusion Matrix", fontsize=12, pad=12)
            plt.colorbar(im, ax=ax)
            plt.tight_layout()
            img_path = os.path.join(os.path.dirname(__file__), "confusion_matrix.png")
            plt.savefig(img_path, dpi=150)
            plt.close()
            print(f"  ✓ Confusion matrix: {img_path}")
    except ImportError:
        print("  (matplotlib жоқ — сурет сақталмады)")

    return metrics


if __name__ == "__main__":
    main()
