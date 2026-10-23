"use client";

/** A4 landscape (mm); margin atas/bawah halaman = padding .inv. */
const PAGE_W = 297;
const PAGE_H = 210;
const TOP = 11;
const BOTTOM = 10;

/**
 * Render kertas dokumen (.inv) menjadi PDF A4 landscape lalu langsung diunduh dengan `fileName`.
 * Kalau lebih dari 1 halaman, potongan halaman jatuh di antara baris tabel / blok,
 * jadi blok pembayaran & tanda tangan tidak pernah terpotong.
 */
export async function downloadPdf(source: HTMLElement, fileName: string) {
  const [{ domToCanvas }, { jsPDF }] = await Promise.all([import("modern-screenshot"), import("jspdf")]);
  await document.fonts.ready;

  // Render salinan berukuran asli di luar layar: pratinjau di-zoom oleh PaperFit (transform).
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;pointer-events:none";
  const el = source.cloneNode(true) as HTMLElement;
  host.appendChild(el);
  document.body.appendChild(host);
  let canvas: HTMLCanvasElement;
  let cuts: number[];
  try {
    canvas = await domToCanvas(el, {
      scale: 3,
      backgroundColor: "#ffffff",
      width: el.offsetWidth,
      height: el.offsetHeight,
    });
    // Titik potong yang aman: bawah tiap baris tabel & tiap blok langsung di bawah .inv.
    const k = canvas.width / el.offsetWidth;
    const top0 = el.getBoundingClientRect().top;
    cuts = [...el.querySelectorAll<HTMLElement>(":scope > *, tbody tr, tfoot tr")]
      .map((n) => (n.getBoundingClientRect().bottom - top0) * k)
      .sort((a, b) => a - b);
  } finally {
    host.remove();
  }

  const pxPerMm = canvas.width / PAGE_W;
  const pageH = PAGE_H * pxPerMm;
  const top = TOP * pxPerMm;
  const bottom = BOTTOM * pxPerMm;
  const contentEnd = cuts[cuts.length - 1] ?? canvas.height;

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  let y = 0;
  let page = 0;
  while (y < contentEnd - 1) {
    const offset = page ? top : 0;
    const room = pageH - offset - bottom;
    let end: number;
    // Sisa muat: halaman terakhir berhenti di bawah konten (+ margin), bukan di tepi kanvas.
    if (contentEnd - y <= room) end = Math.min(canvas.height - 2, contentEnd + bottom, y + pageH - offset);
    else {
      const fit = cuts.filter((c) => c > y + 1 && c <= y + room);
      end = fit.length ? fit[fit.length - 1] : y + room;
    }

    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = Math.floor(end - y);
    const ctx = slice.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);

    if (page) pdf.addPage();
    pdf.addImage(slice, "PNG", 0, offset / pxPerMm, PAGE_W, slice.height / pxPerMm, undefined, "FAST");
    y = end;
    page++;
  }
  pdf.save(`${fileName}.pdf`);
}
