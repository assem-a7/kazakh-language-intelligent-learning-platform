import pandas as pd
import re
from collections import Counter

SENT_FILE = "frontend/public/data/sentences.csv"
SEED_FILE = "data_processed/seed_words.csv"
OUT_FILE = "frontend/public/data/words.csv"

TARGET_TOTAL = 400          # итоговое число слов
AUTO_ADD_MAX = 400          # максимум автодобора (остальное seed)
MIN_LEN = 3

TOKEN_RE = re.compile(r"[а-яёәіңғүұқөһ\-]+", re.IGNORECASE)

STOP = {
    "мен","сен","сіз","ол","біз","сендер","сіздер","олар",
    "менің","сенің","сіздің","оның","біздің","олардың",
    "бұл","сол","осы","мына","анау",
    "және","да","де","та","те","бірақ","немесе","ал",
    "емес","ғана","тағы","өте","ең","көп","аз",
    "керек","болса","болып","еді","екен","сияқты","деп",
    "үшін","туралы","бойынша","кейін","дейін","арқылы",
    "пен","мен","бен",
    "бір","екі","үш","төрт","бес",
}

BLACKLIST = {
    "отыр","тұр","жатыр","бол","болды","болады","жүр","кел","кетті",
    "ресей","оңтүстік","солтүстік","батыс","шығыс",
}

def normalize(w: str) -> str:
    return w.strip().lower().strip("-")

def is_ok(w: str) -> bool:
    if not w or len(w) < MIN_LEN:
        return False
    if w in STOP or w in BLACKLIST:
        return False
    # отбрасываем явно грамматические хвосты (очень грубо)
    if w.endswith(("ның","нің","дың","дің","тың","тің","мен","пен","бен")):
        return False
    if w.endswith(("ға","ге","қа","ке","да","де","та","те","дан","ден","тан","тен")):
        return False
    if w.endswith(("ды","ді","ты","ті","ған","ген","қан","кен","атын","етін","йтын","йтін")):
        return False
    return True

def diff_from_rank(rank: int) -> int:
    if rank <= 120:
        return 1
    if rank <= 260:
        return 2
    return 3

# 1) seed
seed = pd.read_csv(SEED_FILE, encoding="utf-8")
seed["kaz"] = seed["kaz"].astype(str).apply(normalize)

seed_kaz_set = set(seed["kaz"].tolist())

# 2) auto from sentences
sent = pd.read_csv(SENT_FILE, encoding="utf-8")
texts = sent["kaz"].dropna().astype(str).tolist()

tokens = []
for s in texts:
    for t in TOKEN_RE.findall(s):
        w = normalize(t)
        if is_ok(w) and w not in seed_kaz_set:
            tokens.append(w)

freq = Counter(tokens)
auto_candidates = [w for w, _ in freq.most_common(AUTO_ADD_MAX)]

# 3) build final
rows = []
# seed first (keep their ids if present, but we'll reassign sequentially)
for _, r in seed.iterrows():
    rows.append({
        "kaz": r.get("kaz",""),
        "ru": r.get("ru",""),
        "category_id": r.get("category_id",""),
        "difficulty": r.get("difficulty",1),
        "image_url": r.get("image_url",""),
    })

# add auto until target
for w in auto_candidates:
    if len(rows) >= TARGET_TOTAL:
        break
    rows.append({
        "kaz": w,
        "ru": "",
        "category_id": "",
        "difficulty": diff_from_rank(len(rows)+1),
        "image_url": "",
    })

# assign ids
out = pd.DataFrame(rows, columns=["kaz","ru","category_id","difficulty","image_url"])
out.insert(0, "id", range(1, len(out)+1))

out.to_csv(OUT_FILE, index=False, encoding="utf-8")
print("Готово:", OUT_FILE)
print("Слов:", len(out))
print("Seed:", len(seed), "Auto:", max(0, len(out)-len(seed)))