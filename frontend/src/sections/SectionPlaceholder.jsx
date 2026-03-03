export default function SectionPlaceholder({ id, title, emoji = "✦", index = 0 }) {
  const colors = [
    ["rgba(34,211,238,0.12)", "rgba(34,211,238,0.25)"],
    ["rgba(99,102,241,0.12)", "rgba(163,230,53,0.25)"],
    ["rgba(163,230,53,0.10)", "rgba(34,211,238,0.2)"],
    ["rgba(249,115,22,0.10)", "rgba(99,102,241,0.2)"],
    ["rgba(236,72,153,0.10)", "rgba(34,211,238,0.2)"],
    ["rgba(34,211,238,0.08)", "rgba(99,102,241,0.2)"],
  ];
  const [bg, border] = colors[index % colors.length];

  return (
    <section
      id={id}
      style={{ background: "#0a0a0f", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <style>{`
        @keyframes sectionFadeIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        #${id} .section-inner {
          animation: sectionFadeIn 0.6s cubic-bezier(0.22,1,0.36,1) both;
        }
        #${id} .section-card:hover {
          transform: translateY(-4px);
        }
        .section-card {
          transition: transform 0.3s ease;
        }
      `}</style>
      <div className="section-inner max-w-3xl mx-auto px-6 py-24 text-center w-full">
        <div
          className="section-card mx-auto rounded-3xl p-14"
          style={{
            background: bg,
            border: `1px solid ${border}`,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="text-5xl mb-6">{emoji}</div>
          <h2
            className="text-4xl sm:text-5xl font-black mb-4"
            style={{
              background: "linear-gradient(135deg,#22d3ee 0%,#818cf8 50%,#a3e635 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {title}
          </h2>
          <p className="text-white/30 text-base mt-2">
            Этот раздел появится на следующем этапе разработки
          </p>
        </div>
      </div>
    </section>
  );
}
