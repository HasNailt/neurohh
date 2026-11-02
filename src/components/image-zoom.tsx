import type { ReactNode } from "react";

export function ImageZoom({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4" onClick={onClose} role="dialog">
      <button type="button" className="absolute top-4 right-4 border border-foam/40 px-3 py-2 font-mono text-xs text-foam" onClick={onClose}>
        закрыть
      </button>
      <div className="max-h-[90vh] max-w-[90vw]" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
