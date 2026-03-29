import type { Mood } from '../types/skillmap'

/** Emoji shown next to each mood in history and forms. */
export const moodEmoji: Record<Mood, string> = {
  great: '😄',
  good: '🙂',
  okay: '😐',
  tough: '😓',
  lost: '😵',
}

/** Mood picker options in display order. */
export const moodPickerOptions: { value: Mood; label: string }[] = [
  { value: 'great', label: 'great' },
  { value: 'good', label: 'good' },
  { value: 'okay', label: 'okay' },
  { value: 'tough', label: 'tough' },
  { value: 'lost', label: 'lost' },
]
