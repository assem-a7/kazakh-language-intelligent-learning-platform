// UI-only changes; logic unchanged. New logic added in ProgressView only: participant ID, reset, topic table, export.
import { useState, useEffect, useMemo, useCallback } from "react";
import { BarChart2, Zap, Clock, Target, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Copy, Download, Trash2, UserX, User } from "lucide-react";
import AppHeader from "../components/AppHeader";
import { loadCsv } from "../utils/csvLoader";

// ── localStorage keys ─────────────────────────────────────────────────────────
const LS_KEY            = "qazaqai_attempts";
const LS_PARTICIPANT_ID = "qazaqai_participant_id";

// ── pure logic helpers — unchanged ───────────────────────────────────────────
function loadAttempts() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}

function pct(correct, total) {
  if (!total) return null;
  return Math.round((correct / total) * 100);
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("ru-RU", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
}

function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function calcStreak(attempts) {
  if (!attempts.length) return 0;
  const days = [...new Set(attempts.map(a => dayKey(a.ts)))].sort().reverse();
  const today     = dayKey(Date.now());
  const yesterday = dayKey(Date.now() - 86400000);
  if (days[0] !== today && days[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const expectedPrev = dayKey(new Date(days[i-1]).getTime() - 86400000);
    if (days[i] === expectedPrev) { streak++; } else break;
  }
  return streak;
}

function hexRgb(hex) {
  const h = (hex || "#888").replace("#","");
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`;
}

// ── NEW: participant ID helpers ───────────────────────────────────────────────
function genParticipantId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "P-";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function getOrCreateParticipantId() {
  try {
    let id = localStorage.getItem(LS_PARTICIPANT_ID);
    if (!id) { id = genParticipantId(); localStorage.setItem(LS_PARTICIPANT_ID, id); }
    return id;
  } catch { return genParticipantId(); }
}

// ── design constants ──────────────────────────────────────────────────────────
const PAGE_W   = 680;
const PAGE_PAD = "2rem 1.5rem 3.5rem";

const WARM  = "#c8880a";
const TERRA = "#b06820";
const COOL  = "#1fa89a";
const DIM   = "#b84020";

// ── SectionHead ───────────────────────────────────────────────────────────────
function SectionHead({ children }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:".75rem",
      fontSize:".67rem", fontWeight:700,
      color:"#a08060", letterSpacing:".13em", textTransform:"uppercase",
      marginBottom:"1rem",
    }}>
      {children}
      <div style={{ flex:1, height:1, background:"rgba(180,130,40,.16)" }} />
    </div>
  );
}

// ── StatTile ──────────────────────────────────────────────────────────────────
function StatTile({ icon: Icon, label, value, sub, accent = WARM }) {
  const rgb   = hexRgb(accent);
  const empty = value === "\u2014";
  return (
    <div style={{
      background:"#fff",
      border:`1px solid rgba(${rgb},.2)`,
      borderRadius:12,
      padding:"1rem 1.1rem .9rem",
      display:"flex", flexDirection:"column", gap:".5rem",
      position:"relative", overflow:"hidden",
      boxShadow:"0 1px 6px rgba(120,80,20,.07)",
    }}>
      <div style={{ position:"absolute", top:0, left:"1.1rem", width:24, height:2, background:`linear-gradient(90deg,${accent},transparent)` }} />
      <div style={{ display:"flex", alignItems:"center", gap:".4rem" }}>
        <Icon size={12} style={{ color:`rgba(${rgb},.7)`, flexShrink:0 }} />
        <span style={{ fontSize:".63rem", fontWeight:700, color:`rgba(${rgb},.65)`, letterSpacing:".1em", textTransform:"uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{
        fontFamily:"'JetBrains Mono','Fira Code',monospace",
        fontSize:"1.5rem", fontWeight:700, lineHeight:1,
        letterSpacing:"-.03em",
        color: empty ? "rgba(180,130,40,.2)" : "#2c2010",
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize:".68rem", color:"#b09070", letterSpacing:".02em" }}>{sub}</div>
      )}
    </div>
  );
}

// ── AccuracyRow ───────────────────────────────────────────────────────────────
function AccuracyRow({ label, correct, total, accent }) {
  const p   = pct(correct, total);
  const rgb = hexRgb(accent);
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 3fr 3.5rem", alignItems:"center", gap:".85rem" }}>
      <span style={{ fontSize:".78rem", color:"#6b5030", fontWeight:500, whiteSpace:"nowrap" }}>{label}</span>
      <div style={{ height:3, background:"rgba(180,130,40,.1)", borderRadius:99, overflow:"hidden" }}>
        <div style={{
          height:"100%", borderRadius:99,
          background: p === null ? "transparent" : `linear-gradient(90deg,${accent},rgba(${rgb},.35))`,
          width: p === null ? "0%" : `${p}%`,
          transition:"width .6s cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
      <span style={{
        fontFamily:"'JetBrains Mono',monospace",
        fontSize:".78rem", fontWeight:700, textAlign:"right",
        color: p === null ? "rgba(180,130,40,.22)" : accent,
      }}>
        {p === null ? "—" : `${p}%`}
      </span>
    </div>
  );
}

// ── Recommendations ───────────────────────────────────────────────────────────
function Recommendations({ attempts }) {
  const recs = useMemo(() => {
    const list = [];
    const testAttempts = attempts.filter(a => a.view === "tests");
    const testCorrect  = testAttempts.filter(a => a.correct === true || a.correct === "true").length;
    const testPct      = pct(testCorrect, testAttempts.length);

    if (testAttempts.length > 0 && testPct !== null && testPct < 50) {
      list.push({ icon: AlertTriangle, accent: DIM, text: "Точность по тестам ниже 50%. Рекомендуем пройти «Упражнения → Выбери правильный перевод» для тренировки." });
    }

    const withTime = attempts.filter(a => a.time_ms && Number(a.time_ms) > 0);
    if (withTime.length >= 3) {
      const avgMs = withTime.reduce((s,a) => s + Number(a.time_ms), 0) / withTime.length;
      if (avgMs > 20000) {
        list.push({ icon: Clock, accent: TERRA, text: "Среднее время ответа превышает 20 секунд. Попробуй перечитать правило или разобрать пример перед упражнением." });
      }
    }

    if (attempts.length === 0) {
      list.push({ icon: TrendingUp, accent: WARM, text: "Начни с упражнений или тестов — тогда здесь появится твоя личная статистика." });
    }

    return list;
  }, [attempts]);

  if (!recs.length) return null;

  return (
    <div>
      <SectionHead>Рекомендации</SectionHead>
      <div style={{ display:"flex", flexDirection:"column", gap:".55rem" }}>
        {recs.map((r, i) => {
          const rgb = hexRgb(r.accent);
          return (
            <div key={i} style={{
              display:"flex", alignItems:"flex-start", gap:".75rem",
              background:`rgba(${rgb},.06)`, border:`1px solid rgba(${rgb},.2)`,
              borderRadius:11, padding:".85rem 1rem",
            }}>
              <r.icon size={14} style={{ color:r.accent, flexShrink:0, marginTop:1 }} />
              <p style={{ fontSize:".82rem", color:"#6b5030", lineHeight:1.7 }}>{r.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── XIcon ─────────────────────────────────────────────────────────────────────
function XIcon({ size, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

// ── RecentAttempts ────────────────────────────────────────────────────────────
function RecentAttempts({ attempts }) {
  const recent = [...attempts].sort((a,b) => b.ts - a.ts).slice(0, 10);
  if (!recent.length) return null;

  const TYPE_LABELS = {
    multichoice:     "Выбор варианта",
    translate_check: "Ввод перевода",
    translate:       "Перевод (упр.)",
    fill:            "Пропуск",
  };

  return (
    <div>
      <SectionHead>Последние попытки</SectionHead>
      <div style={{
        display:"grid", gridTemplateColumns:"1.5rem 1fr 3rem 3rem 6.5rem",
        gap:".6rem", padding:"0 .75rem .5rem",
        borderBottom:"1px solid rgba(180,130,40,.14)", marginBottom:".4rem",
      }}>
        {["", "Тип", "Раздел", "Время", "Дата"].map((h, i) => (
          <span key={i} style={{ fontSize:".62rem", fontWeight:700, color:"#a08060", letterSpacing:".08em", textTransform:"uppercase" }}>{h}</span>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:".2rem" }}>
        {recent.map((a, i) => {
          const isCorrect = a.correct === true || a.correct === "true";
          const isWrong   = a.correct === false || a.correct === "false";
          const hasResult = isCorrect || isWrong;
          return (
            <div key={i} style={{
              display:"grid", gridTemplateColumns:"1.5rem 1fr 3rem 3rem 6.5rem",
              alignItems:"center", gap:".6rem",
              padding:".5rem .75rem",
              background: i % 2 === 0 ? "rgba(180,130,40,.04)" : "transparent",
              borderRadius:7,
            }}>
              <div>
                {hasResult ? (
                  isCorrect ? <CheckCircle size={12} style={{ color:COOL }} /> : <XIcon size={12} style={{ color:DIM }} />
                ) : (
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"rgba(180,130,40,.18)", margin:"2px 0" }} />
                )}
              </div>
              <span style={{ fontSize:".75rem", color:"#6b5030", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {TYPE_LABELS[a.type] || a.type}
              </span>
              <span style={{ fontSize:".68rem", color:"#a08060", fontFamily:"monospace" }}>
                {a.view === "tests" ? "тест" : "упр."}
              </span>
              <span style={{ fontSize:".68rem", color:"#a08060", fontFamily:"monospace", textAlign:"right" }}>
                {a.time_ms ? `${(Number(a.time_ms)/1000).toFixed(1)}с` : "—"}
              </span>
              <span style={{ fontSize:".65rem", color:"#b09070", textAlign:"right" }}>{formatDate(a.ts)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TopicAccuracyBlock (bars) ─────────────────────────────────────────────────
const TOPIC_ACCENTS = [WARM, TERRA, COOL, DIM, "#b06820", "#c8880a", "#1fa89a", "#a84020", "#b84020"];

function TopicAccuracyBlock({ attempts, sentences, categories }) {
  const topicStats = useMemo(() => {
    if (!categories.length) return [];

    const sentCatMap = {};
    sentences.forEach(s => {
      if (s.id != null && s.id !== "" && s.category_id != null && s.category_id !== "") {
        sentCatMap[String(s.id)] = String(s.category_id);
      }
    });

    const catNameMap = {};
    categories.forEach(c => {
      const key = String(c.id ?? "");
      if (key) catNameMap[key] = c.name_ru || c.slug || key;
      if (c.slug) catNameMap[String(c.slug)] = c.name_ru || c.slug;
    });

    const allCatIds = categories.map(c => String(c.id ?? "")).filter(Boolean);

    const tally = {};
    allCatIds.forEach(id => { tally[id] = { correct: 0, total: 0 }; });

    attempts.forEach(a => {
      if (a.sentence_id == null || a.sentence_id === "") return;
      const catId = sentCatMap[String(a.sentence_id)];
      if (!catId) return;
      if (!tally[catId]) tally[catId] = { correct: 0, total: 0 };
      tally[catId].total += 1;
      if (a.correct === true || a.correct === "true") tally[catId].correct += 1;
    });

    return allCatIds.map((catId, i) => ({
      catId,
      name:    catNameMap[catId] || catId,
      correct: tally[catId].correct,
      total:   tally[catId].total,
      accent:  TOPIC_ACCENTS[i % TOPIC_ACCENTS.length],
    })).sort((a, b) => b.total - a.total);
  }, [attempts, sentences, categories]);

  if (!topicStats.length) return null;

  return (
    <div>
      <SectionHead>Прогресс по темам</SectionHead>
      <div style={{
        background:"#fff", border:"1px solid rgba(180,130,40,.18)",
        borderRadius:12, padding:"1.1rem 1.2rem",
        display:"flex", flexDirection:"column", gap:".9rem",
        boxShadow:"0 1px 6px rgba(120,80,20,.07)",
      }}>
        {topicStats.map(({ catId, name, correct, total, accent }) => {
          const p     = total > 0 ? Math.round((correct / total) * 100) : null;
          const muted = total === 0;
          const rgb   = hexRgb(accent);
          return (
            <div key={catId} style={{ display:"grid", gridTemplateColumns:"1fr 3fr 3.5rem", alignItems:"center", gap:".85rem" }}>
              <span style={{ fontSize:".78rem", fontWeight:500, color: muted ? "rgba(180,130,40,.3)" : "#6b5030", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {name}
              </span>
              <div style={{ height:3, background:"rgba(180,130,40,.1)", borderRadius:99, overflow:"hidden" }}>
                {!muted && (
                  <div style={{
                    height:"100%", borderRadius:99,
                    background:`linear-gradient(90deg,${accent},rgba(${rgb},.3))`,
                    width:`${p}%`,
                    transition:"width .6s cubic-bezier(0.16,1,0.3,1)",
                  }} />
                )}
              </div>
              <span style={{
                fontFamily:"'JetBrains Mono',monospace",
                fontSize:".75rem", fontWeight:700, textAlign:"right",
                color: muted ? "rgba(180,130,40,.22)" : accent,
              }}>
                {muted ? "—" : `${p}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── NEW: TopicTable (research data) ──────────────────────────────────────────
function TopicTable({ attempts, sentences, categories }) {
  const rows = useMemo(() => {
    if (!categories.length) return [];

    const sentCatMap = {};
    sentences.forEach(s => {
      if (s.id != null && s.id !== "" && s.category_id != null && s.category_id !== "") {
        sentCatMap[String(s.id)] = String(s.category_id);
      }
    });

    const catNameMap = {};
    categories.forEach(c => {
      const key = String(c.id ?? "");
      if (key) catNameMap[key] = c.name_ru || c.slug || key;
      if (c.slug) catNameMap[String(c.slug)] = c.name_ru || c.slug;
    });

    const allCatIds = categories.map(c => String(c.id ?? "")).filter(Boolean);

    const tally = {};
    allCatIds.forEach(id => { tally[id] = { correct: 0, total: 0, timeSum: 0, timeCount: 0 }; });

    attempts.forEach(a => {
      if (a.sentence_id == null || a.sentence_id === "") return;
      const catId = sentCatMap[String(a.sentence_id)];
      if (!catId) return;
      if (!tally[catId]) tally[catId] = { correct: 0, total: 0, timeSum: 0, timeCount: 0 };
      tally[catId].total += 1;
      if (a.correct === true || a.correct === "true") tally[catId].correct += 1;
      if (a.time_ms && Number(a.time_ms) > 0) {
        tally[catId].timeSum   += Number(a.time_ms);
        tally[catId].timeCount += 1;
      }
    });

    return allCatIds.map(catId => ({
      catId,
      name:    catNameMap[catId] || catId,
      correct: tally[catId].correct,
      total:   tally[catId].total,
      avgSec:  tally[catId].timeCount > 0 ? (tally[catId].timeSum / tally[catId].timeCount / 1000) : null,
    })).sort((a, b) => b.total - a.total);
  }, [attempts, sentences, categories]);

  if (!rows.length) return null;

  const COL = {
    head: { fontSize:".65rem", fontWeight:700, color:"#a08060", letterSpacing:".09em", textTransform:"uppercase", padding:".45rem .6rem", textAlign:"left", borderBottom:"2px solid rgba(180,130,40,.18)", background:"rgba(200,136,10,.04)" },
    cell: { fontSize:".78rem", color:"#6b5030", padding:".55rem .6rem", borderBottom:"1px solid rgba(180,130,40,.09)", verticalAlign:"middle" },
    mono: { fontSize:".78rem", fontFamily:"'JetBrains Mono',monospace", fontWeight:700, padding:".55rem .6rem", borderBottom:"1px solid rgba(180,130,40,.09)", textAlign:"right", verticalAlign:"middle" },
  };

  return (
    <div>
      <SectionHead>Детальная таблица по темам</SectionHead>
      <div style={{ background:"#fff", border:"1px solid rgba(180,130,40,.18)", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 6px rgba(120,80,20,.07)" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:420 }}>
            <thead>
              <tr>
                <th style={{ ...COL.head, width:"30%" }}>Тема</th>
                <th style={{ ...COL.head, textAlign:"right" }}>Попытки</th>
                <th style={{ ...COL.head, textAlign:"right" }}>Верно</th>
                <th style={{ ...COL.head, textAlign:"right" }}>Точность</th>
                <th style={{ ...COL.head, textAlign:"right" }}>Ср. время</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const p       = pct(r.correct, r.total);
                const noData  = r.total === 0;
                const pColor  = p === null ? "#b09070" : p >= 70 ? COOL : p >= 50 ? WARM : DIM;
                return (
                  <tr key={r.catId} style={{ background: i % 2 === 0 ? "transparent" : "rgba(180,130,40,.025)" }}>
                    <td style={{ ...COL.cell, fontWeight:500, color: noData ? "#b09070" : "#2c2010" }}>
                      {r.name}
                    </td>
                    <td style={{ ...COL.mono, color: noData ? "#b09070" : "#6b5030" }}>
                      {r.total || "—"}
                    </td>
                    <td style={{ ...COL.mono, color: noData ? "#b09070" : "#6b5030" }}>
                      {noData ? "—" : r.correct}
                    </td>
                    <td style={{ ...COL.mono, color: pColor, fontWeight:700 }}>
                      {noData ? "нет попыток" : `${p}%`}
                    </td>
                    <td style={{ ...COL.mono, color:"#8a6030" }}>
                      {r.avgSec !== null ? `${r.avgSec.toFixed(1)}с` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── NEW: ParticipantBlock ─────────────────────────────────────────────────────
function ParticipantBlock({ participantId, onResetProgress, onNewParticipant }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(participantId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const BTN_BASE = {
    display:"inline-flex", alignItems:"center", justifyContent:"center", gap:".4rem",
    borderRadius:99, padding:".6rem 1.1rem", minHeight:44,
    fontSize:".82rem", fontWeight:600, cursor:"pointer",
    transition:"border-color .2s, box-shadow .2s, background .2s, color .2s",
  };

  return (
    <div>
      <SectionHead>Участник и данные</SectionHead>
      <div style={{
        background:"#fff", border:"1px solid rgba(180,130,40,.18)",
        borderRadius:12, padding:"1.1rem 1.2rem",
        boxShadow:"0 1px 6px rgba(120,80,20,.07)",
        display:"flex", flexDirection:"column", gap:"1rem",
      }}>
        {/* ID row */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:".6rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:".6rem" }}>
            <div style={{ width:32, height:32, borderRadius:8, background:"rgba(200,136,10,.1)", border:"1px solid rgba(200,136,10,.22)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <User size={15} style={{ color:WARM }} />
            </div>
            <div>
              <div style={{ fontSize:".67rem", fontWeight:700, color:"#a08060", letterSpacing:".1em", textTransform:"uppercase", marginBottom:".15rem" }}>
                ID участника
              </div>
              <div style={{ fontFamily:"'JetBrains Mono','Fira Code',monospace", fontSize:"1rem", fontWeight:700, color:"#2c2010", letterSpacing:".05em" }}>
                {participantId}
              </div>
            </div>
          </div>
          <button
            onClick={handleCopy}
            style={{
              ...BTN_BASE,
              background: copied ? "rgba(31,168,154,.08)" : "rgba(200,136,10,.07)",
              border: `1px solid ${copied ? "rgba(31,168,154,.3)" : "rgba(200,136,10,.24)"}`,
              color: copied ? COOL : "#8a6030",
              minHeight:36, padding:".4rem .9rem",
            }}
          >
            <Copy size={12} />
            {copied ? "Скопировано" : "Копировать"}
          </button>
        </div>

        {/* Divider */}
        <div style={{ height:1, background:"rgba(180,130,40,.12)" }} />

        {/* Reset buttons */}
        <div style={{ display:"flex", gap:".6rem", flexWrap:"wrap" }}>
          <button
            onClick={onResetProgress}
            style={{
              ...BTN_BASE,
              background:"rgba(184,64,32,.06)", border:"1px solid rgba(184,64,32,.24)", color:DIM,
              flex:"1 1 160px",
            }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(184,64,32,.11)"; e.currentTarget.style.borderColor="rgba(184,64,32,.42)"; e.currentTarget.style.boxShadow="0 3px 12px rgba(184,64,32,.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.background="rgba(184,64,32,.06)"; e.currentTarget.style.borderColor="rgba(184,64,32,.24)"; e.currentTarget.style.boxShadow="none"; }}
          >
            <Trash2 size={14} /> Сбросить прогресс
          </button>
          <button
            onClick={onNewParticipant}
            style={{
              ...BTN_BASE,
              background:"rgba(180,130,40,.07)", border:"1px solid rgba(180,130,40,.24)", color:"#7a5a30",
              flex:"1 1 160px",
            }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(180,130,40,.13)"; e.currentTarget.style.borderColor="rgba(180,130,40,.42)"; e.currentTarget.style.boxShadow="0 3px 12px rgba(120,80,20,.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.background="rgba(180,130,40,.07)"; e.currentTarget.style.borderColor="rgba(180,130,40,.24)"; e.currentTarget.style.boxShadow="none"; }}
          >
            <UserX size={14} /> Новый участник
          </button>
        </div>

        <p style={{ fontSize:".72rem", color:"#b09070", lineHeight:1.6, margin:0 }}>
          «Сбросить прогресс» удаляет все попытки, ID участника сохраняется.<br />
          «Новый участник» удаляет попытки, выбор тем и генерирует новый ID.
        </p>
      </div>
    </div>
  );
}

// ── NEW: ExportBlock ──────────────────────────────────────────────────────────
function ExportBlock({ attempts, participantId }) {
  const [copied, setCopied] = useState(false);

  const buildPayload = () => ({
    participant_id: participantId,
    exported_at:    new Date().toISOString(),
    attempts_count: attempts.length,
    attempts,
  });

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildPayload(), null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    try {
      const json = JSON.stringify(buildPayload(), null, 2);
      const blob = new Blob([json], { type:"application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `qazaqai_${participantId}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  };

  const BTN_BASE = {
    display:"inline-flex", alignItems:"center", justifyContent:"center", gap:".4rem",
    borderRadius:99, padding:".6rem 1.1rem", minHeight:44,
    fontSize:".82rem", fontWeight:600, cursor:"pointer",
    transition:"border-color .2s, box-shadow .2s, background .2s, color .2s",
    flex:"1 1 140px",
  };

  return (
    <div>
      <SectionHead>Экспорт результатов</SectionHead>
      <div style={{
        background:"#fff", border:"1px solid rgba(180,130,40,.18)",
        borderRadius:12, padding:"1.1rem 1.2rem",
        boxShadow:"0 1px 6px rgba(120,80,20,.07)",
        display:"flex", flexDirection:"column", gap:".85rem",
      }}>
        <p style={{ fontSize:".82rem", color:"#7a5a30", lineHeight:1.65, margin:0 }}>
          Экспортируй данные для исследования — все попытки вместе с ID участника.
        </p>
        <div style={{ display:"flex", gap:".6rem", flexWrap:"wrap" }}>
          <button
            onClick={handleCopyJson}
            style={{
              ...BTN_BASE,
              background: copied ? "rgba(31,168,154,.08)" : "rgba(200,136,10,.07)",
              border: `1px solid ${copied ? "rgba(31,168,154,.3)" : "rgba(200,136,10,.24)"}`,
              color: copied ? COOL : "#8a6030",
            }}
            onMouseEnter={e => { if (!copied) { e.currentTarget.style.background="rgba(200,136,10,.13)"; e.currentTarget.style.borderColor="rgba(200,136,10,.42)"; } }}
            onMouseLeave={e => { if (!copied) { e.currentTarget.style.background="rgba(200,136,10,.07)"; e.currentTarget.style.borderColor="rgba(200,136,10,.24)"; } }}
          >
            <Copy size={13} />
            {copied ? "Скопировано!" : "Скопировать JSON"}
          </button>
          <button
            onClick={handleDownload}
            style={{
              ...BTN_BASE,
              background:"rgba(31,168,154,.07)", border:"1px solid rgba(31,168,154,.24)", color:COOL,
            }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(31,168,154,.13)"; e.currentTarget.style.borderColor="rgba(31,168,154,.4)"; e.currentTarget.style.boxShadow="0 3px 12px rgba(31,168,154,.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.background="rgba(31,168,154,.07)"; e.currentTarget.style.borderColor="rgba(31,168,154,.24)"; e.currentTarget.style.boxShadow="none"; }}
          >
            <Download size={13} /> Скачать JSON
          </button>
        </div>
        {attempts.length === 0 && (
          <p style={{ fontSize:".72rem", color:"#b09070", margin:0 }}>Нет данных для экспорта — пройди упражнения или тесты.</p>
        )}
      </div>
    </div>
  );
}

// ── MAIN VIEW ─────────────────────────────────────────────────────────────────
export default function ProgressView({ onBack, onExit }) {
  const [refreshKey, setRefreshKey]   = useState(0);
  const [sentences, setSentences]     = useState([]);
  const [categories, setCategories]   = useState([]);
  const [participantId, setParticipantId] = useState(() => getOrCreateParticipantId());

  useEffect(() => {
    loadCsv("/data/sentences.csv").then(setSentences).catch(() => {});
    loadCsv("/data/categories.csv").then(setCategories).catch(() => {});
  }, []);

  const attempts    = useMemo(() => loadAttempts(), [refreshKey]);

  const stats = useMemo(() => {
    const all   = attempts;
    const tests = all.filter(a => a.view === "tests");
    const exs   = all.filter(a => a.view === "exercises");

    const countCorrect = arr => arr.filter(a => a.correct === true || a.correct === "true").length;

    const withTime = all.filter(a => a.time_ms && Number(a.time_ms) > 0);
    const avgMs    = withTime.length
      ? Math.round(withTime.reduce((s,a) => s + Number(a.time_ms), 0) / withTime.length)
      : null;

    return {
      allCorrect: countCorrect(all), allTotal: all.length,
      testCorrect: countCorrect(tests), testTotal: tests.length,
      exCorrect: countCorrect(exs),    exTotal: exs.length,
      avgMs,
      streak: calcStreak(all),
    };
  }, [refreshKey]);

  const overallPct = pct(stats.allCorrect, stats.allTotal);

  // ── reset handlers ──────────────────────────────────────────────────────────
  const handleResetProgress = useCallback(() => {
    if (!window.confirm("Удалить все данные о попытках? ID участника сохранится.")) return;
    try { localStorage.removeItem(LS_KEY); } catch {}
    setRefreshKey(k => k + 1);
  }, []);

  const handleNewParticipant = useCallback(() => {
    if (!window.confirm("Сбросить всё и начать как новый участник? Попытки и выбор тем будут удалены.")) return;
    try {
      localStorage.removeItem(LS_KEY);
      // remove topic selection keys (best-effort, no crash if absent)
      ["qazaqai_active_category", "qazaqai_active_topics", "qazaqai_selected_topics"].forEach(k => {
        try { localStorage.removeItem(k); } catch {}
      });
      const newId = genParticipantId();
      localStorage.setItem(LS_PARTICIPANT_ID, newId);
      setParticipantId(newId);
    } catch {}
    setRefreshKey(k => k + 1);
  }, []);

  return (
    <div style={{ minHeight:"100dvh", background:"#faf7f2", display:"flex", flexDirection:"column" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .85s linear infinite}`}</style>
      <AppHeader title="Прогресс" onBack={onBack} onExit={onExit} />

      <div style={{ flex:1, overflowY:"auto", padding:PAGE_PAD }}>
        <div style={{ maxWidth:PAGE_W, margin:"0 auto", display:"flex", flexDirection:"column", gap:"2rem" }}>

          {/* Top bar */}
          <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", flexWrap:"wrap", gap:".75rem" }}>
            <div>
              <h1 style={{ fontSize:"1.25rem", fontWeight:800, color:"#2c2010", letterSpacing:"-.03em", marginBottom:".2rem" }}>
                Статистика
              </h1>
              <p style={{ fontSize:".78rem", color:"#8a6030" }}>
                {stats.allTotal
                  ? `${stats.allTotal} попыток · ${stats.allCorrect} верно`
                  : "нет данных — начни с упражнений"}
              </p>
            </div>
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              style={{
                display:"flex", alignItems:"center", gap:".35rem",
                fontSize:".72rem", fontWeight:600, color:"#8a6030",
                border:"1px solid rgba(180,130,40,.24)", borderRadius:99,
                padding:".3rem .8rem", background:"#fff",
                boxShadow:"0 1px 4px rgba(120,80,20,.07)",
                transition:"color .2s, border-color .2s, box-shadow .2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color="#4a2e08"; e.currentTarget.style.borderColor="rgba(180,130,40,.45)"; e.currentTarget.style.boxShadow="0 3px 12px rgba(120,80,20,.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.color="#8a6030"; e.currentTarget.style.borderColor="rgba(180,130,40,.24)"; e.currentTarget.style.boxShadow="0 1px 4px rgba(120,80,20,.07)"; }}
            >
              <RefreshCw size={11} /> Обновить
            </button>
          </div>

          {/* Key metrics */}
          <div>
            <SectionHead>Ключевые метрики</SectionHead>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:".65rem" }}>
              <StatTile icon={Target}    label="Точность"   value={overallPct !== null ? `${overallPct}%` : "\u2014"} sub={stats.allTotal ? `из ${stats.allTotal} попыток` : "нет данных"} accent={WARM} />
              <StatTile icon={BarChart2} label="Попыток"    value={stats.allTotal || "\u2014"} sub={stats.allTotal ? `верно: ${stats.allCorrect}` : undefined} accent={TERRA} />
              <StatTile icon={Zap}       label="Серия дней" value={stats.streak ? `${stats.streak}д` : "\u2014"} sub={stats.streak ? "подряд" : "начни сегодня"} accent={COOL} />
              <StatTile icon={Clock}     label="Ср. время"  value={stats.avgMs ? `${(stats.avgMs/1000).toFixed(1)}с` : "\u2014"} sub="на ответ" accent={DIM} />
            </div>
          </div>

          {/* Accuracy by section */}
          <div>
            <SectionHead>Точность по разделам</SectionHead>
            <div style={{
              background:"#fff", border:"1px solid rgba(180,130,40,.18)",
              borderRadius:12, padding:"1.1rem 1.2rem",
              display:"flex", flexDirection:"column", gap:"1rem",
              boxShadow:"0 1px 6px rgba(120,80,20,.07)",
            }}>
              <AccuracyRow label="Тесты"      correct={stats.testCorrect} total={stats.testTotal} accent={WARM} />
              <AccuracyRow label="Упражнения" correct={stats.exCorrect}   total={stats.exTotal}   accent={TERRA} />
            </div>
          </div>

          {/* Topic bars */}
          <TopicAccuracyBlock attempts={attempts} sentences={sentences} categories={categories} />

          {/* Topic table */}
          <TopicTable attempts={attempts} sentences={sentences} categories={categories} />

          {/* Recommendations */}
          <Recommendations attempts={attempts} />

          {/* Recent attempts log */}
          <RecentAttempts attempts={attempts} />

          {/* Export */}
          <ExportBlock attempts={attempts} participantId={participantId} />

          {/* Participant + reset */}
          <ParticipantBlock
            participantId={participantId}
            onResetProgress={handleResetProgress}
            onNewParticipant={handleNewParticipant}
          />

        </div>
      </div>
    </div>
  );
}
