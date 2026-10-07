import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, subtitle, icon, onClose, children }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel__header">
          <div>
            <h2>
              {icon} {title}
            </h2>
            {subtitle && <p className="modal-panel__subtitle">{subtitle}</p>}
          </div>
          <button className="modal-panel__close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>
        <div className="modal-panel__body">{children}</div>
      </div>
    </div>
  );
}
