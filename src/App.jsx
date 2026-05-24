import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabase.js";

// ─── Theme ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#ffffff",
  surface: "#f7f7f7",
  surfaceHover: "#f0f0f0",
  border: "#e5e5e5",
  borderStrong: "#d0d0d0",
  text: "#111111",
  textSub: "#555555",
  textMuted: "#999999",
  accent: "#111111",
  accentText: "#ffffff",
};

const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const P_COLOR = { Critical: "#e53e3e", High: "#dd6b20", Medium: "#d69e2e", Low: "#38a169" };
const P_BG    = { Critical: "#fff5f5", High: "#fffaf0", Medium: "#fffff0", Low: "#f0fff4" };
const P_TEXT  = { Critical: "#c53030", High: "#c05621", Medium: "#b7791f", Low: "#276749" };

const genId = () => crypto.randomUUID();

const formatDate = (d) => {
  if (!d) return null;
  const dt = new Date(d + "T00:00:00");
  const now = new Date(); now.setHours(0,0,0,0);
  const diff = Math.round((dt - now) / 86400000);
  const label = dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  if (diff < 0) return { label, color: "#e53e3e", tag: "Overdue" };
  if (diff === 0) return { label, color: "#dd6b20", tag: "Today" };
  if (diff <= 3) return { label, color: "#dd6b20", tag: `${diff}d` };
  return { label, color: T.textMuted, tag: `${diff}d` };
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const baseInput = {
  width: "100%", background: "#fff", border: `1px solid ${T.border}`,
  borderRadius: 6, padding: "8px 11px", color: T.text, fontSize: 13,
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  transition: "border-color 0.15s",
};
const btnBlack = {
  background: T.text, color: "#fff", border: "none", borderRadius: 6,
  padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
  fontFamily: "inherit", letterSpacing: "0.02em",
};
const btnOutline = {
  background: "transparent", color: T.textSub, border: `1px solid ${T.border}`,
  borderRadius: 6, padding: "8px 14px", fontSize: 12, cursor: "pointer",
  fontFamily: "inherit",
};

// ─── Priority Badge ───────────────────────────────────────────────────────────
const PBadge = ({ p }) => (
  <span style={{
    fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
    padding: "2px 7px", borderRadius: 4,
    background: P_BG[p], color: P_TEXT[p], border: `1px solid ${P_COLOR[p]}33`,
  }}>{p}</span>
);

// ─── Task Card ───────────────────────────────────────────────────────────────
const TaskCard = ({ task, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task);
  const dateInfo = formatDate(task.deadline);

  const save = () => { onUpdate(draft); setEditing(false); };
  const fi = (field, ph, type = "text") => (
    <input type={type} placeholder={ph} value={draft[field] || ""}
      onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))}
      style={{ ...baseInput, marginBottom: 7 }} />
  );

  return (
    <div style={{
      background: task.done ? T.surface : "#fff",
      border: `1px solid ${T.border}`,
      borderLeft: `3px solid ${task.done ? T.border : P_COLOR[task.priority]}`,
      borderRadius: 8, marginBottom: 8,
      opacity: task.done ? 0.6 : 1, transition: "all 0.18s",
      boxShadow: task.done ? "none" : "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 13px", cursor: "pointer" }}
        onClick={() => !editing && setExpanded(e => !e)}>
        {/* Checkbox */}
        <div onClick={e => { e.stopPropagation(); onUpdate({ ...task, done: !task.done }); }}
          style={{
            width: 17, height: 17, borderRadius: 4, flexShrink: 0, cursor: "pointer", marginTop: 2,
            border: `1.5px solid ${task.done ? "#38a169" : T.borderStrong}`,
            background: task.done ? "#38a169" : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          {task.done && <svg width="9" height="7" viewBox="0 0 9 7"><polyline points="1,3.5 3.5,6 8,1" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: task.done ? T.textMuted : T.text,
              textDecoration: task.done ? "line-through" : "none", wordBreak: "break-word" }}>
              {task.title}
            </span>
            <PBadge p={task.priority} />
          </div>
          {task.type === "delegate" && task.owner && !expanded && (
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>→ {task.owner}</div>
          )}
          {dateInfo && (
            <div style={{ fontSize: 11, color: dateInfo.color, fontWeight: 500, marginTop: 3 }}>
              {dateInfo.label}
              {dateInfo.tag && <span style={{ marginLeft: 4, opacity: 0.7 }}>· {dateInfo.tag}</span>}
            </div>
          )}
        </div>
        {task.done && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(task.id); }}
            title="Delete task"
            style={{ flexShrink: 0, marginTop: 1, background: "none", border: "none",
              cursor: "pointer", padding: "2px 4px", borderRadius: 4,
              color: T.textMuted, fontSize: 13, lineHeight: 1, transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#e53e3e"}
            onMouseLeave={e => e.currentTarget.style.color = T.textMuted}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 3.5h9M5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M10.5 3.5l-.6 6.6a1 1 0 0 1-1 .9H4.1a1 1 0 0 1-1-.9L2.5 3.5"
                stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <svg width="11" height="11" viewBox="0 0 11 11" style={{ flexShrink: 0, opacity: 0.3, marginTop: 4,
          transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}>
          <polyline points="2,4 5.5,7.5 9,4" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      {expanded && (
        <div style={{ padding: "0 13px 13px", borderTop: `1px solid ${T.border}` }}>
          {editing ? (
            <div style={{ paddingTop: 11 }}>
              {fi("title", "Title")}
              {task.type === "delegate" && <>{fi("owner", "Owner")}{fi("action", "Action / instruction")}</>}
              {fi("notes", "Notes")}
              <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
                <select value={draft.priority} onChange={e => setDraft(d => ({ ...d, priority: e.target.value }))}
                  style={{ ...baseInput, flex: 1, marginBottom: 0 }}>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
                <input type="date" value={draft.deadline || ""} onChange={e => setDraft(d => ({ ...d, deadline: e.target.value }))}
                  style={{ ...baseInput, flex: 1, marginBottom: 0 }} />
              </div>
              <div style={{ display: "flex", gap: 7, marginTop: 4 }}>
                <button onClick={save} style={btnBlack}>Save</button>
                <button onClick={() => { setEditing(false); setDraft(task); }} style={btnOutline}>Cancel</button>
                <button onClick={() => onDelete(task.id)} style={{ ...btnOutline, marginLeft: "auto", color: "#e53e3e", borderColor: "#e53e3e44" }}>Delete</button>
              </div>
            </div>
          ) : (
            <div style={{ paddingTop: 10 }}>
              {task.type === "delegate" && task.owner && <MRow label="Owner" value={task.owner} />}
              {task.type === "delegate" && task.action && <MRow label="Action" value={task.action} />}
              {task.notes && <MRow label="Notes" value={task.notes} />}
              {dateInfo && <MRow label="Deadline" value={`${dateInfo.label} · ${dateInfo.tag}`} color={dateInfo.color} />}
              <button onClick={() => setEditing(true)} style={{ ...btnOutline, marginTop: 10, fontSize: 11 }}>Edit</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MRow = ({ label, value, color }) => (
  <div style={{ display: "flex", gap: 10, marginBottom: 5, fontSize: 12 }}>
    <span style={{ color: T.textMuted, minWidth: 56, fontSize: 11, paddingTop: 1 }}>{label}</span>
    <span style={{ color: color || T.textSub }}>{value}</span>
  </div>
);

// ─── Add Form ─────────────────────────────────────────────────────────────────
const AddForm = ({ type, onAdd, onCancel }) => {
  const blank = type === "do"
    ? { type: "do", title: "", priority: "Medium", notes: "", deadline: "", done: false }
    : { type: "delegate", title: "", priority: "Medium", owner: "", action: "", notes: "", deadline: "", done: false };
  const [draft, setDraft] = useState(blank);
  const fi = (field, ph) => (
    <input placeholder={ph} value={draft[field] || ""}
      onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))}
      style={{ ...baseInput, marginBottom: 7 }} />
  );
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 13, marginBottom: 9 }}>
      {fi("title", "Task title…")}
      {type === "delegate" && <>{fi("owner", "Owner")}{fi("action", "Action / instruction")}</>}
      {fi("notes", "Notes (optional)")}
      <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
        <select value={draft.priority} onChange={e => setDraft(d => ({ ...d, priority: e.target.value }))}
          style={{ ...baseInput, flex: 1, marginBottom: 0 }}>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <input type="date" value={draft.deadline || ""}
          onChange={e => setDraft(d => ({ ...d, deadline: e.target.value }))}
          style={{ ...baseInput, flex: 1, marginBottom: 0 }} />
      </div>
      <div style={{ display: "flex", gap: 7 }}>
        <button onClick={() => { if (draft.title) onAdd({ ...draft, id: genId(), done: false }); }} style={btnBlack}>Add</button>
        <button onClick={onCancel} style={btnOutline}>Cancel</button>
      </div>
    </div>
  );
};

// ─── Column ───────────────────────────────────────────────────────────────────
const Column = ({ title, icon, tasks, onUpdate, onDelete, onAdd, type }) => {
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("All");
  const sorted = [...tasks]
    .filter(t => filter === "All" || t.priority === filter)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
    });
  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{title}</div>
            <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {done}/{tasks.length} · {pct}%
            </div>
          </div>
        </div>
        <div style={{ height: 2, background: T.border, borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: T.text, transition: "width 0.4s", borderRadius: 2 }} />
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {["All", ...PRIORITIES].map(p => (
            <button key={p} onClick={() => setFilter(p)} style={{
              fontSize: 10, padding: "3px 8px", borderRadius: 4, cursor: "pointer",
              border: `1px solid ${filter === p ? T.text : T.border}`,
              background: filter === p ? T.text : "transparent",
              color: filter === p ? "#fff" : T.textMuted, fontFamily: "inherit",
              letterSpacing: "0.04em",
            }}>{p}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {adding && <AddForm type={type} onAdd={t => { onAdd(t); setAdding(false); }} onCancel={() => setAdding(false)} />}
        {sorted.map(t => <TaskCard key={t.id} task={t} onUpdate={onUpdate} onDelete={onDelete} />)}
        {sorted.length === 0 && !adding && (
          <div style={{ color: T.textMuted, fontSize: 12, padding: "24px 0", textAlign: "center", letterSpacing: "0.04em" }}>No tasks</div>
        )}
      </div>
      <button onClick={() => setAdding(true)} style={{
        marginTop: 10, width: "100%", background: "transparent",
        border: `1px dashed ${T.borderStrong}`, borderRadius: 7, padding: "9px",
        color: T.textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
      }}>+ Add task</button>
    </div>
  );
};

// ─── Brief Panel ──────────────────────────────────────────────────────────────
const BLANK_BRIEF_TASK = () => ({
  _key: genId(),
  type: "do", title: "", priority: "Medium",
  owner: "", action: "", notes: "", deadline: "", done: false,
});

const BriefPanel = ({ onClose, onApply }) => {
  const [entries, setEntries] = useState([BLANK_BRIEF_TASK()]);

  const update = (key, field, value) =>
    setEntries(es => es.map(e => e._key === key ? { ...e, [field]: value } : e));
  const remove = (key) =>
    setEntries(es => es.length > 1 ? es.filter(e => e._key !== key) : es);
  const addRow = () => setEntries(es => [...es, BLANK_BRIEF_TASK()]);

  const submit = () => {
    const valid = entries.filter(e => e.title.trim());
    if (!valid.length) return;
    onApply(valid.map(({ _key, ...rest }) => ({ ...rest, id: genId() })));
    onClose();
  };

  const fi = (key, field, placeholder, opts = {}) => (
    <input
      type={opts.type || "text"}
      placeholder={placeholder}
      value={entries.find(e => e._key === key)?.[field] || ""}
      onChange={ev => update(key, field, ev.target.value)}
      style={{ ...baseInput, marginBottom: 0, fontSize: 12, ...(opts.style || {}) }}
    />
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 28, width: 620, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: T.text }}>Add Tasks</span>
          <button onClick={onClose} style={{ ...btnOutline, padding: "3px 9px", fontSize: 13 }}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: T.textMuted, margin: "0 0 20px 0" }}>
          Fill in one or more tasks below, then add them all to the board at once.
        </p>
        {entries.map((entry, i) => (
          <div key={entry._key} style={{
            border: `1px solid ${T.border}`,
            borderLeft: `3px solid ${P_COLOR[entry.priority] || T.border}`,
            borderRadius: 9, padding: 14, marginBottom: 12, background: T.surface,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Task {i + 1}</span>
              {entries.length > 1 && (
                <button onClick={() => remove(entry._key)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 16, lineHeight: 1, padding: "0 2px" }}>×</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {["do", "delegate"].map(t => (
                <button key={t} onClick={() => update(entry._key, "type", t)} style={{
                  fontSize: 11, padding: "4px 11px", borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
                  border: `1px solid ${entry.type === t ? T.text : T.border}`,
                  background: entry.type === t ? T.text : "transparent",
                  color: entry.type === t ? "#fff" : T.textMuted,
                }}>{t === "do" ? "✋ Do Myself" : "🤝 Delegate"}</button>
              ))}
            </div>
            <div style={{ marginBottom: 8 }}>{fi(entry._key, "title", "Task title *")}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <select value={entry.priority} onChange={ev => update(entry._key, "priority", ev.target.value)}
                style={{ ...baseInput, flex: 1, fontSize: 12 }}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
              {fi(entry._key, "deadline", "Deadline", { type: "date", style: { flex: 1 } })}
            </div>
            {entry.type === "delegate" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                {fi(entry._key, "owner", "Owner / person responsible")}
                {fi(entry._key, "action", "Specific action or instruction")}
              </div>
            )}
            <div>{fi(entry._key, "notes", "Notes (optional)")}</div>
          </div>
        ))}
        <button onClick={addRow} style={{
          width: "100%", background: "transparent", border: `1px dashed ${T.borderStrong}`,
          borderRadius: 7, padding: "9px", color: T.textMuted, fontSize: 12,
          cursor: "pointer", fontFamily: "inherit", marginBottom: 16,
        }}>+ Add another task</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={submit} style={btnBlack}>
            Add {entries.filter(e => e.title.trim()).length || ""} Task{entries.filter(e => e.title.trim()).length !== 1 ? "s" : ""} to Board
          </button>
          <button onClick={onClose} style={btnOutline}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ─── Excel Upload ─────────────────────────────────────────────────────────────
const ExcelUpload = ({ onClose, onApply }) => {
  const [status, setStatus] = useState("idle");
  const [preview, setPreview] = useState(null);
  const [filename, setFilename] = useState("");
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const norm = rows.map((r, i) => {
          const k = (s) => Object.keys(r).find(k => k.toLowerCase().replace(/[\s_]/g,"").includes(s.toLowerCase().replace(/[\s_]/g,"")));
          const get = (s) => { const key = k(s); return key ? String(r[key]).trim() : ""; };
          const type = get("type") || (get("owner") ? "delegate" : "do");
          const pri = ["Critical","High","Medium","Low"].find(p => get("priority").toLowerCase().includes(p.toLowerCase())) || "Medium";
          return {
            id: genId(), done: false,
            type: type.toLowerCase().includes("deleg") ? "delegate" : "do",
            title: get("title") || get("task") || get("name") || `Task ${i+1}`,
            priority: pri,
            owner: get("owner") || get("assignee") || get("responsible") || "",
            action: get("action") || get("instruction") || get("description") || "",
            notes: get("notes") || get("note") || get("comment") || "",
            deadline: get("deadline") || get("due") || get("duedate") || get("date") || "",
          };
        }).filter(t => t.title);
        setPreview(norm); setStatus("preview");
      } catch { setStatus("error"); }
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 28, width: 560, maxWidth: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: T.text }}>Import from Excel</span>
          <button onClick={onClose} style={{ ...btnOutline, padding: "3px 9px", fontSize: 13 }}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: T.textMuted, margin: "0 0 18px 0" }}>
          Upload an .xlsx or .csv file. Columns recognised: <b>Title, Type, Priority, Owner, Action, Notes, Deadline</b>.
        </p>
        {status === "idle" && (
          <div onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current.click()}
            style={{ border: `2px dashed ${T.borderStrong}`, borderRadius: 10, padding: "32px 20px", textAlign: "center", cursor: "pointer", background: T.surface }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📊</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: T.text, marginBottom: 4 }}>Drop your file here</div>
            <div style={{ fontSize: 12, color: T.textMuted }}>or click to browse — .xlsx, .xls, .csv</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        )}
        {status === "error" && (
          <div>
            <div style={{ color: "#e53e3e", fontSize: 13, marginBottom: 12 }}>Could not parse the file.</div>
            <button onClick={() => setStatus("idle")} style={btnOutline}>Try Again</button>
          </div>
        )}
        {status === "preview" && preview && (
          <div>
            <div style={{ background: "#ebf8ff", border: "1px solid #bee3f8", borderRadius: 7, padding: "9px 13px", marginBottom: 14, fontSize: 12, color: "#2c5282" }}>
              Found <b>{preview.length} tasks</b> in <b>{filename}</b>
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto", marginBottom: 14 }}>
              {preview.map((t, i) => (
                <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${P_COLOR[t.priority] || "#999"}`, borderRadius: 7, padding: "10px 12px", marginBottom: 7 }}>
                  <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: T.textMuted }}>{t.type === "delegate" ? "🤝" : "✋"}</span>
                    <PBadge p={t.priority} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{t.title}</div>
                  {t.owner && <MRow label="Owner" value={t.owner} />}
                  {t.deadline && <MRow label="Deadline" value={t.deadline} />}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { onApply(preview); onClose(); }} style={btnBlack}>Import All</button>
              <button onClick={() => setStatus("idle")} style={btnOutline}>Choose Different File</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Export Modal ─────────────────────────────────────────────────────────────
const ExportModal = ({ onClose, tasks, topFive }) => {
  const [copied, setCopied] = useState(false);

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const priorityOrder = ["Critical", "High", "Medium", "Low"];
  const openDo  = tasks.filter(t => t.type === "do"       && !t.done).sort((a,b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));
  const openDel = tasks.filter(t => t.type === "delegate" && !t.done).sort((a,b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));
  const done    = tasks.filter(t => t.done);
  const filledTop = topFive.filter(p => p.trim());

  const fmtDeadline = (d) => {
    if (!d) return "";
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const buildText = () => {
    const lines = [];
    lines.push(`Work Update — ${today}`);
    lines.push("─".repeat(40));

    if (filledTop.length) {
      lines.push("");
      lines.push("TOP PRIORITY PROJECTS & INITIATIVES");
      filledTop.forEach((p, i) => lines.push(`  ${i+1}. ${p}`));
    }

    if (openDo.length) {
      lines.push("");
      lines.push("WHAT I AM WORKING ON");
      openDo.forEach(t => {
        const deadline = t.deadline ? ` — Due ${fmtDeadline(t.deadline)}` : "";
        lines.push(`  • [${t.priority}] ${t.title}${deadline}`);
        if (t.notes) lines.push(`    Notes: ${t.notes}`);
      });
    }

    if (openDel.length) {
      lines.push("");
      lines.push("DELEGATED & WAITING ON");
      openDel.forEach(t => {
        const deadline = t.deadline ? ` — Due ${fmtDeadline(t.deadline)}` : "";
        lines.push(`  • [${t.priority}] ${t.title}${deadline}`);
        if (t.owner)  lines.push(`    Owner: ${t.owner}`);
        if (t.action) lines.push(`    Action: ${t.action}`);
      });
    }

    if (done.length) {
      lines.push("");
      lines.push("RECENTLY COMPLETED");
      done.forEach(t => lines.push(`  ✓ ${t.title}`));
    }

    lines.push("");
    lines.push("─".repeat(40));
    return lines.join("\n");
  };

  const text = buildText();

  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 28, width: 580, maxWidth: "100%", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: T.text }}>Email Update</span>
          <button onClick={onClose} style={{ ...btnOutline, padding: "3px 9px", fontSize: 13 }}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: T.textMuted, margin: "0 0 16px 0", flexShrink: 0 }}>
          Copy the text below and paste it into an email to your manager.
        </p>

        {/* Text preview */}
        <textarea
          readOnly
          value={text}
          style={{
            ...baseInput, flex: 1, minHeight: 320, resize: "none",
            fontFamily: "monospace", fontSize: 12, lineHeight: 1.7,
            background: T.surface, color: T.text,
          }}
        />

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexShrink: 0 }}>
          <button onClick={copy} style={{ ...btnBlack, display: "flex", alignItems: "center", gap: 7 }}>
            {copied
              ? <><span>✓</span> Copied!</>
              : <><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="white" strokeWidth="1.2"/><path d="M2.5 9H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg> Copy to clipboard</>
            }
          </button>
          <button onClick={onClose} style={btnOutline}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Top Five Priorities ──────────────────────────────────────────────────────
const EMPTY_PRIORITIES = ["", "", "", "", ""];

const TopFive = ({ priorities, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(priorities);
  const filled = priorities.filter(p => p.trim()).length;

  const save = () => { onChange(draft); setEditing(false); };
  const cancel = () => { setDraft(priorities); setEditing(false); };

  return (
    <div style={{ borderBottom: `1px solid ${T.border}`, background: "#fff", padding: "20px 28px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 16, height: 2, background: i === 0 ? T.text : i === 1 ? T.borderStrong : T.border, borderRadius: 1 }} />)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: T.text, letterSpacing: "-0.01em" }}>
                Top Five Priority Projects &amp; Initiatives
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{filled}/5 defined</div>
            </div>
          </div>
          {!editing && (
            <button onClick={() => { setDraft(priorities); setEditing(true); }}
              style={{ ...btnOutline, fontSize: 11, padding: "5px 12px" }}>
              {filled === 0 ? "+ Add priorities" : "Edit"}
            </button>
          )}
        </div>
        {editing ? (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 12 }}>
              {draft.map((val, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: T.text, color: "#fff",
                    fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                  <input value={val}
                    onChange={e => { const next = [...draft]; next[i] = e.target.value; setDraft(next); }}
                    placeholder={`Priority ${i + 1}…`}
                    style={{ ...baseInput, marginBottom: 0 }}
                    onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
                    autoFocus={i === 0} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button onClick={save} style={btnBlack}>Save</button>
              <button onClick={cancel} style={btnOutline}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
            {priorities.map((p, i) => (
              <div key={i} onClick={() => { setDraft(priorities); setEditing(true); }}
                style={{ display: "flex", alignItems: "center", gap: 10,
                  background: p.trim() ? T.surface : "transparent",
                  border: `1px solid ${T.border}`,
                  borderLeft: p.trim() ? `3px solid ${T.text}` : `3px dashed ${T.border}`,
                  borderRadius: 7, padding: "10px 12px", cursor: "pointer", minHeight: 44 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%",
                  background: p.trim() ? T.text : T.border, color: "#fff", fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                {p.trim()
                  ? <span style={{ fontSize: 13, fontWeight: 500, color: T.text, lineHeight: 1.3 }}>{p}</span>
                  : <span style={{ fontSize: 12, color: T.textMuted, fontStyle: "italic" }}>Not set</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [topFive, setTopFive] = useState(EMPTY_PRIORITIES);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | saving | saved | error

  // ── Load data from Supabase on mount ────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        // Load tasks
        const { data: taskRows, error: taskErr } = await supabase
          .from("tasks")
          .select("*")
          .order("created_at", { ascending: false });
        if (taskErr) throw taskErr;
        setTasks(taskRows || []);

        // Load top five
        const { data: prefRows } = await supabase
          .from("preferences")
          .select("value")
          .eq("key", "top_five")
          .single();
        if (prefRows?.value) setTopFive(prefRows.value);
      } catch (e) {
        console.error("Load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Sync helpers ─────────────────────────────────────────────────────────────
  const flash = (status) => {
    setSyncStatus(status);
    if (status === "saved") setTimeout(() => setSyncStatus("idle"), 2000);
  };

  // ── Task operations ──────────────────────────────────────────────────────────
  const addTask = async (task) => {
    setTasks(ts => [task, ...ts]);
    flash("saving");
    const { error } = await supabase.from("tasks").insert([{
      id: task.id, type: task.type, title: task.title,
      priority: task.priority, owner: task.owner || null,
      action: task.action || null, notes: task.notes || null,
      deadline: task.deadline || null, done: task.done,
    }]);
    flash(error ? "error" : "saved");
  };

  const addTasks = async (newTasks) => {
    setTasks(ts => [...newTasks, ...ts]);
    flash("saving");
    const rows = newTasks.map(t => ({
      id: t.id, type: t.type, title: t.title,
      priority: t.priority, owner: t.owner || null,
      action: t.action || null, notes: t.notes || null,
      deadline: t.deadline || null, done: t.done,
    }));
    const { error } = await supabase.from("tasks").insert(rows);
    flash(error ? "error" : "saved");
  };

  const updateTask = async (updated) => {
    setTasks(ts => ts.map(t => t.id === updated.id ? updated : t));
    flash("saving");
    const { error } = await supabase.from("tasks").update({
      type: updated.type, title: updated.title,
      priority: updated.priority, owner: updated.owner || null,
      action: updated.action || null, notes: updated.notes || null,
      deadline: updated.deadline || null, done: updated.done,
    }).eq("id", updated.id);
    flash(error ? "error" : "saved");
  };

  const deleteTask = async (id) => {
    setTasks(ts => ts.filter(t => t.id !== id));
    flash("saving");
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    flash(error ? "error" : "saved");
  };

  // ── Top Five save ────────────────────────────────────────────────────────────
  const saveTopFive = async (vals) => {
    setTopFive(vals);
    flash("saving");
    const { error } = await supabase.from("preferences").upsert(
      { key: "top_five", value: vals },
      { onConflict: "key" }
    );
    flash(error ? "error" : "saved");
  };

  const doTasks = tasks.filter(t => t.type === "do");
  const delTasks = tasks.filter(t => t.type === "delegate");
  const open = tasks.filter(t => !t.done).length;
  const crit = tasks.filter(t => !t.done && t.priority === "Critical").length;
  const delegOpen = delTasks.filter(t => !t.done).length;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif", color: T.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${T.border}`, background: "#fff", padding: "0 28px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, background: T.text, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="1" width="5" height="5" rx="1" fill="#fff"/><rect x="8" y="1" width="5" height="5" rx="1" fill="#fff"/><rect x="1" y="8" width="5" height="5" rx="1" fill="#fff"/><rect x="8" y="8" width="5" height="5" rx="1" fill="#fff" opacity="0.4"/></svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em" }}>Ash To Do</span>
            {/* Sync indicator */}
            {syncStatus === "saving" && <span style={{ fontSize: 11, color: T.textMuted }}>Saving…</span>}
            {syncStatus === "saved"  && <span style={{ fontSize: 11, color: "#38a169" }}>✓ Saved</span>}
            {syncStatus === "error"  && <span style={{ fontSize: 11, color: "#e53e3e" }}>⚠ Sync error</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setModal("export")} style={{ ...btnOutline, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span>📧</span> Email Update
            </button>
            <button onClick={() => setModal("excel")} style={{ ...btnOutline, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span>📊</span> Import Excel
            </button>
            <button onClick={() => setModal("brief")} style={{ ...btnBlack, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span>✏️</span> Brief
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: T.textMuted, fontSize: 14 }}>
          Loading your tasks…
        </div>
      ) : (
        <>
          <TopFive priorities={topFive} onChange={saveTopFive} />

          {/* Stats bar */}
          <div style={{ borderBottom: `1px solid ${T.border}`, background: T.surface, padding: "10px 28px" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 24, alignItems: "center" }}>
              <StatPill label="Open" value={open} />
              <StatPill label="Critical" value={crit} color="#e53e3e" />
              <StatPill label="Delegated open" value={delegOpen} />
              <StatPill label="Done" value={tasks.filter(t=>t.done).length} color="#38a169" />
            </div>
          </div>

          {/* Board */}
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 28px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}>
              <Column title="Do Myself" icon="✋" type="do" tasks={doTasks} onUpdate={updateTask} onDelete={deleteTask} onAdd={addTask} />
              <Column title="Delegate" icon="🤝" type="delegate" tasks={delTasks} onUpdate={updateTask} onDelete={deleteTask} onAdd={addTask} />
            </div>
          </div>
        </>
      )}

      {modal === "export" && <ExportModal onClose={() => setModal(null)} tasks={tasks} topFive={topFive} />}
      {modal === "brief"  && <BriefPanel  onClose={() => setModal(null)} onApply={addTasks} />}
      {modal === "excel"  && <ExcelUpload onClose={() => setModal(null)} onApply={addTasks} />}
    </div>
  );
}

const StatPill = ({ label, value, color }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
    <span style={{ fontSize: 18, fontWeight: 700, color: color || T.text }}>{value}</span>
    <span style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
  </div>
);
