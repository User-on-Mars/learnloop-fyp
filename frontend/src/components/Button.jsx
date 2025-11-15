export function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`w-full rounded-lg py-2.5 font-medium transition border border-grey-300
        bg-ll-600 text-black hover:bg-ll-700 active:bg-ll-800 disabled:opacity-60
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
      className={`w-full rounded-lg py-2.5 font-medium border hover:bg-gray-50 transition ${className}`}
    >
      {children}
    </button>
  );
}
