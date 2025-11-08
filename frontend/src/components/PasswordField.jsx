import { useState } from 'react'
export default function PasswordField(props){
  const { id, label, value, onChange, error, hint, required } = props
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{label}{required && ' *'}</label>
      <div className="relative">
        <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange}
          className={"w-full rounded-lg border px-3 py-2 pr-10 outline-none focus:ring " + (error ? "border-red-500" : "border-gray-300")} />
        <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600" onClick={()=>setShow(s=>!s)} aria-label="Toggle password visibility">
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
    </div>
  )
}
