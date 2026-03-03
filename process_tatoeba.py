import pandas as pd
import re

# ===== Настройки =====
INPUT_FILE = "data_raw/kaz_sentences.tsv"
OUTPUT_FILE = "data_processed/sentences.csv"
MAX_SENTENCES = 5000   # для MVP достаточно 3–5k

# ===== Загрузка =====
df = pd.read_csv(INPUT_FILE, sep="\t", header=None, names=["id", "lang", "text"])

# Оставляем только казахский
df = df[df["lang"] == "kaz"]

# Удаляем строки:
# - слишком короткие (<3 слов)
# - слишком длинные (>20 слов)
# - содержащие латиницу
def is_clean(text):
    words = text.split()
    if len(words) < 3 or len(words) > 20:
        return False
    if re.search(r"[A-Za-z]", text):
        return False
    return True

df = df[df["text"].apply(is_clean)]

# Берём первые N предложений
df = df.head(MAX_SENTENCES)

# Добавляем поля для будущей структуры
df["ru"] = ""
df["source"] = "tatoeba"
df["difficulty"] = 1
df["topic"] = ""
df["tags"] = ""

# Переставляем колонки
df = df[["id", "text", "ru", "source", "difficulty", "topic", "tags"]]
df.columns = ["id", "kaz", "ru", "source", "difficulty", "topic", "tags"]

# Сохраняем
df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")

print("Готово. Создан файл:", OUTPUT_FILE)
print("Количество предложений:", len(df))