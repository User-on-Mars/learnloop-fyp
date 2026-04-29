import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Custom themed dropdown filter — consistent across the app.
 * Replaces native <select> with green-themed hover/selection.
 *
 * @param {string}   value     Current selected value
 * @param {function} onChange  Called with new value on selection
 * @param {Array}    options   [{ value, label }]
 * @param {number}   minWidth  Minimum width in px (default 160)
 */
export default function FilterDropdown({ value, onChange, options, minWidth = 160 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative" style={{ minWidth }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2 border rounded-xl text-[13px] font-medium bg-white shadow-sm cursor-pointer transition-all ${
          open ? 'border-[#4f7942] ring-2 ring-[#4f7942]/20 text-[#2e5023]' : 'border-[#c8cec0] text-[#2e5023] hover:border-[#a3c99a]'
        }`}>
        <span className="truncate">{selected?.label || value}</span>
        <ChevronDown className={`w-4 h-4 text-[#4f7942] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-[#d4dbc9] rounded-xl shadow-lg shadow-[#2e5023]/8 py-1 animate-fadeIn max-h-60 overflow-y-auto">
          {options.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-[13px] transition-colors ${
                opt.value === value
                  ? 'bg-[#edf5e9] text-[#2e5023] font-semibold'
                  : 'text-[#3d4a38] hover:bg-[#f4f7f2] hover:text-[#2e5023]'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
