import pandas as pd
import os

RAW_DIR = "data_raw"
PROCESSED_DIR = "data_processed"

KAZ_TSV = os.path.join(RAW_DIR, "kaz_sentences.tsv")
RUS_TSV = os.path.join(RAW_DIR, "rus_sentences.tsv")

# ВАЖНО: у тебя файл может называться links.csv или links (если Windows скрыл расширение)
LINKS_CANDIDATES = [
    os.path.join(RAW_DIR, "links.csv"),
    os.path.join(RAW_DIR, "links"),
]

BASE_SENTENCES = os.path.join(PROCESSED_DIR, "sentences.csv")  # твои 3730
OUT_FILE = os.path.join(PROCESSED_DIR, "sentences_kaz_ru.csv")

def find_links_path():
    for p in LINKS_CANDIDATES:
        if os.path.exists(p):
            return p
    raise FileNotFoundError("Не найден links файл в data_raw (ожидался links.csv или links).")

links_path = find_links_path()

# 1) Загружаем base (3730 строк)
base = pd.read_csv(BASE_SENTENCES, encoding="utf-8")
kaz_ids = set(base["id"].astype(int).tolist())

# 2) Загружаем kaz/rus таблицы (для текста по id)
kaz_df = pd.read_csv(KAZ_TSV, sep="\t", header=None, names=["id", "lang", "text"], dtype={"id": int})
rus_df = pd.read_csv(RUS_TSV, sep="\t", header=None, names=["id", "lang", "text"], dtype={"id": int})

kaz_text = dict(zip(kaz_df["id"].tolist(), kaz_df["text"].tolist()))
rus_text = dict(zip(rus_df["id"].tolist(), rus_df["text"].tolist()))

# 3) Загружаем links (пары id1,id2)
# В links.csv у Tatoeba обычно 2 колонки без заголовка
# 3) Загружаем links (пары id1,id2)
# Tatoeba links обычно TAB-separated
try:
    links = pd.read_csv(
        links_path,
        sep="\t",
        header=None,
        names=["id1", "id2"],
        dtype={"id1": "int64", "id2": "int64"},
        engine="python",
    )
except Exception:
    links = pd.read_csv(
        links_path,
        sep=",",
        header=None,
        names=["id1", "id2"],
        dtype={"id1": "int64", "id2": "int64"},
        engine="python",
    )

# 4) Находим для каждого kaz id подходящий rus id
# links двунаправленные, поэтому проверяем оба направления
# правило: если один id в kaz_ids, а другой существует в rus_text -> это перевод
mapping = {}

for a, b in zip(links["id1"].tolist(), links["id2"].tolist()):
    if a in kaz_ids and b in rus_text:
        mapping.setdefault(a, b)
    elif b in kaz_ids and a in rus_text:
        mapping.setdefault(b, a)

# 5) Заполняем ru в base
def get_ru(kaz_id):
    rus_id = mapping.get(int(kaz_id))
    if rus_id is None:
        return ""
    return rus_text.get(rus_id, "")

base["ru"] = base["id"].apply(get_ru)

# 6) Удаляем строки без рус.перевода (оставляем только пары)
paired = base[base["ru"].astype(str).str.len() > 0].copy()

# Ограничим размер для frontend
paired = paired.head(2000)

# 7) Сохраняем
paired.to_csv(OUT_FILE, index=False, encoding="utf-8")

print("Готово:", OUT_FILE)
print("Было (kaz-only):", len(base))
print("Стало (kaz-ru pairs):", len(paired))
print("Без перевода:", len(base) - len(paired))