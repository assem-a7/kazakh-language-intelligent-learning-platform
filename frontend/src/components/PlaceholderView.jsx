import { Image, BookOpen, PenLine, ClipboardCheck, TrendingUp, Hourglass } from "lucide-react";
import AppHeader from "../components/AppHeader";

const META = {
  dictionary: { title: "Словарь",    Icon: Image,         accent: "#22d3ee", desc: "Слова с изображениями (image_url), транскрипцией и контекстными примерами, подобранными по твоим категориям интересов." },
  grammar:    { title: "Грамматика", Icon: BookOpen,       accent: "#818cf8", desc: "Правила казахского языка с разбором структуры, примерами предложений и пояснениями. От базовых конструкций до сложных форм." },
  exercises:  { title: "Упражнения", Icon: PenLine,        accent: "#a3e635", desc: "Практические задания по словарю и грамматике: перевод, вставка слов, составление предложений, интервальные повторения." },
  tests:      { title: "Тесты",      Icon: ClipboardCheck, accent: "#f472b6", desc: "Контрольные срезы по пройденным темам. Результаты фиксируются и влияют на персональную траекторию обучения." },
  progress:   { title: "Прогресс",   Icon: TrendingUp,     accent: "#34d399", desc: "Персональный дашборд: пройденные темы, динамика результатов тестов, ошибки по разделам, очередь повторения." },
};

function hexRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

export default function PlaceholderView({ view, onBack, onExit }) {
  const { title, Icon, accent, desc } = META[view] || { title: view, Icon: Hourglass, accent: "#22d3ee", desc: "В разработке." };
  const rgb = hexRgb(accent);

  return (
    <div style={{ minHeight: "100dvh", background: "#0a0a0f", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes pvPulse { 0%,100%{opacity:.35;transform:scale(1)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes pvRing  { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(1.8);opacity:0} }
        .pv-pulse-dot { animation: pvPulse 2.2s ease-in-out infinite; }
        .pv-ring { animation: pvRing 2.4s ease-out infinite; }
      `}</style>

      <AppHeader title={title} onBack={onBack} onExit={onExit} />

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem" }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          {/* Icon with rings */}
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
            <div className="pv-ring" style={{
              position: "absolute", width: 90, height: 90, borderRadius: "50%",
              border: `1px solid rgba(${rgb},.35)`,
            }} />
            <div style={{
              width: 72, height: 72, borderRadius: 22,
              background: `rgba(${rgb},.1)`,
              border: `1px solid rgba(${rgb},.22)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={28} style={{ color: accent }} />
            </div>
          </div>

          {/* Title */}
          <h2 style={{ fontSize: "clamp(1.4rem,4vw,1.9rem)", fontWeight: 900, color: "#fff", marginBottom: ".75rem" }}>
            {title}
          </h2>

          {/* Desc */}
          <p style={{ color: "rgba(255,255,255,.38)", fontSize: ".9rem", lineHeight: 1.7, marginBottom: "2rem" }}>
            {desc}
          </p>

          {/* Status pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: ".5rem",
            background: `rgba(${rgb},.07)`,
            border: `1px solid rgba(${rgb},.16)`,
            borderRadius: 99, padding: ".55rem 1.1rem",
            fontSize: ".78rem", color: accent, fontWeight: 600, letterSpacing: ".02em",
          }}>
            <span className="pv-pulse-dot" style={{
              width: 7, height: 7, borderRadius: "50%",
              background: accent, flexShrink: 0,
            }} />
            Модуль разрабатывается — следующий этап
          </div>
        </div>
      </div>
    </div>
  );
}
