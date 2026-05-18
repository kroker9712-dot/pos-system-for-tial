import "./Input.css";

export default function Input({ label, id, error, className = "", ...props }) {
  const inputId = id || props.name;
  return (
    <label className={`field ${className}`} htmlFor={inputId}>
      {label && <span className="field-label">{label}</span>}
      <input id={inputId} className="field-input" {...props} />
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
