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
    <img
      alt=""
      aria-hidden="true"
      className={className}
      src="/rentflow-logo.png"
    />
  );
}
