export default function Logo({ size = 28 }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div
        className="grid place-items-center rounded-full"
        style={{
          width: size, height: size,
          background: 'linear-gradient(135deg, #2aa4ff, #0f6bc0)'
        }}
      >
        {/* loop-like glyph */}
        <svg width={size*0.55} height={size*0.55} viewBox="0 0 24 24" fill="none">
          <path d="M7 12a5 5 0 0 1 5-5h5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <path d="M17 12a5 5 0 0 1-5 5H7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <span className="text-xl font-extrabold tracking-tight">
        <span className="text-ll-600">Learn</span><span className="text-ll-900">Loop</span>
      </span>
    </div>
  );
}
