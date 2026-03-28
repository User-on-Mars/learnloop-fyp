import { useState, useEffect, useRef } from 'react'

/** Formats seconds as MM:SS. */
function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/** Counts elapsed seconds for a practice session with pause and reset. */
export function useTimer() {
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1)
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  function pause() {
    setIsRunning(false)
  }

  function resume() {
    setIsRunning(true)
  }

  function reset() {
    setSeconds(0)
    setIsRunning(true)
  }

  return {
    seconds,
    formattedTime: formatTime(seconds),
    isRunning,
    pause,
    resume,
    reset,
  }
}
