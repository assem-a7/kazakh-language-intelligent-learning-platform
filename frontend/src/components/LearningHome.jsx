import { Image, BookOpen, PenLine, ClipboardCheck, TrendingUp, ChevronRight, Settings } from "lucide-react";
import AppHeader from "../components/AppHeader";

const MODULES = [
  { id: "dictionary", icon: Image,          accent: "#22d3ee", title: "Словарь",     desc: "Слова с изображениями по твоим категориям", badge: "Старт здесь" },
  { id: "grammar",    icon: BookOpen,        accent: "#818cf8", title: "Грамматика",  desc: "Правила, конструкции, примеры предложений", badge: null },
  { id: "exercises",  icon: PenLine,         accent: "#a3e635", title: "Упражнения",  desc: "Практические задания для закрепления",      badge: null },
  { id: "tests",      icon: ClipboardCheck,  accent: "#f472b6", title: "Тесты",       desc: "Срезы по словарю и грамматике",             badge: null },
  { id: "progress",   icon: TrendingUp,      accent: "#34d399", title: "Прогресс",    desc: "Дашборд: динамика, ошибки, повторения",     badge: null },
];

const CAT_LABELS = {
  travel:"Путешествия", work:"Работа", family:"Семья и быт",
  culture:"Культура", nature:"Природа", food:"Еда и кухня",
  tech:"Технологии", health:"Здоровье", study:"Учёба",
};

function hexRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

export default function LearningHome({ onNavigate, onExit, categories = [] }) {
  const catLabels = categories.map(c => CAT_LABELS[c] || c);

  return (
    <div style={{ minHeight: "100dvh", background: "#0a0a0f", display: "flex", flexDirection: "column" }}>
      <style>{`
        .lh-card {
          cursor: pointer;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 18px;
          padding: 1.25rem 1.35rem;
          display: flex; align-items: center; gap: 1rem;
          transition: border-color .22s, background .22s, transform .2s, box-shadow .22s;
          position: relative; overflow: hidden;
        }
        .lh-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,.13);
          box-shadow: 0 8px 32px rgba(0,0,0,.32);
        }
        .lh-cat-pill {
          display: inline-flex; align-items: center; gap: .3rem;
          background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
          border-radius: 99px; padding: .25rem .65rem;
          font-size: .7rem; color: rgba(255,255,255,.45); white-space: nowrap;
        }
        .lh-settings-btn {
          display: inline-flex; align-items: center; gap: .35rem;
          font-size: .75rem; color: rgba(255,255,255,.3);
          border: 1px solid rgba(255,255,255,.07); border-radius: 99px;
          padding: .28rem .65rem; background: transparent;
          transition: color .2s, border-color .2s;
        }
        .lh-settings-btn:hover { color: rgba(255,255,255,.6); border-color: rgba(255,255,255,.14); }
      `}</style>

      <AppHeader title="Главная" onExit={onExit} showBack={false} />

      <div style={{ flex: 1, overflowY: "auto", padding: "2rem 1.25rem 3rem" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>

          {/* Profile strip */}
          <div style={{
            background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)",
            borderRadius: 16, padding: "1.1rem 1.25rem",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            gap: "1rem", marginBottom: "1.75rem", flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,.3)", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: ".5rem" }}>
                Твои категории
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem" }}>
                {catLabels.length > 0 ? catLabels.map(l => (
                  <span key={l} className="lh-cat-pill">
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22d3ee", flexShrink: 0, opacity: .7 }} />
                    {l}
                  </span>
                )) : (
                  <span style={{ fontSize: ".8rem", color: "rgba(255,255,255,.25)" }}>Не выбраны</span>
                )}
              </div>
            </div>
            <button className="lh-settings-btn" onClick={() => onNavigate("onboarding")}>
              <Settings size={12} /> Изменить
            </button>
          </div>

          {/* Section label */}
          <div style={{ fontSize: ".7rem", fontWeight: 700, color: "rgba(255,255,255,.25)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: "1rem" }}>
            Модули обучения
          </div>

          {/* Module cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: ".7rem" }}>
            {MODULES.map((mod, i) => {
              const { id, icon: Icon, accent, title, desc, badge } = mod;
              const rgb = hexRgb(accent);
              return (
                <div key={id} className="lh-card" style={{ animationDelay: `${i * 60}ms` }} onClick={() => onNavigate(id)}>
                  {/* Top accent line */}
                  <div style={{ position: "absolute", top: 0, left: "1.35rem", width: 32, height: 1, background: `linear-gradient(90deg,${accent},transparent)` }} />

                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: `rgba(${rgb},.1)`, border: `1px solid rgba(${rgb},.2)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={18} style={{ color: accent }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: ".45rem", marginBottom: ".2rem" }}>
                      <span style={{ fontWeight: 700, fontSize: ".9rem", color: "#fff" }}>{title}</span>
                      {badge && (
                        <span style={{
                          fontSize: ".6rem", fontWeight: 700, color: accent, letterSpacing: ".05em",
                          background: `rgba(${rgb},.12)`, border: `1px solid rgba(${rgb},.2)`,
                          borderRadius: 99, padding: ".12rem .45rem",
                        }}>{badge}</span>
                      )}
                    </div>
                    <p style={{ color: "rgba(255,255,255,.38)", fontSize: ".8rem", lineHeight: 1.5 }}>{desc}</p>
                  </div>

                  <ChevronRight size={15} style={{ color: "rgba(255,255,255,.18)", flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
