import pandas as pd
import re

IN_FILE = "frontend/public/data/sentences.csv"
OUT_FILE = "frontend/public/data/sentences.csv"  # перезапишем файл

# categories.csv id:
# 1 basics, 2 family, 3 study, 4 work, 5 travel, 6 food, 7 shopping, 8 health, 9 daily

RULES = {
    1: ["сәлем","рақмет","өтінемін","кешір","иә","жоқ","қалайсыз","атыңыз"],
    2: ["әке","ана","аға","іні","әпке","қарындас","әже","ата","отбасы","бала","қыз","ұл"],
    3: ["мектеп","университет","сабақ","дәптер","қалам","кітап","емтихан","студент","мұғалім"],
    4: ["жұмыс","кеңсе","құжат","жоба","кездесу","әріптес","басшы","хат"],
    5: ["әуежай","ұшақ","қонақ үй","вокзал","пойыз","автобус","такси","билет","жол","карта"],
    6: ["су","шай","кофе","нан","сүт","ет","көкөніс","жеміс","дәмді","ас","тамақ"],
    7: ["дүкен","баға","ақша","өлшем","киім","аяқ киім","сөмке","қымбат","арзан","жеңілдік"],
    8: ["дәрігер","ауру","дәрі","дәріхана","аурухана","жөтел","температура","бас ауыру"],
    9: ["телефон","компьютер","дос","қала","ауа райы","бүгін","ертең","кеше","ұйқы","демалу"],
}

def norm(s: str) -> str:
    s = str(s).lower()
    s = re.sub(r"\s+", " ", s).strip()
    return s

def detect_category(kaz: str) -> int | None:
    t = norm(kaz)
    for cid, keys in RULES.items():
        for k in keys:
            if k in t:
                return cid
    return None

df = pd.read_csv(IN_FILE, encoding="utf-8")

# добавим колонку, если нет
if "category_id" not in df.columns:
    df["category_id"] = ""
    df["category_id"] = df["category_id"].astype("string")

# заполним category_id только если пусто
filled = 0
for i, row in df.iterrows():
    if str(row.get("category_id","")).strip():
        continue
    cid = detect_category(row.get("kaz",""))
    if cid is not None:
        df.at[i, "category_id"] = str(cid)
        filled += 1

df.to_csv(OUT_FILE, index=False, encoding="utf-8")
print("Готово:", OUT_FILE)
print("Заполнено category_id:", filled, "из", len(df))
print("Всего с category_id:", (df["category_id"].astype(str).str.strip() != "").sum(), "из", len(df))