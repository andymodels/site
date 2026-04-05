import React from 'react';

const GENDERS = [
  {
    value: 'FEMININO',
    label: 'Feminino',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <circle cx="12" cy="8" r="5" />
        <line x1="12" y1="13" x2="12" y2="21" />
        <line x1="9" y1="18" x2="15" y2="18" />
      </svg>
    ),
  },
  {
    value: 'MASCULINO',
    label: 'Masculino',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <circle cx="10" cy="14" r="5" />
        <line x1="14.5" y1="9.5" x2="21" y2="3" />
        <polyline points="16 3 21 3 21 8" />
      </svg>
    ),
  },
];

export default function StepGender({ onSelect }) {
  return (
    <div>
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Selecione o gênero</h2>
        <p className="text-sm text-gray-400">Escolha para filtrar a pasta correta no Drive</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {GENDERS.map((g) => (
          <button
            key={g.value}
            onClick={() => onSelect(g.value)}
            className="group bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center gap-4 hover:border-gray-900 hover:shadow-md transition-all duration-150 cursor-pointer"
          >
            <span className="text-gray-400 group-hover:text-gray-900 transition-colors">{g.icon}</span>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 tracking-wide uppercase">
              {g.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

