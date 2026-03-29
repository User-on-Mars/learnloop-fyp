export default function Input({ label, type="text", ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>}
      <input
        type={type}
        className="w-full border-2 border-transparent rounded-lg px-4 py-2.5 outline-none focus:border-site-accent transition-colors bg-gray-50 focus:bg-white placeholder:text-gray-400"
        {...props}
      />
    </div>
  );
}
