// UI-only changes; logic unchanged
import { useState, useEffect, useMemo } from "react";
import { Loader2, AlertCircle, ChevronDown, FileQuestion, BookOpen, AlignLeft } from "lucide-react";
import AppHeader from "../components/AppHeader";
import { loadCsv } from "../utils/csvLoader";

const PAGE_SIZE  = 20;
const LS_CAT_KEY = "qazaqai_active_category";

const DIFF_COLOR = { "1": "#c8880a", "2": "#1fa89a", "3": "#b84020" };
const DIFF_LABEL = { "1": "Базовый",  "2": "Средний", "3": "Сложный" };

function hexRgb(hex) {
  const h = (hex || "#888888").replace("#", "");
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`;
}

function DiffBadge({ level }) {
  const color = DIFF_COLOR[level];
  if (!color) return null;
  return (
    <span style={{
      fontSize: ".62rem", fontWeight: 700, color,
      background: `rgba(${hexRgb(color)},.1)`,
      border: `1px solid rgba(${hexRgb(color)},.24)`,
      borderRadius: 99, padding: ".13rem .5rem", letterSpacing: ".04em",
      whiteSpace: "nowrap",
    }}>
      {DIFF_LABEL[level]}
    </span>
  );
}

// ── TAB BAR ───────────────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  const tabs = [
    { id: "words",     label: "Слова" },
    { id: "sentences", label: "Предложения" },
  ];
  return (
    <div style={{
      display: "flex", gap: ".3rem",
      background: "rgba(180,130,40,.08)",
      border: "1px solid rgba(180,130,40,.16)",
      borderRadius: 11, padding: ".28rem",
      marginBottom: "1.5rem",
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            flex: 1, padding: ".48rem .75rem",
            borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: ".8125rem", fontWeight: 600,
            transition: "background .2s, color .2s, box-shadow .2s",
            background: active === t.id ? "#fff" : "transparent",
            color:      active === t.id ? "#c8880a" : "#8a6030",
            boxShadow:  active === t.id ? "0 1px 6px rgba(120,80,20,.1)" : "none",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
function CsvEmptyState({ filename, columns }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1rem" }}>
      <div style={{ maxWidth: 400, textAlign: "center" }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, margin: "0 auto 1.25rem",
          background: "rgba(200,136,10,.08)", border: "1px solid rgba(200,136,10,.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <FileQuestion size={26} style={{ color: "#c8880a", opacity: .85 }} />
        </div>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#2c2010", marginBottom: ".5rem" }}>
          {filename} не найден
        </h3>
        <p style={{ color: "#7a5a30", fontSize: ".85rem", lineHeight: 1.75, marginBottom: "1.25rem" }}>
          Добавьте файл в папку проекта, чтобы включить этот раздел.
        </p>
        <div style={{
          background: "#fff", border: "1px solid rgba(180,130,40,.18)",
          borderRadius: 12, padding: "1rem 1.1rem", textAlign: "left",
          boxShadow: "0 2px 10px rgba(120,80,20,.07)",
        }}>
          <div style={{ fontSize: ".68rem", fontWeight: 700, color: "#a08060", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: ".5rem" }}>
            Путь
          </div>
          <code style={{ fontSize: ".8rem", color: "#b84020", fontFamily: "monospace" }}>
            frontend/public/data/{filename}
          </code>
          <div style={{ marginTop: ".85rem", fontSize: ".72rem", color: "#8a6030", lineHeight: 1.65 }}>
            Ожидаемые колонки:<br />
            <code style={{ color: "#6b5030", fontSize: ".7rem" }}>
              {columns}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── WORD CARD ─────────────────────────────────────────────────────────────────
function WordCard({ word, index }) {
  const [imgError, setImgError] = useState(false);
  const hasImage = word.image_url && word.image_url.trim() !== "" && !imgError;

  return (
    <div
      className="word-card card-enter"
      style={{ animationDelay: `${Math.min(index % PAGE_SIZE, 12) * 30}ms` }}
    >
      {/* Image */}
      <div style={{
        width: "100%", aspectRatio: "1 / 1",
        borderRadius: 10, overflow: "hidden", marginBottom: ".75rem",
        background: "rgba(180,130,40,.06)",
        border: "1px solid rgba(180,130,40,.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        {hasImage ? (
          <img
            src={word.image_url}
            alt={word.kaz}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(135deg, rgba(200,136,10,.07) 0%, rgba(31,168,154,.07) 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <BookOpen size={26} style={{ color: "rgba(180,130,40,.3)" }} />
          </div>
        )}
        {word.difficulty && (
          <div style={{ position: "absolute", top: 7, right: 7 }}>
            <DiffBadge level={word.difficulty} />
          </div>
        )}
      </div>

      {/* Text */}
      <div style={{ padding: "0 .1rem" }}>
        <p style={{ fontSize: "1.05rem", fontWeight: 800, color: "#2c2010", marginBottom: ".22rem", lineHeight: 1.25, letterSpacing: "-.01em" }}>
          {word.kaz}
        </p>
        <p style={{ fontSize: ".8rem", color: "#8a6030", fontStyle: "italic", lineHeight: 1.4 }}>
          {word.ru}
        </p>
        {word.transcription && word.transcription.trim() && (
          <p style={{ fontSize: ".7rem", color: "#b09070", marginTop: ".25rem", fontFamily: "monospace", letterSpacing: ".03em" }}>
            [{word.transcription}]
          </p>
        )}
        {word.part_of_speech && word.part_of_speech.trim() && (
          <span style={{
            display: "inline-block", marginTop: ".4rem",
            fontSize: ".62rem", fontWeight: 700,
            color: "#a08060", letterSpacing: ".07em", textTransform: "uppercase",
          }}>
            {word.part_of_speech}
          </span>
        )}
      </div>
    </div>
  );
}

// ── WORDS TAB ─────────────────────────────────────────────────────────────────
function WordsTab() {
  const [allWords, setAllWords]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [is404, setIs404]               = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore]   = useState(false);

  const [activeCat] = useState(() => {
    try { return localStorage.getItem(LS_CAT_KEY) || ""; } catch { return ""; }
  });

  useEffect(() => {
    loadCsv("/data/words.csv")
      .then(rows => { setAllWords(rows); setLoading(false); })
      .catch(err  => {
        setIs404(err.message.includes("404") || err.message.includes("Failed to load"));
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!activeCat) return allWords;
    return allWords.filter(w => !w.category_id || w.category_id === activeCat);
  }, [allWords, activeCat]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleShowMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(v => Math.min(v + PAGE_SIZE, filtered.length));
      setLoadingMore(false);
    }, 180);
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "4rem 0", color: "#a08060" }}>
      <Loader2 size={26} className="spin" style={{ color: "#c8880a" }} />
      <span style={{ fontSize: ".875rem" }}>Загрузка слов…</span>
    </div>
  );

  if (error && is404) return (
    <CsvEmptyState
      filename="words.csv"
      columns="id, kaz, ru, transcription, part_of_speech, category_id, difficulty, image_url, example_sentence_id"
    />
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: ".75rem", background: "rgba(184,64,32,.06)", border: "1px solid rgba(184,64,32,.22)", borderRadius: 13, padding: "1.25rem" }}>
      <AlertCircle size={18} style={{ color: "#b84020", flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontWeight: 700, color: "#b84020", fontSize: ".875rem", marginBottom: ".3rem" }}>Ошибка загрузки words.csv</div>
        <div style={{ fontSize: ".8rem", color: "#6b5030" }}>{error}</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Info bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.1rem", flexWrap: "wrap", gap: ".5rem" }}>
        <span style={{ fontSize: ".72rem", color: "#a08060", fontWeight: 600 }}>
          {activeCat ? `Категория: ${activeCat} · ` : ""}
          Показано {Math.min(visibleCount, filtered.length)} из {filtered.length} слов
        </span>
        <div style={{ display: "flex", gap: ".6rem" }}>
          {Object.entries(DIFF_COLOR).map(([d, color]) => (
            <span key={d} style={{ display: "flex", alignItems: "center", gap: ".3rem", fontSize: ".68rem", color: "#8a6030" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
              {DIFF_LABEL[d]}
            </span>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: ".75rem" }}>
        {visible.map((word, i) => (
          <WordCard key={word.id || i} word={word} index={i} />
        ))}
      </div>

      {/* Show more */}
      {hasMore && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "1.75rem" }}>
          <button className="show-more-btn" disabled={loadingMore} onClick={handleShowMore}>
            {loadingMore
              ? <><Loader2 size={14} className="spin" /> Загрузка…</>
              : <><ChevronDown size={14} /> Показать ещё {Math.min(PAGE_SIZE, filtered.length - visibleCount)}</>
            }
          </button>
        </div>
      )}

      {!hasMore && filtered.length > 0 && (
        <div style={{ textAlign: "center", marginTop: "1.75rem", fontSize: ".72rem", color: "#b09070" }}>
          Все {filtered.length} слов загружены
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "#a08060", fontSize: ".875rem" }}>
          Нет слов для этой категории
        </div>
      )}
    </>
  );
}

// ── SENTENCES TAB ─────────────────────────────────────────────────────────────
function SentencesTab() {
  const [allSentences, setAllSentences] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore]   = useState(false);

  useEffect(() => {
    loadCsv("/data/sentences.csv")
      .then(rows => { setAllSentences(rows); setLoading(false); })
      .catch(err  => { setError(err.message); setLoading(false); });
  }, []);

  const visible = allSentences.slice(0, visibleCount);
  const hasMore = visibleCount < allSentences.length;

  const handleShowMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(v => Math.min(v + PAGE_SIZE, allSentences.length));
      setLoadingMore(false);
    }, 180);
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "4rem 0", color: "#a08060" }}>
      <Loader2 size={26} className="spin" style={{ color: "#c8880a" }} />
      <span style={{ fontSize: ".875rem" }}>Загрузка предложений…</span>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: ".75rem", background: "rgba(184,64,32,.06)", border: "1px solid rgba(184,64,32,.22)", borderRadius: 13, padding: "1.25rem" }}>
      <AlertCircle size={18} style={{ color: "#b84020", flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontWeight: 700, color: "#b84020", fontSize: ".875rem", marginBottom: ".3rem" }}>Ошибка загрузки sentences.csv</div>
        <div style={{ fontSize: ".8rem", color: "#6b5030" }}>{error}</div>
      </div>
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.1rem", flexWrap: "wrap", gap: ".5rem" }}>
        <span style={{ fontSize: ".72rem", color: "#a08060", fontWeight: 600 }}>
          Показано {Math.min(visibleCount, allSentences.length)} из {allSentences.length}
        </span>
        <div style={{ display: "flex", gap: ".6rem" }}>
          {Object.entries(DIFF_COLOR).map(([d, color]) => (
            <span key={d} style={{ display: "flex", alignItems: "center", gap: ".3rem", fontSize: ".68rem", color: "#8a6030" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
              {DIFF_LABEL[d]}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: ".85rem" }}>
        {visible.map((row, i) => {
          const diffColor = DIFF_COLOR[row.difficulty] || "#b09070";
          const diffRgb   = hexRgb(diffColor);
          return (
            <div
              key={row.id || i}
              className="dict-card card-enter"
              style={{ animationDelay: `${Math.min(i % PAGE_SIZE, 10) * 35}ms` }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".65rem" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: diffColor, display: "inline-block" }} />
                {row.topic && row.topic !== "" && (
                  <span style={{ fontSize: ".65rem", fontWeight: 600, color: "#8a6030", background: "rgba(180,130,40,.08)", border: "1px solid rgba(180,130,40,.18)", borderRadius: 99, padding: ".15rem .5rem" }}>
                    {row.topic}
                  </span>
                )}
              </div>
              <p style={{ fontSize: "1.05rem", fontWeight: 800, color: "#2c2010", lineHeight: 1.4, marginBottom: ".5rem", letterSpacing: "-.01em" }}>
                {row.kaz}
              </p>
              <p style={{ fontSize: ".85rem", color: "#7a5a30", lineHeight: 1.55, fontStyle: "italic" }}>
                {row.ru}
              </p>
              {row.source && row.source !== "" && (
                <div style={{ marginTop: ".75rem" }}>
                  <span style={{ fontSize: ".65rem", color: "#b09070", letterSpacing: ".06em", textTransform: "uppercase" }}>
                    {row.source}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
          <button className="show-more-btn" disabled={loadingMore} onClick={handleShowMore}>
            {loadingMore
              ? <><Loader2 size={14} className="spin" /> Загрузка…</>
              : <><ChevronDown size={14} /> Показать ещё {Math.min(PAGE_SIZE, allSentences.length - visibleCount)}</>
            }
          </button>
        </div>
      )}

      {!hasMore && allSentences.length > 0 && (
        <div style={{ textAlign: "center", marginTop: "2rem", fontSize: ".72rem", color: "#b09070" }}>
          Все {allSentences.length} предложений загружены
        </div>
      )}
    </>
  );
}

// ── MAIN VIEW ─────────────────────────────────────────────────────────────────
export default function DictionaryView({ onBack, onExit }) {
  const [tab, setTab] = useState("words");

  return (
    <div style={{ minHeight: "100dvh", background: "#faf7f2", display: "flex", flexDirection: "column" }}>
      <style>{`
        .word-card {
          background: #fff;
          border: 1px solid rgba(180,130,40,.16);
          border-radius: 13px; padding: .9rem;
          box-shadow: 0 1px 5px rgba(120,80,20,.06);
          transition: border-color .22s, box-shadow .22s, transform .2s;
        }
        .word-card:hover {
          border-color: rgba(200,136,10,.35);
          box-shadow: 0 5px 20px rgba(120,80,20,.12);
          transform: translateY(-2px);
        }
        .dict-card {
          background: #fff;
          border: 1px solid rgba(180,130,40,.16);
          border-radius: 13px; padding: 1.15rem 1.25rem;
          box-shadow: 0 1px 5px rgba(120,80,20,.06);
          transition: border-color .22s, box-shadow .22s, transform .2s;
          position: relative; overflow: hidden;
        }
        .dict-card::before {
          content: ''; position: absolute; top: 0; left: 1.25rem; right: 60%;
          height: 2px; background: linear-gradient(90deg,rgba(200,136,10,.35),transparent);
        }
        .dict-card:hover {
          border-color: rgba(200,136,10,.35);
          box-shadow: 0 5px 20px rgba(120,80,20,.12);
          transform: translateY(-2px);
        }
        .show-more-btn {
          display: inline-flex; align-items: center; gap: .5rem;
          border: 1px solid rgba(180,130,40,.24); border-radius: 99px;
          padding: .6rem 1.5rem; font-size: .875rem; font-weight: 600;
          color: #7a5a30; background: #fff;
          box-shadow: 0 1px 5px rgba(120,80,20,.07);
          cursor: pointer;
          transition: border-color .2s, color .2s, box-shadow .2s, transform .2s;
        }
        .show-more-btn:hover:not(:disabled) {
          border-color: rgba(200,136,10,.45); color: #4a2e08;
          box-shadow: 0 4px 14px rgba(120,80,20,.12); transform: translateY(-1px);
        }
        .show-more-btn:disabled { opacity: .4; cursor: not-allowed; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin .9s linear infinite; }
        @keyframes cardFadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .card-enter { animation: cardFadeIn .3s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <AppHeader title="Словарь" onBack={onBack} onExit={onExit} />

      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 1.25rem 3rem" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <TabBar active={tab} onChange={setTab} />
          {tab === "words"     && <WordsTab />}
          {tab === "sentences" && <SentencesTab />}
        </div>
      </div>
    </div>
  );
}
