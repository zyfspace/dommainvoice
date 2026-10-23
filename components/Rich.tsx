import type { ReactNode } from "react";

/**
 * Teks berformat satu baris: hanya <b>, <i>, <u>; selain itu teks biasa (&lt; &gt; &amp; di-escape).
 * Format lama "**tebal**" tetap dibaca sebagai <b>.
 */
type Tag = "b" | "i" | "u";
type Node = string | { tag: Tag; children: Node[] };

const TAG_RE = /<(\/?)(b|i|u)>/g;

const unescape = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
export const escapeText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Ubah "**x**" lama menjadi "<b>x</b>". */
const legacy = (s: string) => s.split("**").map((p, i) => (i % 2 ? `<b>${p}</b>` : p)).join("");

function parse(line: string): Node[] {
  const root: Node[] = [];
  const stack: { tag: Tag; children: Node[] }[] = [];
  const top = () => (stack.length ? stack[stack.length - 1].children : root);
  const src = legacy(line);
  let last = 0;
  for (const m of src.matchAll(TAG_RE)) {
    if (m.index > last) top().push(unescape(src.slice(last, m.index)));
    last = m.index + m[0].length;
    const tag = m[2] as Tag;
    if (!m[1]) {
      const el = { tag, children: [] };
      top().push(el);
      stack.push(el);
    } else {
      const at = stack.map((s) => s.tag).lastIndexOf(tag);
      if (at >= 0) stack.length = at;
    }
  }
  if (last < src.length) top().push(unescape(src.slice(last)));
  return root;
}

function render(nodes: Node[]): ReactNode[] {
  return nodes.map((n, i) => {
    if (typeof n === "string") return <span key={i}>{n}</span>;
    const T = n.tag;
    return <T key={i}>{render(n.children)}</T>;
  });
}

/** Normalisasi ke HTML aman (hanya tag yang diizinkan). */
export function richToHtml(line: string): string {
  const out = (nodes: Node[]): string =>
    nodes.map((n) => (typeof n === "string" ? escapeText(n) : `<${n.tag}>${out(n.children)}</${n.tag}>`)).join("");
  return out(parse(line));
}

export function Rich({ text }: { text: string }) {
  return <>{render(parse(text))}</>;
}
