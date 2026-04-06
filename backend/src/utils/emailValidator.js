/**
 * Email validation utility to prevent fake/disposable email addresses
 */

// List of common disposable/fake email domains
const DISPOSABLE_DOMAINS = [
  'tempmail.com',
  'throwaway.email',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'maildrop.cc',
  'temp-mail.org',
  'getnada.com',
  'trashmail.com',
  'fakeinbox.com',
  'yopmail.com',
  'sharklasers.com',
  'grr.la',
  'guerrillamail.info',
  'guerrillamail.biz',
  'guerrillamail.de',
  'spam4.me',
  'tempinbox.com',
  'throwawaymail.com',
  'discard.email',
  'discardmail.com',
  'crazymailing.com',
  'mailnesia.com',
  'emailondeck.com',
  'mytrashmail.com',
  'mt2015.com',
  'thankyou2010.com',
  'trash-mail.at',
  'trashmail.at',
  'trashmail.me',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'wegwerfmail.org',
];

// List of known valid email providers
const VALID_PROVIDERS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'protonmail.com',
  'aol.com',
  'mail.com',
  'zoho.com',
  'gmx.com',
  'yandex.com',
  'live.com',
  'msn.com',
  'me.com',
  'mac.com',
];

/**
 * Validate email format and check for fake/disposable domains
 * @param {string} email - Email address to validate
 * @returns {Object} - { valid: boolean, message: string }
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email is required' };
  }

  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Invalid email format' };
  }

  // Extract domain
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return { valid: false, message: 'Invalid email format' };
  }

  // Check for disposable/fake domains
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { 
      valid: false, 
      message: 'Disposable email addresses are not allowed. Please use a valid email provider.' 
    };
  }

  // Check for suspicious patterns
  // Single letter domains (e.g., @f.com, @a.com)
  const domainParts = domain.split('.');
  if (domainParts[0].length === 1 && domainParts.length === 2) {
    return { 
      valid: false, 
      message: 'This email domain appears to be invalid. Please use a valid email provider like Gmail, Yahoo, or Outlook.' 
    };
  }

  // Check for random/gibberish domains (basic heuristic)
  // If domain has no vowels or is very short, it's likely fake
  const domainName = domainParts[0];
  const hasVowel = /[aeiou]/i.test(domainName);
  if (!hasVowel && domainName.length < 4) {
    return { 
      valid: false, 
      message: 'This email domain appears to be invalid. Please use a valid email provider.' 
    };
  }

  // Check for common typos in popular domains
  const typoMap = {
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    'outlok.com': 'outlook.com',
    'hotmial.com': 'hotmail.com',
  };

  if (typoMap[domain]) {
    return { 
      valid: false, 
      message: `Did you mean ${typoMap[domain]}? Please check your email address.` 
    };
  }

  // All checks passed
  return { valid: true, message: 'Email is valid' };
}

/**
 * Check if email domain is from a known valid provider
 * @param {string} email - Email address to check
 * @returns {boolean}
 */
export function isKnownProvider(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return VALID_PROVIDERS.includes(domain);
}
