// UI-only changes; logic unchanged. New logic added in ProgressView only: participant ID, reset, topic table, export.
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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

const TOPIC_ACCENTS = [WARM, TERRA, COOL, DIM, "#b06820", "#c8880a", "#1fa89a", "#a84020", "#b84020"];

// ── Shared topic-stats hook ───────────────────────────────────────────────────
// Computes per-category tallies from attempts + sentences.csv + categories.csv.
// Attempts without sentence_id are skipped.
// Attempts with a sentence_id that has no category_id are grouped as "Без темы".
// RULE: attempts format is never modified here.
function useTopicStats(attempts, sentences, categories) {
  return useMemo(() => {
    if (!categories.length && !sentences.length) return [];

    // sentence_id → category_id  (empty category_id → undefined → "no_topic" bucket)
    const sentCatMap = {};
    sentences.forEach(s => {
      if (s.id == null || s.id === "") return;
      const catId = (s.category_id != null && s.category_id !== "")
        ? String(s.category_id)
        : null;              // null means sentence exists but no category assigned
      sentCatMap[String(s.id)] = catId;
    });

    // category_id → display name
    const catNameMap = {};
    categories.forEach(c => {
      const key = String(c.id ?? "");
      if (key) catNameMap[key] = c.name_ru || c.slug || key;
      if (c.slug) catNameMap[String(c.slug)] = c.name_ru || c.slug;
    });

    const allCatIds = categories.map(c => String(c.id ?? "")).filter(Boolean);

    // seed known categories
    const tally = {};
    allCatIds.forEach(id => {
      tally[id] = { correct:0, total:0, timeSum:0, timeCount:0 };
    });
    // bucket for sentences that exist but have no category
    const NO_TOPIC_KEY = "__no_topic__";
    tally[NO_TOPIC_KEY] = { correct:0, total:0, timeSum:0, timeCount:0 };

    attempts.forEach(a => {
      // skip if no sentence reference at all
      if (a.sentence_id == null || a.sentence_id === "") return;

      const sid = String(a.sentence_id);

      // sentence not in CSV → skip entirely (we cannot map it)
      if (!(sid in sentCatMap)) return;

      const catId = sentCatMap[sid] ?? NO_TOPIC_KEY;
      if (!tally[catId]) tally[catId] = { correct:0, total:0, timeSum:0, timeCount:0 };

      tally[catId].total += 1;
      if (a.correct === true || a.correct === "true") tally[catId].correct += 1;
      if (a.time_ms && Number(a.time_ms) > 0) {
        tally[catId].timeSum   += Number(a.time_ms);
        tally[catId].timeCount += 1;
      }
    });

    const rows = allCatIds.map((catId, i) => ({
      catId,
      name:    catNameMap[catId] || catId,
      correct: tally[catId].correct,
      total:   tally[catId].total,
      avgSec:  tally[catId].timeCount > 0 ? tally[catId].timeSum / tally[catId].timeCount / 1000 : null,
      accent:  TOPIC_ACCENTS[i % TOPIC_ACCENTS.length],
      isNoTopic: false,
    }));

    // only append "Без темы" row if there are actual orphan attempts
    const noTopicTally = tally[NO_TOPIC_KEY];
    if (noTopicTally.total > 0) {
      rows.push({
        catId:   NO_TOPIC_KEY,
        name:    "Без темы",
        correct: noTopicTally.correct,
        total:   noTopicTally.total,
        avgSec:  noTopicTally.timeCount > 0 ? noTopicTally.timeSum / noTopicTally.timeCount / 1000 : null,
        accent:  "#a08060",
        isNoTopic: true,
      });
    }

    return rows.sort((a, b) => b.total - a.total);
  }, [attempts, sentences, categories]);
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────
// Replaces window.confirm for a safer, styled in-page modal.
function ConfirmModal({ title, message, confirmLabel, confirmColor, onConfirm, onCancel }) {
  const overlayRef = useRef(null);

  // close on overlay click
  const handleOverlay = (e) => {
    if (e.target === overlayRef.current) onCancel();
  };

  // close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const cc = confirmColor || DIM;
  const ccRgb = hexRgb(cc);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      style={{
        position:"fixed", inset:0, zIndex:200,
        background:"rgba(20,12,4,.45)",
        backdropFilter:"blur(4px)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"1.5rem",
      }}
    >
      <div style={{
        background:"#fff", borderRadius:16,
        border:"1px solid rgba(180,130,40,.22)",
        boxShadow:"0 16px 60px rgba(40,20,4,.18)",
        padding:"1.6rem 1.75rem 1.4rem",
        maxWidth:380, width:"100%",
        display:"flex", flexDirection:"column", gap:"1rem",
        animation:"pv-pop .18s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* title */}
        <div style={{ display:"flex", alignItems:"center", gap:".65rem" }}>
          <div style={{
            width:34, height:34, borderRadius:9,
            background:`rgba(${ccRgb},.1)`,
            border:`1px solid rgba(${ccRgb},.2)`,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>
            <AlertTriangle size={16} style={{ color:cc }} />
          </div>
          <h3 style={{ fontSize:".95rem", fontWeight:800, color:"#2c2010", margin:0, lineHeight:1.25 }}>
            {title}
          </h3>
        </div>

        {/* message */}
        <p style={{ fontSize:".83rem", color:"#7a5a30", lineHeight:1.65, margin:0 }}>
          {message}
        </p>

        {/* divider */}
        <div style={{ height:1, background:"rgba(180,130,40,.14)" }} />

        {/* buttons */}
        <div style={{ display:"flex", gap:".55rem", justifyContent:"flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding:".55rem 1.1rem", minHeight:40, borderRadius:99,
              background:"rgba(180,130,40,.07)", border:"1px solid rgba(180,130,40,.24)",
              color:"#7a5a30", fontSize:".82rem", fontWeight:600, cursor:"pointer",
              transition:"background .18s, border-color .18s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background="rgba(180,130,40,.13)"; }}
            onMouseLeave={e => { e.currentTarget.style.background="rgba(180,130,40,.07)"; }}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding:".55rem 1.2rem", minHeight:40, borderRadius:99,
              background:`rgba(${ccRgb},.1)`, border:`1px solid rgba(${ccRgb},.32)`,
              color:cc, fontSize:".82rem", fontWeight:700, cursor:"pointer",
              transition:"background .18s, border-color .18s, box-shadow .18s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background=`rgba(${ccRgb},.18)`; e.currentTarget.style.boxShadow=`0 4px 16px rgba(${ccRgb},.18)`; }}
            onMouseLeave={e => { e.currentTarget.style.background=`rgba(${ccRgb},.1)`;  e.currentTarget.style.boxShadow="none"; }}
          >
            {confirmLabel || "Подтвердить"}
          </button>
        </div>
      </div>
    </div>
  );
}

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

// ── TopicAccuracyBlock (bar rows) ─────────────────────────────────────────────
function TopicAccuracyBlock({ topicStats }) {
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
        {topicStats.map(({ catId, name, correct, total, accent, isNoTopic }) => {
          const p     = total > 0 ? Math.round((correct / total) * 100) : null;
          const muted = total === 0;
          const rgb   = hexRgb(accent);
          return (
            <div key={catId} style={{ display:"grid", gridTemplateColumns:"1fr 3fr 3.5rem", alignItems:"center", gap:".85rem" }}>
              <span style={{
                fontSize:".78rem", fontWeight: isNoTopic ? 400 : 500,
                color: muted ? "rgba(180,130,40,.3)" : isNoTopic ? "#a08060" : "#6b5030",
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                fontStyle: isNoTopic ? "italic" : "normal",
              }}>
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

// ── TopicTable ────────────────────────────────────────────────────────────────
// Shows: Topic | mini-bar | Attempts | Correct | Accuracy% | Avg time(s)
function TopicTable({ topicStats }) {
  if (!topicStats.length) return null;

  // find max total for proportional mini-bar width
  const maxTotal = Math.max(...topicStats.map(r => r.total), 1);

  const COL = {
    head: {
      fontSize:".63rem", fontWeight:700, color:"#a08060",
      letterSpacing:".09em", textTransform:"uppercase",
      padding:".5rem .65rem", textAlign:"left",
      borderBottom:"2px solid rgba(180,130,40,.18)",
      background:"rgba(200,136,10,.035)",
      whiteSpace:"nowrap",
    },
    cell: {
      fontSize:".78rem", color:"#6b5030",
      padding:".55rem .65rem",
      borderBottom:"1px solid rgba(180,130,40,.08)",
      verticalAlign:"middle",
    },
    mono: {
      fontSize:".78rem", fontFamily:"'JetBrains Mono',monospace", fontWeight:700,
      padding:".55rem .65rem",
      borderBottom:"1px solid rgba(180,130,40,.08)",
      textAlign:"right", verticalAlign:"middle",
    },
  };

  return (
    <div>
      <SectionHead>Детальная таблица по темам</SectionHead>
      <div style={{
        background:"#fff", border:"1px solid rgba(180,130,40,.18)",
        borderRadius:12, overflow:"hidden",
        boxShadow:"0 1px 6px rgba(120,80,20,.07)",
      }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:480 }}>
            <thead>
              <tr>
                <th style={{ ...COL.head, width:"28%" }}>Тема</th>
                {/* mini bar column — visual only */}
                <th style={{ ...COL.head, width:"18%", textAlign:"center" }}>График</th>
                <th style={{ ...COL.head, textAlign:"right" }}>Попытки</th>
                <th style={{ ...COL.head, textAlign:"right" }}>Верно</th>
                <th style={{ ...COL.head, textAlign:"right" }}>Точность</th>
                <th style={{ ...COL.head, textAlign:"right" }}>Ср. время</th>
              </tr>
            </thead>
            <tbody>
              {topicStats.map((r, i) => {
                const p        = pct(r.correct, r.total);
                const noData   = r.total === 0;
                const pColor   = p === null ? "#b09070" : p >= 70 ? COOL : p >= 50 ? WARM : DIM;
                const barW     = noData ? 0 : Math.round((r.total / maxTotal) * 100);
                const rgb      = hexRgb(r.accent);
                const rowBg    = i % 2 === 0 ? "transparent" : "rgba(180,130,40,.02)";

                return (
                  <tr key={r.catId} style={{ background: rowBg }}>
                    {/* name */}
                    <td style={{
                      ...COL.cell, fontWeight: r.isNoTopic ? 400 : 600,
                      color: noData ? "#b09070" : r.isNoTopic ? "#a08060" : "#2c2010",
                      fontStyle: r.isNoTopic ? "italic" : "normal",
                    }}>
                      {r.name}
                    </td>

                    {/* mini bar — attempts volume (UI-only visualization) */}
                    <td style={{ ...COL.cell, padding:".55rem .65rem" }}>
                      <div style={{
                        height:6, borderRadius:99,
                        background:"rgba(180,130,40,.1)",
                        overflow:"hidden",
                        minWidth:40,
                      }}>
                        <div style={{
                          height:"100%", borderRadius:99,
                          background: noData
                            ? "transparent"
                            : `linear-gradient(90deg,${r.accent},rgba(${rgb},.35))`,
                          width:`${barW}%`,
                          transition:"width .55s cubic-bezier(0.16,1,0.3,1)",
                        }} />
                      </div>
                    </td>

                    {/* attempts */}
                    <td style={{ ...COL.mono, color: noData ? "#b09070" : "#6b5030" }}>
                      {r.total || "—"}
                    </td>

                    {/* correct */}
                    <td style={{ ...COL.mono, color: noData ? "#b09070" : "#6b5030" }}>
                      {noData ? "—" : r.correct}
                    </td>

                    {/* accuracy */}
                    <td style={{ ...COL.mono, color: pColor, fontWeight:700 }}>
                      {noData ? (
                        <span style={{ fontSize:".68rem", fontWeight:400, color:"#c0a080" }}>нет данных</span>
                      ) : `${p}%`}
                    </td>

                    {/* avg time */}
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

// ── ParticipantBlock ──────────────────────────────────────────────────────────
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
            className="pv-btn"
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
            className="pv-btn-danger"
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
            className="pv-btn"
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

// ── ExportBlock ───────────────────────────────────────────────────────────────
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
            className="pv-btn"
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
            className="pv-btn-cool"
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
  const [refreshKey, setRefreshKey]       = useState(0);
  const [sentences, setSentences]         = useState([]);
  const [categories, setCategories]       = useState([]);
  const [participantId, setParticipantId] = useState(() => getOrCreateParticipantId());

  // modal state: null | "reset_progress" | "new_participant"
  const [modal, setModal] = useState(null);

  useEffect(() => {
    loadCsv("/data/sentences.csv").then(setSentences).catch(() => {});
    loadCsv("/data/categories.csv").then(setCategories).catch(() => {});
  }, []);

  // attempts format is never modified — loaded as-is
  const attempts = useMemo(() => loadAttempts(), [refreshKey]);

  // single shared topic stats computation — used by both bar block and table
  const topicStats = useTopicStats(attempts, sentences, categories);

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

  // ── reset handlers (open modal instead of window.confirm) ───────────────────
  const handleResetProgress   = useCallback(() => setModal("reset_progress"),   []);
  const handleNewParticipant  = useCallback(() => setModal("new_participant"),   []);

  const handleConfirmModal = useCallback(() => {
    if (modal === "reset_progress") {
      try { localStorage.removeItem(LS_KEY); } catch {}
      setRefreshKey(k => k + 1);
    } else if (modal === "new_participant") {
      try {
        localStorage.removeItem(LS_KEY);
        ["qazaqai_active_category", "qazaqai_active_topics", "qazaqai_selected_topics",
         "qazaqai_categories" /* onboarding selection */].forEach(k => {
          try { localStorage.removeItem(k); } catch {}
        });
        const newId = genParticipantId();
        localStorage.setItem(LS_PARTICIPANT_ID, newId);
        setParticipantId(newId);
      } catch {}
      setRefreshKey(k => k + 1);
    }
    setModal(null);
  }, [modal]);

  const MODAL_CONFIGS = {
    reset_progress: {
      title:        "Сбросить прогресс?",
      message:      "Все данные о попытках будут удалены. ID участника сохранится — это действие нельзя отменить.",
      confirmLabel: "Да, удалить попытки",
      confirmColor: DIM,
    },
    new_participant: {
      title:        "Начать заново?",
      message:      "Попытки, выбор тем и настройки будут удалены. Будет сгенерирован новый ID участника. Это действие нельзя отменить.",
      confirmLabel: "Да, новый участник",
      confirmColor: TERRA,
    },
  };

  return (
    <div style={{ minHeight:"100dvh", background:"#faf7f2", display:"flex", flexDirection:"column" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pv-pop {
          from { opacity:0; transform: scale(.94) translateY(6px); }
          to   { opacity:1; transform: scale(1)   translateY(0);   }
        }
        .spin { animation: spin .85s linear infinite; }
        .pv-btn:focus-visible        { outline: 2px solid rgba(200,136,10,.5);   outline-offset: 2px; }
        .pv-btn-danger:focus-visible { outline: 2px solid rgba(184,64,32,.45);   outline-offset: 2px; }
        .pv-btn-cool:focus-visible   { outline: 2px solid rgba(31,168,154,.45);  outline-offset: 2px; }
      `}</style>

      {/* ── Confirm modal (portal-free, rendered above everything) ─────────── */}
      {modal && (
        <ConfirmModal
          {...MODAL_CONFIGS[modal]}
          onConfirm={handleConfirmModal}
          onCancel={() => setModal(null)}
        />
      )}

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
              className="pv-btn"
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

          {/* Topic bars — uses shared topicStats */}
          <TopicAccuracyBlock topicStats={topicStats} />

          {/* Topic table — uses shared topicStats */}
          <TopicTable topicStats={topicStats} />

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
