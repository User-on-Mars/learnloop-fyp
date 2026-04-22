import LogoMark from "./LogoMark";

export default function Logo({ size = 42, wordmark = false, className = "" }) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <LogoMark size={size} />
    </div>
  );
}
