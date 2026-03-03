// UI-only changes; logic unchanged
import { Zap, ArrowLeft, LogOut } from "lucide-react";

export default function AppHeader({ title, onBack, onExit, backLabel = "Назад", showBack = true }) {
  return (
    <>
      <style>{`
        .app-header {
          position: sticky; top: 0; z-index: 50;
          height: 56px; flex-shrink: 0;
          display: flex; align-items: center;
          padding: 0 1.5rem; gap: 0.75rem;
          background: rgba(250, 247, 242, 0.94);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          border-bottom: 1px solid rgba(180, 130, 40, 0.16);
          box-shadow: 0 1px 8px rgba(120, 80, 20, 0.07);
        }
        .app-header-inner {
          width: 100%; max-width: 680px; margin: 0 auto;
          display: flex; align-items: center; gap: 0.75rem;
        }
        .app-header-logo {
          width: 26px; height: 26px; border-radius: 7px; flex-shrink: 0;
          background: linear-gradient(135deg, #c8880a 0%, #b06820 55%, #1fa89a 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(200, 136, 10, 0.28);
        }
        .app-header-brand {
          font-size: 0.875rem; font-weight: 800; letter-spacing: -0.03em;
          background: linear-gradient(90deg, #c8880a, #b06820, #a84820);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .app-header-sep {
          width: 1px; height: 16px; flex-shrink: 0;
          background: rgba(180, 130, 40, 0.2);
        }
        .app-header-title {
          font-size: 0.8125rem; font-weight: 600; letter-spacing: -0.01em;
          color: #7a5a30;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .app-header-back {
          display: inline-flex; align-items: center; gap: 0.35rem;
          font-size: 0.775rem; font-weight: 600;
          color: #7a5a30;
          border: 1px solid rgba(180, 130, 40, 0.24);
          border-radius: 99px; padding: 0.3rem 0.75rem; min-height: 32px;
          background: rgba(200, 136, 10, 0.06);
          transition: color .2s, border-color .2s, background .2s;
          white-space: nowrap;
        }
        .app-header-back:hover {
          color: #4a2e08;
          border-color: rgba(180, 130, 40, 0.45);
          background: rgba(200, 136, 10, 0.12);
        }
        .app-header-back:focus-visible {
          outline: 2px solid rgba(200, 136, 10, 0.5);
          outline-offset: 2px;
        }
        .app-header-exit {
          display: inline-flex; align-items: center; gap: 0.35rem;
          font-size: 0.72rem; font-weight: 600;
          color: #a08060;
          border: 1px solid rgba(180, 130, 40, 0.18);
          border-radius: 99px; padding: 0.28rem 0.7rem; min-height: 30px;
          background: transparent;
          transition: color .2s, border-color .2s, background .2s;
          white-space: nowrap;
        }
        .app-header-exit:hover {
          color: #6b5030;
          border-color: rgba(180, 130, 40, 0.35);
          background: rgba(200, 136, 10, 0.06);
        }
        .app-header-exit:focus-visible {
          outline: 2px solid rgba(200, 136, 10, 0.5);
          outline-offset: 2px;
        }
      `}</style>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-logo">
            <Zap size={11} color="#fff" fill="#fff" />
          </div>
          <span className="app-header-brand">QazaqAI</span>

          {title && (
            <>
              <div className="app-header-sep" />
              <span className="app-header-title">{title}</span>
            </>
          )}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.45rem" }}>
            {showBack && onBack && (
              <button className="app-header-back" onClick={onBack}>
                <ArrowLeft size={11} />
                {backLabel}
              </button>
            )}
            {onExit && (
              <button className="app-header-exit" onClick={onExit}>
                <LogOut size={10} />
                На главную
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
