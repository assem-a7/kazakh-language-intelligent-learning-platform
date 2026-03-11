// UI-only changes; logic unchanged
import { Zap } from "lucide-react";

const smoothScroll = (href) => {
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

const LINKS = [
  { label: "Возможности", href: "#features" },
  { label: "Модули",      href: "#modules"  },
  { label: "AI-логика",   href: "#ai"       },
  { label: "Как работает",href: "#how"      },
  { label: "FAQ",         href: "#faq"      },
];

export default function Footer() {
  return (
    <footer style={{
      background: "#f5f0e8",
      borderTop: "1px solid rgba(180,130,40,.18)",
      padding: "3.5rem 1.5rem 2.5rem",
    }}>
      <div style={{ maxWidth: "72rem", margin: "0 auto" }}>

        {/* Top row */}
        <div style={{
          display: "flex", flexWrap: "wrap",
          alignItems: "flex-start", justifyContent: "space-between",
          gap: "2.5rem", marginBottom: "3rem",
        }}>

          {/* Brand */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: "linear-gradient(135deg, #c8880a 0%, #b06820 55%, #1fa89a 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px rgba(200,136,10,.22)",
              }}>
                <Zap size={13} color="#fff" fill="#fff" />
              </div>
              <span style={{
                fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.03em",
                background: "linear-gradient(90deg, #c8880a, #b06820, #a84820)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
                QazaqAI
              </span>
            </div>
            <p style={{ color: "#8a6030", fontSize: "0.82rem", lineHeight: 1.7 }}>
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
                  color: "#8a6030", fontSize: "0.8125rem", fontWeight: 500,
                  transition: "color 0.2s", padding: "0.25rem 0",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#2c2010"}
                onMouseLeave={e => e.currentTarget.style.color = "#8a6030"}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom row */}
        <div style={{
          borderTop: "1px solid rgba(180,130,40,.14)",
          paddingTop: "1.5rem",
          display: "flex", flexWrap: "wrap",
          alignItems: "center", justifyContent: "space-between", gap: "0.75rem",
        }}>
          <span style={{ color: "#a08060", fontSize: "0.75rem" }}>
            © {new Date().getFullYear()} QazaqAI. Образовательная система.
          </span>
          <span style={{ color: "#b09070", fontSize: "0.75rem" }}>
            Казахский язык · AI-адаптация · Персональная траектория
          </span>
        </div>

      </div>
    </footer>
  );
}
