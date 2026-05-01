import { memo } from "react";

/**
 * HeroSection - Reusable responsive hero banner component
 * 
 * Features:
 * - Mobile-first responsive layout (vertical stack on mobile, horizontal on sm+)
 * - Responsive padding: p-4 sm:p-6 lg:p-8
 * - Flexible stat grid: grid-cols-2 sm:grid-cols-4 or custom columns
 * - Gradient background with decorative elements
 * - Action buttons stack vertically on mobile, inline on sm+
 * 
 * @param {Object} props
 * @param {string} props.title - Main heading text
 * @param {string} props.subtitle - Subtitle text (appears below icon)
 * @param {string} props.description - Description paragraph
 * @param {React.Component} props.icon - Lucide icon component
 * @param {string} props.gradientFrom - Tailwind gradient start color (e.g., 'sky-50')
 * @param {string} props.gradientVia - Tailwind gradient middle color (e.g., 'white')
 * @param {string} props.gradientTo - Tailwind gradient end color (e.g., 'blue-50')
 * @param {string} props.borderColor - Tailwind border color (e.g., 'sky-100')
 * @param {string} props.iconGradientFrom - Icon background gradient start (e.g., 'sky-600')
 * @param {string} props.iconGradientTo - Icon background gradient end (e.g., 'blue-600')
 * @param {string} props.subtitleColor - Subtitle text color (e.g., 'sky-600')
 * @param {string} props.decorColor1 - First decorative blob color (e.g., 'sky-200')
 * @param {string} props.decorColor2 - Second decorative blob color (e.g., 'blue-200')
 * @param {Array} props.actions - Array of action button objects: { label, icon, onClick, variant: 'primary'|'secondary' }
 * @param {Array} props.stats - Array of stat objects: { icon, label, value, color, bg }
 * @param {string} props.statsColumns - Grid columns for stats (e.g., 'grid-cols-2 sm:grid-cols-4')
 * @param {React.ReactNode} props.extraContent - Optional extra content to render after stats
 */
const HeroSection = memo(function HeroSection({
  title,
  subtitle,
  description,
  icon: Icon,
  gradientFrom = "sky-50",
  gradientVia = "white",
  gradientTo = "blue-50",
  borderColor = "sky-100",
  iconGradientFrom = "sky-600",
  iconGradientTo = "blue-600",
  subtitleColor = "sky-600",
  decorColor1 = "sky-200",
  decorColor2 = "blue-200",
  actions = [],
  stats = [],
  statsColumns = "grid-cols-2 sm:grid-cols-4",
  extraContent = null,
}) {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-${gradientFrom} via-${gradientVia} to-${gradientTo} rounded-2xl border border-${borderColor} p-6 sm:p-7`}>
      {/* Background decorative elements */}
      <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full bg-${decorColor1} opacity-15 blur-3xl pointer-events-none`} />
      <div className={`absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-${decorColor2} opacity-10 blur-2xl pointer-events-none`} />

      {/* Content */}
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-5">
        {/* Left: Title + Description */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 sm:mb-3">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-${iconGradientFrom} to-${iconGradientTo} flex items-center justify-center shadow-sm`}>
              {Icon && <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1c1f1a]">{title}</h1>
              {subtitle && (
                <p className={`text-xs sm:text-sm text-${subtitleColor} font-medium`}>{subtitle}</p>
              )}
            </div>
          </div>
          {description && (
            <p className="text-sm sm:text-[15px] text-[#565c52] leading-relaxed max-w-xl">
              {description}
            </p>
          )}
        </div>

        {/* Right: Action Buttons */}
        {actions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
            {actions.map((action, index) => {
              const ActionIcon = action.icon;
              const isPrimary = action.variant === "primary";
              
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] ${
                    isPrimary
                      ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white hover:from-sky-700 hover:to-blue-700 shadow-lg shadow-sky-500/20"
                      : "bg-white text-[#565c52] hover:bg-[#f5f7f2] border border-[#e2e6dc]"
                  }`}
                >
                  {ActionIcon && <ActionIcon className="w-4 h-4" />}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Stat Grid */}
      {stats.length > 0 && (
        <div className={`relative grid ${statsColumns} gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-${borderColor}`}>
          {stats.map((stat, index) => {
            const StatIcon = stat.icon;
            return (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  {StatIcon && <StatIcon className="w-5 h-5" style={{ color: stat.color }} />}
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-bold text-[#1c1f1a] leading-none truncate">
                    {stat.value}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-[#9aa094] mt-0.5 truncate">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Extra Content */}
      {extraContent && (
        <div className="relative mt-4 sm:mt-6">
          {extraContent}
        </div>
      )}
    </div>
  );
});

export default HeroSection;
