export function RentFlowLogo({
  className,
  label = "KENYA",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span className={`rentflow-logo${className ? ` ${className}` : ""}`}>
      <RentFlowMark className="rentflow-logo-mark" />
      <span className="rentflow-logo-word">
        RentFlow <small>{label}</small>
      </span>
    </span>
  );
}

export function RentFlowMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="38" height="38" rx="12" fill="#315D49" />
      <path
        d="M12 29V19.5a8 8 0 0 1 16 0V29"
        stroke="#F8F6EC"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8.5 29h7a3.5 3.5 0 0 0 3.5-3.5V23"
        stroke="#D8A47A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 29h16"
        stroke="#F8F6EC"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="23.5" cy="19.5" r="1.25" fill="#D8A47A" />
    </svg>
  );
}
