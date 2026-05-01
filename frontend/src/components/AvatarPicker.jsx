import { useState, useEffect } from "react";
import { X, Check, Trash2, Palette, Smile } from "lucide-react";
import { getAvatarShapes, getAvatarColors, generateAvatar } from "../data/avatars";

export default function AvatarPicker({ isOpen, onClose, onSelect, currentAvatar }) {
  const shapes = getAvatarShapes();
  const colors = getAvatarColors();

  const [selectedShape, setSelectedShape] = useState(shapes[0].id);
  const [selectedColor, setSelectedColor] = useState(colors[0].bg);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (currentAvatar && isOpen) {
      const match = currentAvatar.match?.(/^(\w+)-([\da-f]{6})$/i);
      if (match) {
        const shape = shapes.find(s => s.id === match[1]);
        const color = colors.find(c => c.bg.replace('#', '') === match[2]);
        if (shape) setSelectedShape(shape.id);
        if (color) setSelectedColor(color.bg);
      }
    }
  }, [currentAvatar, isOpen]);

  useEffect(() => {
    const svg = generateAvatar(selectedShape, selectedColor);
    setPreview(svg);
  }, [selectedShape, selectedColor]);

  if (!isOpen) return null;

  const handleSelect = () => {
    const avatarId = `${selectedShape}-${selectedColor.replace('#', '')}`;
    const avatarSvg = generateAvatar(selectedShape, selectedColor);
    onSelect({ id: avatarId, svg: avatarSvg });
  };

  const handleRemove = () => {
    onSelect({ id: null, svg: null });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 flex-shrink-0 bg-gradient-to-r from-rose-600 to-pink-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Smile className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Choose Avatar</h3>
                <p className="text-white/70 text-xs">Pick a character and color</p>
              </div>
            </div>
            <button onClick={onClose} className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Preview */}
          <div className="flex justify-center">
            <div className="relative">
              {preview ? (
                <img src={preview} alt="Avatar preview" className="w-24 h-24 rounded-full ring-4 ring-[#e2e6dc] shadow-lg w-auto h-auto object-cover" loading="lazy" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#f5f7f2] flex items-center justify-center ring-4 ring-[#e2e6dc]">
                  <span className="text-[#c8cec0] text-sm">Preview</span>
                </div>
              )}
            </div>
          </div>

          {/* Character Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Smile className="w-4 h-4 text-rose-500" />
              <label className="text-sm font-bold text-[#1c1f1a]">Character</label>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {shapes.map((shape) => {
                const shapeSvg = generateAvatar(shape.id, selectedColor);
                const isSelected = selectedShape === shape.id;
                return (
                  <button key={shape.id} onClick={() => setSelectedShape(shape.id)} title={shape.name}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-400 shadow-sm scale-105'
                        : 'bg-[#f8faf6] border-2 border-transparent hover:border-[#e2e6dc] hover:bg-white'
                    }`}>
                    <img src={shapeSvg} alt={shape.name} className="w-10 h-10 rounded-full w-auto h-auto object-cover" loading="lazy" />
                    <span className={`text-[10px] font-semibold ${isSelected ? 'text-rose-600' : 'text-[#9aa094]'}`}>{shape.name}</span>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-rose-500" />
              <label className="text-sm font-bold text-[#1c1f1a]">Color</label>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {colors.map((color) => {
                const isSelected = selectedColor === color.bg;
                return (
                  <button key={color.bg} onClick={() => setSelectedColor(color.bg)}
                    className="flex items-center justify-center"
                    aria-label={`Select color ${color.bg}`}>
                    <div className={`w-10 h-10 rounded-xl transition-all ${
                      isSelected ? 'ring-2 ring-offset-2 ring-[#1c1f1a] scale-110' : 'hover:scale-105 border-2 border-black/5'
                    }`} style={{ backgroundColor: color.bg }}>
                      {isSelected && (
                        <div className="flex items-center justify-center h-full">
                          <Check className="w-4 h-4 text-white drop-shadow-lg" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 bg-[#f8faf6] border-t border-[#e2e6dc]">
          <div className="flex items-center gap-3">
            {currentAvatar && (
              <button onClick={handleRemove}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-red-500 hover:bg-red-50 rounded-xl font-semibold transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
            <div className="flex-1" />
            <button onClick={onClose}
              className="px-5 py-2.5 border-2 border-[#e2e6dc] text-[#565c52] rounded-xl font-semibold text-sm hover:bg-white transition-colors">
              Cancel
            </button>
            <button onClick={handleSelect}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl font-semibold text-sm hover:from-rose-700 hover:to-pink-700 transition-all shadow-lg shadow-rose-500/20">
              Save Avatar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}