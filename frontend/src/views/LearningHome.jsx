// UI-only changes; logic unchanged
import { useState, useEffect } from "react";
import { Image, BookOpen, PenLine, ClipboardCheck, TrendingUp, ChevronRight, Settings, Loader2, MessageCircle } from "lucide-react";
import AppHeader from "../components/AppHeader";
import { loadCsv } from "../utils/csvLoader";

const MODULES = [
  { id: "dictionary", icon: Image,          accent: "#c8880a", title: "Словарь",    desc: "Слова и фразы по выбранным темам",      badge: "Начать здесь" },
  { id: "grammar",    icon: BookOpen,        accent: "#b06820", title: "Грамматика", desc: "Правила, конструкции, примеры",         badge: null },
  { id: "exercises",  icon: PenLine,         accent: "#1fa89a", title: "Упражнения", desc: "Практика: перевод, пропуски, выбор",    badge: null },
  { id: "tests",      icon: ClipboardCheck,  accent: "#b84020", title: "Тесты",      desc: "Контрольные срезы по материалу",        badge: null },
  { id: "progress",   icon: TrendingUp,      accent: "#a84020", title: "Прогресс",   desc: "Статистика: точность, серия, динамика", badge: null },
  { id: "ai_tutor",   icon: MessageCircle,   accent: "#1fa89a", title: "AI Тьютор",  desc: "Грамматика бойынша сұрақ қой — AI жауап береді", badge: "Жаңа" },
];

function hexRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

const PAGE_W   = 640;
const PAGE_PAD = "2rem 1.5rem 3.5rem";

