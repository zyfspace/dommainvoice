"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { saveDefaultRemarksAction } from "@/app/actions";
import { Icon } from "./Icon";
import { Rich, escapeText, richToHtml } from "./Rich";

type Line = { key: number; html: string };

let lineKey = 0;
const toLines = (text: string): Line[] => {
  const ls = text.split("\n").filter((l) => l.trim());
  return (ls.length ? ls : [""]).map((l) => ({ key: ++lineKey, html: richToHtml(l) }));
};
const join = (ls: Line[]) => ls.map((l) => l.html.trim()).filter((h) => domText(h)).join("\n");
const domText = (html: string) => html.replace(/<[^>]*>/g, "").trim();

/** DOM contentEditable → teks dengan tag <b>/<i>/<u> saja. */
function serialize(node: globalThis.Node): string {
  let out = "";
  node.childNodes.forEach((c) => {
    if (c.nodeType === 3) out += escapeText((c.textContent ?? "").replace(/ /g, " "));
    else if (c instanceof HTMLElement) {
      if (c.tagName === "BR") return;
      const s = c.style;
      const tags: string[] = [];
      if (/^(B|STRONG)$/.test(c.tagName) || /bold|[6-9]00/.test(s.fontWeight)) tags.push("b");
      if (/^(I|EM)$/.test(c.tagName) || s.fontStyle === "italic") tags.push("i");
      if (c.tagName === "U" || s.textDecorationLine.includes("underline") || s.textDecoration.includes("underline"))
        tags.push("u");
      const inner = serialize(c);
      out += tags.map((t) => `<${t}>`).join("") + inner + [...tags].reverse().map((t) => `</${t}>`).join("");
    }
  });
  // Rapikan tag kosong & tag bersebelahan: "<b>a</b><b>b</b>" → "<b>ab</b>"
  let prev;
  do {
    prev = out;
    out = out.replace(/<(b|i|u)><\/\1>/g, "").replace(/<\/(b|i|u)><\1>/g, "");
  } while (out !== prev);
  return out;
}

function caretAtEnd(el: HTMLElement) {
  el.focus();
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(r);
}

const FORMAT: Record<string, string> = { b: "bold", i: "italic", u: "underline" };

function LineInput({
  html,
  onChange,
  onEnter,
  onRemoveEmpty,
  register,
}: {
  html: string;
  onChange: (html: string) => void;
  onEnter: () => void;
  onRemoveEmpty: () => void;
  register: (el: HTMLDivElement | null) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && serialize(el) !== html) el.innerHTML = html;
  }, [html]);

  return (
    <div
      ref={(el) => {
        ref.current = el;
        register(el);
      }}
      className="rich-line"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      onInput={(e) => onChange(serialize(e.currentTarget))}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain").replace(/\s*\n\s*/g, " "));
      }}
      onKeyDown={(e) => {
        const k = e.key.toLowerCase();
        if ((e.ctrlKey || e.metaKey) && FORMAT[k]) {
          e.preventDefault();
          document.execCommand(FORMAT[k]);
          onChange(serialize(e.currentTarget));
        } else if (e.key === "Enter") {
          e.preventDefault();
          onEnter();
        } else if (e.key === "Backspace" && !e.currentTarget.textContent) {
          e.preventDefault();
          onRemoveEmpty();
        }
      }}
    />
  );
}

