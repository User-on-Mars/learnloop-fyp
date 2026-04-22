import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { getAvatarShapes, getAvatarColors, generateAvatar } from "../data/avatars";

/**
 * Avatar picker modal - lets users choose a shape and color for their avatar.
 */
export default function AvatarPicker({ isOpen, onClose, onSelect, currentAvatar }) {
  const shapes = getAvatarShapes();
  const colors = getAvatarColors();

  const [selectedShape, setSelectedShape] = useState(shapes[0].id);
  const [selectedColor, setSelectedColor] = useState(colors[0].bg);
  const [preview, setPreview] = useState(null);

  // Try to parse current avatar to pre-select shape/color
  useEffect(() => {
    if (currentAvatar && isOpen) {
      // Try to extract shape and color from the stored avatar ID
      // Format: "shape-colorhex"
      const match = currentAvatar.match?.(/^(\w+)-([\da-f]{6})$/i);
      if (match) {
        const shape = shapes.find(s => s.id === match[1]);
        const color = colors.find(c => c.bg.replace('#', '') === match[2]);
        if (shape) setSelectedShape(shape.id);
        if (color) setSelectedColor(color.bg);
      }
    }
  }, [currentAvatar, isOpen]);

  // Update preview when selection changes
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-site-ink">Choose Your Avatar</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close avatar picker"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Preview */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              {preview ? (
                <img
                  src={preview}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center ring-4 ring-gray-100">
                  <span className="text-gray-400 text-sm">Preview</span>
                </div>
              )}
            </div>
          </div>

          {/* Shape Selection */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Character</label>
            <div className="grid grid-cols-5 gap-2">
              {shapes.map((shape) => {
                const shapeSvg = generateAvatar(shape.id, selectedColor);
                const isSelected = selectedShape === shape.id;
                return (
                  <button
                    key={shape.id}
                    onClick={() => setSelectedShape(shape.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-site-accent/10 ring-2 ring-site-accent scale-105'
                        : 'hover:bg-gray-50 ring-1 ring-gray-100'
                    }`}
                    title={shape.name}
                  >
                    <img
                      src={shapeSvg}
                      alt={shape.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <span className="text-[10px] text-gray-500 font-medium">{shape.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => {
                const isSelected = selectedColor === color.bg;
                return (
                  <button
                    key={color.bg}
                    onClick={() => setSelectedColor(color.bg)}
                    className={`w-9 h-9 rounded-full transition-all ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-site-accent scale-110'
                        : 'ring-1 ring-gray-200 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.bg }}
                    aria-label={`Select color ${color.bg}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 sm:p-5 border-t border-gray-100 bg-gray-50/50">
          {currentAvatar && (
            <button
              onClick={handleRemove}
              className="px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
            >
              Remove
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            className="px-5 py-2.5 text-sm bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors shadow-md"
          >
            Save Avatar
          </button>
        </div>
      </div>
    </div>
  );
}
