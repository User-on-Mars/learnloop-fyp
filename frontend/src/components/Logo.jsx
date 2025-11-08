export default function Logo({ size = 40, wordmark = true, className = "" }) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div
        className="grid place-items-center rounded-full shadow-sm"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, #2aa4ff, #0f6bc0)",
        }}
      >
        {/* loop glyph */}
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M7 12a5 5 0 0 1 5-5h5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M17 12a5 5 0 0 1-5 5H7"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {wordmark && (
        <span className="text-2xl md:text-3xl font-extrabold tracking-tight">
          <span className="text-ll-600">Learn</span>
          <span className="text-ll-900">Loop</span>
        </span>
      )}
    </div>
  );
}