export default function LearningHome({ onNavigate, onExit, categories = [] }) {
  const [catMap, setCatMap]         = useState({});
  const [catsLoading, setCatsLoading] = useState(true);

  useEffect(() => {
    loadCsv("/data/categories.csv")
      .then(rows => {
        const map = {};
        rows.forEach(r => { map[r.slug] = r.name_ru; });
        setCatMap(map);
        setCatsLoading(false);
      })
      .catch(() => setCatsLoading(false));
  }, []);

  const catLabels = categories.map(slug => catMap[slug] || slug);

  return (
    <div style={{ minHeight: "100dvh", background: "#faf7f2", display: "flex", flexDirection: "column" }}>
      <style>{`
        /* ── Module card ─────────────────────────────────────────── */
        .lhmc {
          cursor: pointer;
          background: #ffffff;
          border: 1px solid rgba(180,130,40,.16);
          border-radius: 13px;
          padding: 1rem 1.15rem;
          display: flex; align-items: center; gap: .95rem;
          position: relative; overflow: hidden;
          box-shadow: 0 1px 6px rgba(120,80,20,.06);
          transition: border-color .22s, box-shadow .22s, transform .2s cubic-bezier(0.22,1,0.36,1);
        }
        .lhmc:hover {
          border-color: rgba(180,130,40,.35);
          box-shadow: 0 6px 24px rgba(120,80,20,.12);
          transform: translateY(-2px);
        }
        .lhmc:active { transform: translateY(0); box-shadow: 0 1px 6px rgba(120,80,20,.06); }
        .lhmc:focus-visible { outline: 2px solid rgba(200,136,10,.5); outline-offset: 2px; }

        /* ── Category pill ───────────────────────────────────────── */
        .lhpill {
          display: inline-flex; align-items: center; gap: .3rem;
          background: rgba(200,136,10,.09); border: 1px solid rgba(200,136,10,.22);
          border-radius: 99px; padding: .24rem .65rem;
          font-size: .72rem; font-weight: 600; color: #a86810; white-space: nowrap;
        }

        /* ── Edit button ─────────────────────────────────────────── */
        .lhedit {
          display: inline-flex; align-items: center; gap: .3rem;
          font-size: .75rem; font-weight: 600; color: #8a6030;
          border: 1px solid rgba(180,130,40,.24); border-radius: 99px;
          padding: .32rem .75rem; min-height: 32px;
          background: rgba(200,136,10,.06);
          transition: color .2s, border-color .2s, background .2s;
        }
        .lhedit:hover {
          color: #5a3a10;
          border-color: rgba(180,130,40,.45);
          background: rgba(200,136,10,.12);
        }
        .lhedit:focus-visible { outline: 2px solid rgba(200,136,10,.5); outline-offset: 2px; }

        /* ── Section label ───────────────────────────────────────── */
        .lhslabel {
          font-size: .67rem; font-weight: 700; color: #a08060;
          letter-spacing: .13em; text-transform: uppercase;
          display: flex; align-items: center; gap: .75rem;
        }
        .lhslabel::after { content: ''; flex: 1; height: 1px; background: rgba(180,130,40,.16); }

        @keyframes lhspin { to { transform: rotate(360deg); } }
        .lhspin { animation: lhspin .85s linear infinite; }
      `}</style>

      <AppHeader title="Главная" onExit={onExit} showBack={false} />

      <div style={{ flex: 1, overflowY: "auto", padding: PAGE_PAD }}>
        <div style={{ maxWidth: PAGE_W, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.75rem" }}>

          {/* ── Active topics strip ─────────────────────────────── */}
          <div style={{
            background: "#fff",
            border: "1px solid rgba(180,130,40,.18)",
            borderRadius: 13,
            padding: "1rem 1.15rem",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            gap: "1rem", flexWrap: "wrap",
            boxShadow: "0 1px 6px rgba(120,80,20,.06)",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".67rem", fontWeight: 700, color: "#a08060", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: ".55rem" }}>
                Активные темы
              </div>
              {catsLoading ? (
                <Loader2 size={14} className="lhspin" style={{ color: "#c8880a" }} />
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem" }}>
                  {catLabels.length > 0 ? catLabels.map(l => (
                    <span key={l} className="lhpill">
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#c8880a", flexShrink: 0 }} />
                      {l}
                    </span>
                  )) : (
                    <span style={{ fontSize: ".82rem", color: "#b09070", fontStyle: "italic" }}>не выбраны</span>
                  )}
                </div>
              )}
            </div>
            <button className="lhedit" onClick={() => onNavigate("onboarding")}>
              <Settings size={11} /> Изменить
            </button>
          </div>

          {/* ── Module list ─────────────────────────────────────── */}
          <div>
            <div className="lhslabel" style={{ marginBottom: "1rem" }}>
              Модули обучения
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: ".55rem" }}>
              {MODULES.map((mod) => {
                const { id, icon: Icon, accent, title, desc, badge } = mod;
                const rgb = hexRgb(accent);
                return (
                  <div
                    key={id}
                    className="lhmc"
                    onClick={() => onNavigate(id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && onNavigate(id)}
                  >
                    {/* top accent hairline */}
                    <div style={{ position: "absolute", top: 0, left: "1.15rem", width: 32, height: 2, background: `linear-gradient(90deg,${accent},transparent)`, borderRadius: "0 0 2px 2px" }} />

                    {/* Icon square */}
                    <div style={{
                      width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                      background: `rgba(${rgb},.1)`,
                      border: `1px solid rgba(${rgb},.22)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={18} style={{ color: accent }} />
                    </div>

                    {/* Text block */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: ".4rem", marginBottom: ".2rem" }}>
                        <span style={{ fontWeight: 700, fontSize: ".9rem", color: "#2c2010", letterSpacing: "-.01em", lineHeight: 1.3 }}>
                          {title}
                        </span>
                        {badge && (
                          <span style={{
                            fontSize: ".6rem", fontWeight: 700, letterSpacing: ".06em",
                            color: accent,
                            background: `rgba(${rgb},.1)`,
                            border: `1px solid rgba(${rgb},.24)`,
                            borderRadius: 99, padding: ".12rem .44rem",
                            flexShrink: 0,
                          }}>
                            {badge}
                          </span>
                        )}
                      </div>
                      <p style={{ color: "#8a6030", fontSize: ".8rem", lineHeight: 1.5, margin: 0 }}>
                        {desc}
                      </p>
                    </div>

                    {/* Chevron */}
                    <ChevronRight size={16} style={{ color: "rgba(180,130,40,.35)", flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
