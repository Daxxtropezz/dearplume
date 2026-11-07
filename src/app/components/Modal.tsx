"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal({ title, eyebrow, onClose, children, wide = false }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return (
    <div className="modal-layer" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className={`dialog-card ${wide ? "dialog-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog-header">
          <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}
