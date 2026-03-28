import LogoMark from "./LogoMark";

export default function Logo({ size = 40, wordmark = true, className = "" }) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <LogoMark size={size} className="shadow-sm" />

      {wordmark && (
        <span className="text-2xl md:text-3xl font-extrabold tracking-tight">
          <span className="text-site-accent">Learn</span>
          <span className="text-site-ink">Loop</span>
        </span>
      )}
    </div>
  );
}
