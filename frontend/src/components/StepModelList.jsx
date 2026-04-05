import React from 'react';

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-8 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Voltar
    </button>
  );
}

export default function StepModelList({ models, gender, onSelect, onBack }) {
  return (
    <div>
      <BackButton onClick={onBack} />

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Selecionar modelo</h2>
        <p className="text-sm text-gray-400">
          {models.length} resultado{models.length !== 1 ? 's' : ''} encontrado{models.length !== 1 ? 's' : ''} em{' '}
          <span className="font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md text-xs uppercase tracking-wide">
            {gender}
          </span>
        </p>
      </div>

      <div className="space-y-2">
        {models.map((model, i) => (
          <button
            key={model.id}
            onClick={() => onSelect(model)}
            className="w-full text-left bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-900 hover:shadow-sm transition-all duration-150 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center group-hover:bg-gray-900 group-hover:text-white transition-colors">
                {i + 1}
              </span>
              <span className="text-sm font-medium text-gray-800">{model.name}</span>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

