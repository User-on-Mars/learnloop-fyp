import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

function parseDate(value) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatInputDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDisplayDate(value) {
  const date = parseDate(value)
  if (!date) return 'mm / dd / yyyy'
  return new Intl.DateTimeFormat('en', { month: '2-digit', day: '2-digit', year: 'numeric' }).format(date)
}

function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isBeforeDate(date, min) {
  return min && date < min
}

function isAfterDate(date, max) {
  return max && date > max
}

export default function ThemedDatePicker({ label, value, onChange, min, max }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selectedDate = parseDate(value)
  const minDate = parseDate(min)
  const maxDate = parseDate(max)
  const [viewDate, setViewDate] = useState(selectedDate || new Date())

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate)
  }, [value])

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    const start = new Date(year, month, 1 - firstOfMonth.getDay())

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date
    })
  }, [viewDate])

  const changeMonth = (delta) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  const selectDate = (date) => {
    if (isBeforeDate(date, minDate) || isAfterDate(date, maxDate)) return
    onChange(formatInputDate(date))
    setOpen(false)
  }

  const monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(viewDate)

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-xs font-semibold text-[#2e5023] mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className="w-full min-h-[42px] rounded-lg border border-[#c8cec0] bg-white px-3 text-left text-sm text-site-ink shadow-sm transition-all hover:border-[#a3c99a] focus:border-[#4f7942] focus:outline-none focus:ring-2 focus:ring-[#4f7942]/20"
      >
        <span className="flex items-center justify-between gap-3">
          <span className={value ? 'text-site-ink' : 'text-site-faint'}>{formatDisplayDate(value)}</span>
          <CalendarDays className="w-4 h-4 text-[#4f7942]" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 z-[120] mt-2 w-[320px] rounded-xl border border-[#d4dbc9] bg-white p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="p-2 rounded-lg text-[#4f7942] hover:bg-[#edf5e9]"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="rounded-lg border border-[#c8cec0] bg-[#f4f7f2] px-3 py-1.5 text-sm font-semibold text-[#2e5023]">
              {monthLabel}
            </div>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="p-2 rounded-lg text-[#4f7942] hover:bg-[#edf5e9]"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#4f7942]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarDays.map(date => {
              const inMonth = date.getMonth() === viewDate.getMonth()
              const selected = sameDay(date, selectedDate)
              const today = sameDay(date, new Date())
              const disabled = isBeforeDate(date, minDate) || isAfterDate(date, maxDate)

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDate(date)}
                  className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-[#4f7942] text-white shadow-sm'
                      : today
                        ? 'border border-[#4f7942] text-[#2e5023] bg-[#edf5e9]'
                        : inMonth
                          ? 'text-site-ink hover:bg-[#edf5e9] hover:text-[#2e5023]'
                          : 'text-site-faint hover:bg-[#f4f7f2]'
                  } ${disabled ? 'cursor-not-allowed opacity-35 hover:bg-transparent' : ''}`}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#d8e6d2] pt-3">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className="px-3 py-1.5 rounded-lg border border-[#c8cec0] text-xs font-semibold text-[#2e5023] hover:bg-[#edf5e9]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-[#4f7942] text-xs font-semibold text-white hover:bg-[#3f6135]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
