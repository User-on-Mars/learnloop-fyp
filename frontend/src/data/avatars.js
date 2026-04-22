/**
 * Pre-made avatar options for user profile customization.
 * Each avatar is an SVG data URI that can be stored as a string.
 */

const AVATAR_COLORS = [
  { bg: '#2e5023', fg: '#ffffff' }, // Forest green (site accent)
  { bg: '#0369a1', fg: '#ffffff' }, // Ocean blue
  { bg: '#7c3aed', fg: '#ffffff' }, // Purple
  { bg: '#dc2626', fg: '#ffffff' }, // Red
  { bg: '#ea580c', fg: '#ffffff' }, // Orange
  { bg: '#0891b2', fg: '#ffffff' }, // Teal
  { bg: '#be185d', fg: '#ffffff' }, // Pink
  { bg: '#4338ca', fg: '#ffffff' }, // Indigo
  { bg: '#15803d', fg: '#ffffff' }, // Green
  { bg: '#b45309', fg: '#ffffff' }, // Amber
];

function svgToDataUri(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// --- Avatar SVG generators ---

function catAvatar(bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bg}"/><polygon points="25,35 35,10 45,35" fill="${fg}"/><polygon points="55,35 65,10 75,35" fill="${fg}"/><circle cx="38" cy="48" r="5" fill="${fg}"/><circle cx="62" cy="48" r="5" fill="${fg}"/><ellipse cx="50" cy="60" rx="6" ry="4" fill="${fg}" opacity="0.8"/><line x1="20" y1="55" x2="38" y2="58" stroke="${fg}" stroke-width="1.5" opacity="0.6"/><line x1="20" y1="62" x2="38" y2="60" stroke="${fg}" stroke-width="1.5" opacity="0.6"/><line x1="80" y1="55" x2="62" y2="58" stroke="${fg}" stroke-width="1.5" opacity="0.6"/><line x1="80" y1="62" x2="62" y2="60" stroke="${fg}" stroke-width="1.5" opacity="0.6"/><path d="M44 68 Q50 76 56 68" stroke="${fg}" stroke-width="2" fill="none"/></svg>`;
}

function robotAvatar(bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bg}"/><rect x="28" y="30" width="44" height="36" rx="6" fill="${fg}" opacity="0.9"/><rect x="36" y="40" width="10" height="8" rx="2" fill="${bg}"/><rect x="54" y="40" width="10" height="8" rx="2" fill="${bg}"/><rect x="40" y="54" width="20" height="4" rx="2" fill="${bg}"/><line x1="50" y1="20" x2="50" y2="30" stroke="${fg}" stroke-width="3"/><circle cx="50" cy="17" r="4" fill="${fg}"/><rect x="20" y="42" width="8" height="12" rx="3" fill="${fg}" opacity="0.7"/><rect x="72" y="42" width="8" height="12" rx="3" fill="${fg}" opacity="0.7"/></svg>`;
}

function bearAvatar(bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bg}"/><circle cx="30" cy="28" r="12" fill="${fg}" opacity="0.8"/><circle cx="70" cy="28" r="12" fill="${fg}" opacity="0.8"/><circle cx="30" cy="28" r="7" fill="${bg}"/><circle cx="70" cy="28" r="7" fill="${bg}"/><ellipse cx="50" cy="52" rx="24" ry="22" fill="${fg}" opacity="0.9"/><circle cx="40" cy="46" r="4" fill="${bg}"/><circle cx="60" cy="46" r="4" fill="${bg}"/><ellipse cx="50" cy="56" rx="7" ry="5" fill="${bg}" opacity="0.5"/><path d="M46 62 Q50 68 54 62" stroke="${bg}" stroke-width="2" fill="none"/></svg>`;
}

function foxAvatar(bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bg}"/><polygon points="22,40 38,12 44,42" fill="${fg}"/><polygon points="78,40 62,12 56,42" fill="${fg}"/><ellipse cx="50" cy="55" rx="26" ry="22" fill="${fg}" opacity="0.9"/><circle cx="40" cy="48" r="4" fill="${bg}"/><circle cx="60" cy="48" r="4" fill="${bg}"/><ellipse cx="50" cy="60" rx="5" ry="3.5" fill="${bg}" opacity="0.7"/><path d="M45 66 Q50 72 55 66" stroke="${bg}" stroke-width="1.5" fill="none"/></svg>`;
}

function owlAvatar(bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bg}"/><circle cx="37" cy="45" r="14" fill="${fg}" opacity="0.9"/><circle cx="63" cy="45" r="14" fill="${fg}" opacity="0.9"/><circle cx="37" cy="45" r="7" fill="${bg}"/><circle cx="63" cy="45" r="7" fill="${bg}"/><circle cx="37" cy="45" r="3.5" fill="${fg}"/><circle cx="63" cy="45" r="3.5" fill="${fg}"/><polygon points="50,52 46,60 54,60" fill="${fg}" opacity="0.8"/><polygon points="25,30 35,22 30,38" fill="${fg}" opacity="0.6"/><polygon points="75,30 65,22 70,38" fill="${fg}" opacity="0.6"/><path d="M40 68 Q50 74 60 68" stroke="${fg}" stroke-width="2" fill="none"/></svg>`;
}

