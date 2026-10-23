"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** Mengecilkan kertas A4 landscape (297mm) agar pas dengan lebar kontainer; cetak tidak terpengaruh. */
export function PaperFit({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, height: 0 });

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const run = () => {
      const scale = Math.min(1, o.clientWidth / i.offsetWidth);
      setFit({ scale, height: i.offsetHeight * scale });
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="paper-fit" style={fit.height ? { height: fit.height } : undefined}>
      <div ref={inner} className="paper-scale" style={{ transform: `scale(${fit.scale})` }}>
        {children}
      </div>
    </div>
  );
}
