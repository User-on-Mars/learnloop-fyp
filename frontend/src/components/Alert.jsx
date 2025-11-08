export default function Alert({ variant='error', title, description }){
  const base = "rounded-lg border px-3 py-2"
  const cls = variant==='error' ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"
  return (
    <div className={base + " " + cls} role="alert">
      {title && <p className="font-semibold">{title}</p>}
      {description && <p className="text-sm">{description}</p>}
    </div>
  )
}