function penguinAvatar(bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bg}"/><ellipse cx="50" cy="54" rx="22" ry="26" fill="${fg}" opacity="0.9"/><ellipse cx="50" cy="58" rx="14" ry="18" fill="${bg}" opacity="0.3"/><circle cx="40" cy="44" r="4" fill="${bg}"/><circle cx="60" cy="44" r="4" fill="${bg}"/><polygon points="50,52 46,58 54,58" fill="#f59e0b"/><path d="M24,50 Q20,65 30,72" stroke="${fg}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M76,50 Q80,65 70,72" stroke="${fg}" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
}

function starAvatar(bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bg}"/><polygon points="50,18 58,38 80,38 62,52 68,74 50,60 32,74 38,52 20,38 42,38" fill="${fg}" opacity="0.9"/><circle cx="44" cy="44" r="3" fill="${bg}"/><circle cx="56" cy="44" r="3" fill="${bg}"/><path d="M44 54 Q50 60 56 54" stroke="${bg}" stroke-width="2" fill="none"/></svg>`;
}

function alienAvatar(bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bg}"/><ellipse cx="50" cy="52" rx="24" ry="28" fill="${fg}" opacity="0.9"/><ellipse cx="38" cy="44" rx="9" ry="6" fill="${bg}" transform="rotate(-10 38 44)"/><ellipse cx="62" cy="44" rx="9" ry="6" fill="${bg}" transform="rotate(10 62 44)"/><circle cx="38" cy="44" r="3" fill="${fg}"/><circle cx="62" cy="44" r="3" fill="${fg}"/><ellipse cx="50" cy="62" rx="4" ry="3" fill="${bg}" opacity="0.5"/></svg>`;
}

function ghostAvatar(bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bg}"/><path d="M28,55 Q28,22 50,22 Q72,22 72,55 L72,75 L64,68 L56,75 L50,68 L44,75 L36,68 L28,75 Z" fill="${fg}" opacity="0.9"/><circle cx="40" cy="44" r="5" fill="${bg}"/><circle cx="60" cy="44" r="5" fill="${bg}"/><circle cx="41" cy="43" r="2.5" fill="${fg}"/><circle cx="61" cy="43" r="2.5" fill="${fg}"/><ellipse cx="50" cy="56" rx="5" ry="4" fill="${bg}" opacity="0.4"/></svg>`;
}

function flowerAvatar(bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bg}"/><circle cx="50" cy="32" r="10" fill="${fg}" opacity="0.7"/><circle cx="36" cy="42" r="10" fill="${fg}" opacity="0.7"/><circle cx="64" cy="42" r="10" fill="${fg}" opacity="0.7"/><circle cx="36" cy="58" r="10" fill="${fg}" opacity="0.7"/><circle cx="64" cy="58" r="10" fill="${fg}" opacity="0.7"/><circle cx="50" cy="50" r="12" fill="${fg}"/><circle cx="45" cy="47" r="3" fill="${bg}"/><circle cx="55" cy="47" r="3" fill="${bg}"/><path d="M45 56 Q50 62 55 56" stroke="${bg}" stroke-width="2" fill="none"/></svg>`;
}

// Generate all avatar options
const AVATAR_SHAPES = [
  { id: 'cat', name: 'Cat', generator: catAvatar },
  { id: 'robot', name: 'Robot', generator: robotAvatar },
  { id: 'bear', name: 'Bear', generator: bearAvatar },
  { id: 'fox', name: 'Fox', generator: foxAvatar },
  { id: 'owl', name: 'Owl', generator: owlAvatar },
  { id: 'penguin', name: 'Penguin', generator: penguinAvatar },
  { id: 'star', name: 'Star', generator: starAvatar },
  { id: 'alien', name: 'Alien', generator: alienAvatar },
  { id: 'ghost', name: 'Ghost', generator: ghostAvatar },
  { id: 'flower', name: 'Flower', generator: flowerAvatar },
];

export function getAvatarOptions() {
  const options = [];
  for (const shape of AVATAR_SHAPES) {
    for (const color of AVATAR_COLORS) {
      options.push({
        id: `${shape.id}-${color.bg.replace('#', '')}`,
        name: shape.name,
        svg: svgToDataUri(shape.generator(color.bg, color.fg)),
        shape: shape.id,
        color: color.bg,
      });
    }
  }
  return options;
}

export function getAvatarShapes() {
  return AVATAR_SHAPES;
}

export function getAvatarColors() {
  return AVATAR_COLORS;
}

export function generateAvatar(shapeId, colorBg, colorFg = '#ffffff') {
  const shape = AVATAR_SHAPES.find(s => s.id === shapeId);
  if (!shape) return null;
  return svgToDataUri(shape.generator(colorBg, colorFg));
}
