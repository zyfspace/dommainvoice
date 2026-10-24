import { Icon } from "@/components/Icon";

// Satu baris catatan = satu poin revisi. Penanda list yang diketik manual ("-", "1.", "•") dibuang.
function points(notes: string) {
  return notes
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}

export function RevisionNotes({ title, notes, meta }: { title: string; notes: string | null; meta?: string }) {
  const list = notes ? points(notes) : [];
  return (
    <div className="banner dark rev">
      <Icon n="alert" s={18} />
      <div className="rev-body">
        <div className="rev-head">
          <b>{title}</b>
          {meta && <small>{meta}</small>}
        </div>
        {list.length > 0 && (
          <ol className="rev-list">
            {list.map((p, i) => (
              <li key={i}>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
