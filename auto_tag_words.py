import pandas as pd

IN_FILE = "frontend/public/data/words.csv"
OUT_FILE = "frontend/public/data/words.csv"  # перезапишем тот же файл

# category_id из categories.csv:
# 1 basics, 2 family, 3 study, 4 work, 5 travel, 6 food, 7 shopping, 8 health, 9 daily

RULES = {
    1: {"сәлем","рақмет","өтінемін","кешіріңіз","иә","жоқ","аты","қалайсыз"},
    2: {"әке","ана","аға","іні","әпке","қарындас","әже","ата","отбасы","бала","қыз","ұл"},
    3: {"мектеп","университет","сабақ","үй","тапсырма","дәптер","қалам","кітап","емтихан","студент","мұғалім"},
    4: {"жұмыс","кеңсе","кездесу","құжат","жоба","хат","басшы","әріптес"},
    5: {"ұшақ","әуежай","қонақ","үй","вокзал","пойыз","автобус","такси","жол","билет","қала","карта"},
    6: {"су","шай","кофе","нан","сүт","ет","көкөніс","жеміс","дәмді","аш"},
    7: {"дүкен","баға","ақша","жеңілдік","өлшем","киім","аяқ","киім","сөмке","қымбат","арзан"},
    8: {"дәрігер","ауру","дәрі","дәріхана","аурухана","бас","ауыру","жөтел","температура"},
    9: {"телефон","компьютер","дос","қала","ауа","райы","бүгін","ертең","кеше","ұйқы","демалу"},
}

def pick_category(kaz: str):
    w = str(kaz).strip().lower()
    # точное совпадение по словарям
    for cid, vocab in RULES.items():
        if w in vocab:
            return cid
    return ""

df = pd.read_csv(IN_FILE, encoding="utf-8")
if "category_id" not in df.columns:
    df["category_id"] = ""

df["category_id"] = df["category_id"].apply(lambda x: x if str(x).strip() else "")
df["category_id"] = df.apply(lambda r: r["category_id"] if r["category_id"] != "" else pick_category(r["kaz"]), axis=1)

df.to_csv(OUT_FILE, index=False, encoding="utf-8")
print("Готово:", OUT_FILE)
print("Размечено category_id:", (df["category_id"].astype(str).str.strip() != "").sum(), "из", len(df))