import React from 'react';
import { LayoutGrid, AlignHorizontalJustifyCenter, AlignHorizontalJustifyStart, ArrowDownRight, Layers } from 'lucide-react';

interface LayoutSelectorProps {
  onSelect: (template: string) => void;
  currentType?: string;
}

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({ onSelect }) => {
  const layouts = [
    { id: 'row', label: 'Linear', icon: <AlignHorizontalJustifyCenter size={20} /> },
    { id: 'grid', label: 'Grid', icon: <LayoutGrid size={20} /> },
    { id: 'big-left', label: 'Focus Left', icon: <AlignHorizontalJustifyStart size={20} className="rotate-180" /> }, // Flip for visual
    { id: 'big-right', label: 'Focus Right', icon: <AlignHorizontalJustifyStart size={20} /> },
    { id: 'big-center', label: 'Butterfly', icon: <Layers size={20} /> },
    { id: 'stairs', label: 'Stairs', icon: <ArrowDownRight size={20} /> },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 p-2 bg-gray-900 rounded-lg">
      {layouts.map(l => (
        <button
          key={l.id}
          onClick={() => onSelect(l.id)}
          className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition gap-2 group"
          title={l.label}
        >
          <div className="group-hover:scale-110 transition">{l.icon}</div>
          <span className="text-[10px] font-medium">{l.label}</span>
        </button>
      ))}
    </div>
  );
};
