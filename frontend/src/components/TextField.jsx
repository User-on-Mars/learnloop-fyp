export default function TextField({ id, label, type='text', value, onChange, error, hint, required }){
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{label}{required && ' *'}</label>
      <input id={id} type={type} value={value} onChange={onChange}
        className={"w-full rounded-lg border px-3 py-2 outline-none focus:ring " + (error ? "border-red-500" : "border-gray-300")} />
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
    </div>
  )
}
