import { useState, useMemo } from 'react';
import { X, Search, ChevronRight } from 'lucide-react';
import { ICON_CATEGORIES, ALL_ICONS, DEFAULT_ICONS, getIconComponent } from '../utils/iconLibrary';

export function SkillIcon({ name, size = 24, className = '' }) {
  const IconComp = getIconComponent(name);
  if (!IconComp) return <span className={className} style={{ fontSize: size }}>{name || '📁'}</span>;
  return <IconComp size={size} className={className} />;
}

export default function IconPicker({ value, onChange }) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  // Track icon picked from browse modal — stays pinned in slot 1 until cleared
  const [browsedIcon, setBrowsedIcon] = useState(null);

  // Quick picker: if a browsed icon exists (not in defaults), pin it in slot 1
  const quickIcons = useMemo(() => {
    if (browsedIcon && !DEFAULT_ICONS.includes(browsedIcon)) {
      return [browsedIcon, ...DEFAULT_ICONS.slice(0, 6)];
    }
    return DEFAULT_ICONS.slice(0, 7);
  }, [browsedIcon]);

  const filteredIcons = useMemo(() => {
    let icons = activeCategory === 'All'
      ? ALL_ICONS
      : ICON_CATEGORIES[activeCategory] || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      icons = icons.filter((name) => name.toLowerCase().includes(q));
    }
    return icons;
  }, [activeCategory, search]);

  const handleSelect = (iconName) => {
    onChange(iconName);
    // Only pin to slot 1 if it's not already in the default 9
    if (!DEFAULT_ICONS.includes(iconName)) {
      setBrowsedIcon(iconName);
    }
    setShowModal(false);
    setSearch('');
    setActiveCategory('All');
  };

  const categories = ['All', ...Object.keys(ICON_CATEGORIES)];

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {quickIcons.map((name) => {
          const selected = value === name;
          const Icon = getIconComponent(name);
          return (
            <button key={name} type="button" onClick={() => onChange(name)} title={name}
              className={`h-11 w-full rounded-lg border-2 flex items-center justify-center transition-colors outline-none ${
                selected
                  ? 'border-site-accent bg-site-soft shadow-[0_0_0_3px_rgba(46,80,35,0.18)]'
                  : 'border-gray-200 bg-white hover:border-site-accent hover:bg-site-soft/70'
              }`}>
              {Icon && <Icon size={22} className={selected ? 'text-site-accent' : 'text-gray-600'} />}
            </button>
          );
        })}
        <button type="button" onClick={() => setShowModal(true)} title="Browse more icons"
          className="h-11 w-full rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center transition-colors hover:border-site-accent hover:bg-site-soft/70 outline-none">
          <ChevronRight size={18} className="text-gray-500" />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-site-ink">Choose an icon</h3>
              <button type="button" onClick={() => { setShowModal(false); setSearch(''); setActiveCategory('All'); }}
                className="p-2 rounded-lg text-site-faint hover:bg-site-bg"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-site-faint" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search icons..."
                  className="w-full pl-9 pr-3 py-2 text-sm border-2 border-transparent rounded-lg bg-site-bg outline-none focus:border-site-accent focus:bg-white transition-colors" />
              </div>
            </div>
            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button key={cat} type="button" onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat ? 'bg-site-accent text-white' : 'bg-site-bg text-site-muted hover:bg-site-soft'
                  }`}>{cat}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 border-t border-gray-100 pt-3">
              {filteredIcons.length === 0 ? (
                <p className="text-sm text-site-muted text-center py-8">No icons found</p>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {filteredIcons.map((name) => {
                    const Icon = getIconComponent(name);
                    const selected = value === name;
                    return (
                      <button key={name} type="button" onClick={() => handleSelect(name)} title={name}
                        className={`h-11 rounded-lg border-2 flex items-center justify-center transition-colors outline-none ${
                          selected
                            ? 'border-site-accent bg-site-soft shadow-[0_0_0_3px_rgba(46,80,35,0.18)]'
                            : 'border-gray-200 bg-white hover:border-site-accent hover:bg-site-soft/70'
                        }`}>
                        {Icon && <Icon size={20} className={selected ? 'text-site-accent' : 'text-gray-600'} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
