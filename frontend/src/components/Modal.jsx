import "./Modal.css";

export default function Modal({ title, children, onClose, wide, className = "" }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal ${wide ? "modal-wide" : ""} ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
