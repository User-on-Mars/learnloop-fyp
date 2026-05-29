/**
 * Password validation utilities
 * Implements strong password requirements and common password blocking
 */

// Top 100 most common passwords to block
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
  'qazwsx', 'michael', 'football', 'welcome', 'jesus', 'ninja', 'mustang',
  'password1', '123456789', '12345', '1234', '111111', '1234567890', 'admin',
  'welcome1', 'password123', 'pass', 'test', 'guest', 'login', 'changeme',
  'secret', 'root', 'user', 'temp', 'demo', 'sample', 'default', 'qwerty123',
  'letmein1', 'welcome123', 'admin123', 'root123', 'test123', 'pass123',
  'password12', 'password1234', 'mypassword', 'mypass', 'pass1234', 'admin1',
  'administrator', 'passpass', 'pass1', 'pass12', 'pass123', 'password!',
  'password@', 'password#', 'qwerty1', 'qwerty12', 'abc12345', 'abcd1234',
  '1q2w3e4r', '1qaz2wsx', 'zxcvbnm', 'asdfghjkl', 'qwertyuiop', 'password2',
  'password3', 'password4', 'password5', 'password6', 'password7', 'password8',
  'password9', 'password0', 'pass1234567', 'pass12345678', 'password01',
  'password02', 'password03', 'password04', 'password05', 'password06'
];

/**
 * Password strength levels
 */
export const PasswordStrength = {
  VERY_WEAK: 0,
  WEAK: 1,
  FAIR: 2,
  GOOD: 3,
  STRONG: 4,
  VERY_STRONG: 5
};

export const MAX_PASSWORD_LENGTH = 128;

/**
 * Calculate password strength score (0-5)
 * @param {string} password - The password to evaluate
 * @returns {number} Strength score from 0 (very weak) to 5 (very strong)
 */
export function calculatePasswordStrength(password) {
  if (!password) return PasswordStrength.VERY_WEAK;

  let score = 0;
  const checks = {
    length: password.length >= 8,
    longLength: password.length >= 12,
    veryLongLength: password.length >= 16,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    noCommon: !COMMON_PASSWORDS.includes(password.toLowerCase()),
    noSequential: !hasSequentialChars(password),
    noRepeating: !hasRepeatingChars(password)
  };

  // Base score for length
  if (checks.length) score += 1;
  if (checks.longLength) score += 0.5;
  if (checks.veryLongLength) score += 0.5;

  // Character variety
  if (checks.lowercase) score += 0.5;
  if (checks.uppercase) score += 0.5;
  if (checks.numbers) score += 0.5;
  if (checks.special) score += 0.5;

  // Bonus for having all character types
  if (checks.lowercase && checks.uppercase && checks.numbers && checks.special) {
    score += 1;
  }

  // Penalties
  if (!checks.noCommon) score -= 2;
  if (!checks.noSequential) score -= 0.5;
  if (!checks.noRepeating) score -= 0.5;

  // Clamp between 0 and 5
  return Math.max(0, Math.min(5, Math.round(score)));
}

/**
 * Check if password has sequential characters (abc, 123, etc.)
 */
function hasSequentialChars(password) {
  const sequences = [
    'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij', 'ijk', 'jkl',
    'klm', 'lmn', 'mno', 'nop', 'opq', 'pqr', 'qrs', 'rst', 'stu', 'tuv',
    'uvw', 'vwx', 'wxy', 'xyz', '123', '234', '345', '456', '567', '678',
    '789', '890', '012'
  ];
  const lower = password.toLowerCase();
  return sequences.some(seq => lower.includes(seq) || lower.includes(seq.split('').reverse().join('')));
}

/**
 * Check if password has repeating characters (aaa, 111, etc.)
 */
function hasRepeatingChars(password) {
  return /(.)\1{2,}/.test(password);
}

/**
 * Get password strength label and color
 */
export function getPasswordStrengthInfo(strength) {
  const info = {
    [PasswordStrength.VERY_WEAK]: {
      label: 'Very Weak',
      color: '#ef4444',
      bgColor: '#fee2e2',
      textColor: '#991b1b',
      description: 'This password is too weak and easily guessable'
    },
    [PasswordStrength.WEAK]: {
      label: 'Weak',
      color: '#f97316',
      bgColor: '#ffedd5',
      textColor: '#9a3412',
      description: 'This password needs improvement'
    },
    [PasswordStrength.FAIR]: {
      label: 'Fair',
      color: '#eab308',
      bgColor: '#fef9c3',
      textColor: '#854d0e',
      description: 'This password is acceptable but could be stronger'
    },
    [PasswordStrength.GOOD]: {
      label: 'Good',
      color: '#84cc16',
      bgColor: '#ecfccb',
      textColor: '#3f6212',
      description: 'This is a good password'
    },
    [PasswordStrength.STRONG]: {
      label: 'Strong',
      color: '#22c55e',
      bgColor: '#dcfce7',
      textColor: '#166534',
      description: 'This is a strong password'
    },
    [PasswordStrength.VERY_STRONG]: {
      label: 'Very Strong',
      color: '#10b981',
      bgColor: '#d1fae5',
      textColor: '#065f46',
      description: 'Excellent! This password is very secure'
    }
  };
  return info[strength] || info[PasswordStrength.VERY_WEAK];
}

/**
 * Validate password against all requirements
 * @param {string} password - The password to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validatePassword(password) {
  const errors = [];

  if (!password) {
    return { isValid: false, errors: ['Password is required'] };
  }

  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Password must be ${MAX_PASSWORD_LENGTH} characters or less`);
  }

  // Character type checks
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  // Common password check
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a more unique password');
  }

  // Sequential characters check
  if (hasSequentialChars(password)) {
    errors.push('Avoid sequential characters (abc, 123, etc.)');
  }

  // Repeating characters check
  if (hasRepeatingChars(password)) {
    errors.push('Avoid repeating characters (aaa, 111, etc.)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get password requirements checklist
 * @param {string} password - The password to check
 * @returns {Array} Array of requirement objects with met status
 */
export function getPasswordRequirements(password) {
  return [
    {
      label: 'At least 8 characters',
      met: password.length >= 8,
      required: true
    },
    {
      label: 'Contains lowercase letter (a-z)',
      met: /[a-z]/.test(password),
      required: true
    },
    {
      label: 'Contains uppercase letter (A-Z)',
      met: /[A-Z]/.test(password),
      required: true
    },
    {
      label: 'Contains number (0-9)',
      met: /\d/.test(password),
      required: true
    },
    {
      label: 'Contains special character (!@#$...)',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      required: true
    },
    {
      label: 'Not a common password',
      met: !COMMON_PASSWORDS.includes(password.toLowerCase()),
      required: true
    }
  ];
}

/**
 * Generate a strong random password
 * @param {number} length - Desired password length (default: 16)
 * @returns {string} Generated password
 */
export function generateStrongPassword(length = 16) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const allChars = lowercase + uppercase + numbers + special;

  let password = '';

  // Ensure at least one of each type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
