export default function Input({ label, type="text", ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>}
      <input
        type={type}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-ll-400 focus:border-ll-500 transition-all duration-200 placeholder:text-gray-400"
        {...props}
      />
    </div>
  );
}
