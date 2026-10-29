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

import Image from "next/image";

export function RentFlowMark({ className }: { className?: string }) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={40}
      src="/rentflow-logo.png"
      style={{ objectFit: "contain" }}
      width={40}
    />
  );
}
