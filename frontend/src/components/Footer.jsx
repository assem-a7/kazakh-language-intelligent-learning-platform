import { Zap } from "lucide-react";

const smoothScroll = (href) => {
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

const LINKS = [
  { label: "Возможности", href: "#features" },
  { label: "Модули", href: "#modules" },
  { label: "AI-логика", href: "#ai" },
  { label: "Как работает", href: "#how" },
  { label: "FAQ", href: "#faq" },
];

export default function Footer() {
  return (
    <footer style={{
      background: "#0a0a0f",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      padding: "3.5rem 1.5rem 2.5rem",
    }}>
      <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
        {/* Top row */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "2.5rem", marginBottom: "3rem" }}>
          {/* Brand */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 260 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg,#22d3ee,#6366f1,#a3e635)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Zap size={13} color="#0a0a0f" fill="#0a0a0f" />
              </div>
              <span style={{
                fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.02em",
                background: "linear-gradient(90deg,#e0f7fa,#c7f5a8)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
              }}>
                QazaqAI
              </span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.8rem", lineHeight: 1.65 }}>
              Интеллектуальная образовательная система для изучения казахского языка.
            </p>
          </div>

          {/* Nav links */}
          <nav style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 2.5rem" }}>
            {LINKS.map(({ label, href }) => (
              <button
                key={href}
                onClick={() => smoothScroll(href)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.35)", fontSize: "0.8125rem", fontWeight: 500,
                  transition: "color 0.2s", padding: "0.25rem 0",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.75)"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom row */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.04)",
          paddingTop: "1.5rem",
          display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem"
        }}>
          <span style={{ color: "rgba(255,255,255,0.18)", fontSize: "0.75rem" }}>
            © {new Date().getFullYear()} QazaqAI. Образовательная система.
          </span>
          <span style={{ color: "rgba(255,255,255,0.12)", fontSize: "0.75rem" }}>
            Казахский язык · AI-адаптация · Персональная траектория
          </span>
        </div>
      </div>
    </footer>
  );
}
