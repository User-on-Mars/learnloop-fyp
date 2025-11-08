export default function Input({ label, type="text", ...props }) {
  return (
    <div>
      {label && <label className="text-sm font-medium text-gray-800">{label}</label>}
      <input
        type={type}
        className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ll-300 focus:border-ll-400"
        {...props}
      />
    </div>
  );
}
