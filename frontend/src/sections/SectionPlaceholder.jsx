// UI-only changes; logic unchanged
export default function SectionPlaceholder({ id, title, emoji = "✦", index = 0 }) {
  const ACCENTS = ["#c8880a", "#b84020", "#1fa89a", "#b06820", "#a84020", "#c8880a"];
  const accent = ACCENTS[index % ACCENTS.length];

  function hexRgb(hex) {
    return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
  }
  const rgb = hexRgb(accent);

  return (
    <section
      id={id}
      style={{
        background: "#f5f0e8",
        minHeight: "60vh",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <style>{`
        @keyframes sectionFadeIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        #${id} .section-inner { animation: sectionFadeIn 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .section-card { transition: transform 0.3s ease; }
        .section-card:hover { transform: translateY(-4px); }
      `}</style>
      <div className="section-inner" style={{ maxWidth: "42rem", margin: "0 auto", padding: "6rem 1.5rem", textAlign: "center", width: "100%" }}>
        <div
          className="section-card"
          style={{
            background: "#fff",
            border: `1px solid rgba(${rgb},.22)`,
            borderRadius: 20,
            padding: "3.5rem 2.5rem",
            boxShadow: "0 4px 24px rgba(120,80,20,.08)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>{emoji}</div>
          <h2 style={{
            fontSize: "clamp(1.6rem,4vw,2.2rem)", fontWeight: 900,
            color: "#2c2010", marginBottom: "1rem", letterSpacing: "-.03em",
          }}>
            {title}
          </h2>
          <p style={{ color: "#8a6030", fontSize: ".9rem", lineHeight: 1.75 }}>
            Этот раздел появится на следующем этапе разработки
          </p>
        </div>
      </div>
    </section>
  );
}
