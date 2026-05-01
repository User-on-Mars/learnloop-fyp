import { Menu } from 'lucide-react'

export default function AdminHeader({ onMenuToggle, adminName, adminAvatar }) {
  const initial = adminName ? adminName.charAt(0).toUpperCase() : '?'

  return (
    <header className="h-16 sticky top-0 z-30 bg-site-surface border-b border-site-border flex items-center justify-between px-4">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="md:hidden p-2 text-site-muted hover:text-site-ink hover:bg-site-soft rounded-lg transition-colors"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Spacer on desktop (hamburger hidden, keeps right side aligned) */}
      <div className="hidden md:block" />

      {/* Right side — admin info */}
      <div className="flex items-center gap-3">
        {/* Notification dot */}
        <div className="relative">
          <span className="block w-2.5 h-2.5 rounded-full bg-green-500" />
        </div>

        {/* Admin name */}
        <span className="text-sm font-medium text-site-ink hidden sm:block">
          {adminName}
        </span>

        {/* Avatar initial circle */}
        <div className="w-8 h-8 rounded-full bg-site-accent flex items-center justify-center text-white text-sm font-semibold">
          {initial}
        </div>
      </div>
    </header>
  )
}
