import { useMemo } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import {
  calculatePasswordStrength,
  getPasswordStrengthInfo,
  getPasswordRequirements
} from '../utils/passwordValidator';

/**
 * PasswordStrengthMeter Component
 * Displays password strength indicator and requirements checklist
 */
export default function PasswordStrengthMeter({ password, showRequirements = true }) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);
  const strengthInfo = useMemo(() => getPasswordStrengthInfo(strength), [strength]);
  const requirements = useMemo(() => getPasswordRequirements(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#565c52]">Password Strength</span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: strengthInfo.bgColor,
              color: strengthInfo.textColor
            }}
          >
            {strengthInfo.label}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300 ease-out rounded-full"
            style={{
              width: `${(strength / 5) * 100}%`,
              backgroundColor: strengthInfo.color
            }}
          />
        </div>

        {/* Description */}
        <p className="text-xs text-[#9aa094] italic">{strengthInfo.description}</p>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-1.5 p-3 bg-[#f8faf6] rounded-xl border border-[#e8ece3]">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-[#9aa094]" />
            <span className="text-xs font-semibold text-[#565c52]">Requirements</span>
          </div>
          {requirements.map((req, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {req.met ? (
                <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              )}
              <span
                className={`text-xs ${
                  req.met ? 'text-green-700 font-medium' : 'text-[#9aa094]'
                }`}
              >
                {req.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
