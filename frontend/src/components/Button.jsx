export function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`w-full rounded-lg py-3 min-h-[44px] font-medium transition border border-site-border
        bg-site-accent text-white hover:bg-site-accent-hover active:opacity-90 disabled:opacity-60
        ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`w-full rounded-lg py-3 min-h-[44px] font-medium border border-site-border bg-site-surface text-site-ink hover:bg-site-bg transition ${className}`}
    >
      {children}
    </button>
  );
}