/** Remarks per baris dengan Ctrl+B / Ctrl+I / Ctrl+U, plus simpan sebagai default. */
export function RemarksEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [lines, setLines] = useState(() => toLines(value));
  const [editing, setEditing] = useState(false);
  const [asDefault, setAsDefault] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>();
  const [saving, start] = useTransition();
  const els = useRef(new Map<number, HTMLDivElement>());
  const focusKey = useRef<number | null>(null);

  useEffect(() => {
    if (focusKey.current == null) return;
    const el = els.current.get(focusKey.current);
    focusKey.current = null;
    if (el) caretAtEnd(el);
  });

  function commit(next: Line[]) {
    setLines(next);
    onChange(join(next));
  }
  function addAfter(key: number | null) {
    const line = { key: ++lineKey, html: "" };
    const i = key == null ? lines.length : lines.findIndex((l) => l.key === key) + 1;
    focusKey.current = line.key;
    commit([...lines.slice(0, i), line, ...lines.slice(i)]);
  }
  function remove(key: number, focusPrev: boolean) {
    const i = lines.findIndex((l) => l.key === key);
    const next = lines.filter((l) => l.key !== key);
    if (!next.length) next.push({ key: ++lineKey, html: "" });
    if (focusPrev) focusKey.current = next[Math.max(0, i - 1)].key;
    commit(next);
  }
  function save() {
    setMsg(undefined);
    const notes = join(lines);
    setLines(toLines(notes));
    if (!asDefault) return setEditing(false);
    start(async () => {
      const res = await saveDefaultRemarksAction(notes);
      setMsg(res ?? undefined);
      if (!res?.error) {
        setEditing(false);
        setAsDefault(false);
      }
    });
  }

  if (!editing)
    return (
      <>
        <div className="rich-view">
          {lines.some((l) => domText(l.html)) ? (
            lines.map((l) => (
              <div key={l.key}>
                <Rich text={l.html} />
              </div>
            ))
          ) : (
            <span className="hint">Belum ada remarks.</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn sm" onClick={() => setEditing(true)}>
            <Icon n="edit" /> Edit
          </button>
          {msg?.ok && <span className="hint">{msg.ok}</span>}
        </div>
      </>
    );

  const fmt = (k: string) => (
    <button
      type="button"
      className="ib"
      title={`${FORMAT[k]} (Ctrl+${k.toUpperCase()})`}
      onMouseDown={(e) => {
        e.preventDefault();
        document.execCommand(FORMAT[k]);
        const el = document.activeElement;
        const line = lines.find((l) => els.current.get(l.key) === el);
        if (line && el instanceof HTMLElement)
          commit(lines.map((l) => (l.key === line.key ? { ...l, html: serialize(el) } : l)));
      }}
      style={{ fontWeight: k === "b" ? 700 : 500, fontStyle: k === "i" ? "italic" : undefined, textDecoration: k === "u" ? "underline" : undefined }}
    >
      {k.toUpperCase()}
    </button>
  );

  return (
    <>
      <div style={{ display: "flex", gap: 2, marginBottom: 6 }}>
        {fmt("b")}
        {fmt("i")}
        {fmt("u")}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {lines.map((l) => (
          <div key={l.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <LineInput
              html={l.html}
              register={(el) => (el ? els.current.set(l.key, el) : els.current.delete(l.key))}
              onChange={(html) => commit(lines.map((x) => (x.key === l.key ? { ...x, html } : x)))}
              onEnter={() => addAfter(l.key)}
              onRemoveEmpty={() => lines.length > 1 && remove(l.key, true)}
            />
            <button type="button" className="ib" title="Hapus baris" onClick={() => remove(l.key, false)}>
              <Icon n="trash" />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="btn sm" onClick={() => addAfter(null)}>
          <Icon n="plus" /> Tambah baris
        </button>
        <label style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto", fontSize: 12, color: "var(--ink)" }}>
          <input type="checkbox" checked={asDefault} onChange={(e) => setAsDefault(e.target.checked)} style={{ height: "auto", width: "auto", padding: 0 }} />
          Jadikan default
        </label>
        <button type="button" className="btn sm pri" onClick={save} disabled={saving}>
          {saving ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
      {msg?.error && <div className="err" style={{ marginTop: 8, marginBottom: 0 }}>{msg.error}</div>}
      <span className="hint" style={{ marginTop: 4 }}>
        Enter untuk baris baru. Blok teks lalu Ctrl+B tebal, Ctrl+I miring, Ctrl+U garis bawah.
      </span>
    </>
  );
}
