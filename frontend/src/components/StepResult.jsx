import React from 'react';

export default function StepResult({ url, modelName, onReset }) {
  return (
    <div className="flex flex-col items-center text-center py-8">
      <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Composite gerado!</h2>
      <p className="text-sm text-gray-400 mb-8 max-w-xs">
        O composite de{' '}
        <span className="font-semibold text-gray-700">{modelName}</span>{' '}
        foi criado com sucesso no Google Drive.
      </p>

      <div className="w-full max-w-sm space-y-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-black transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Abrir Apresentação
        </a>

        <button
          onClick={onReset}
          className="w-full border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium hover:border-gray-400 hover:text-gray-900 transition-colors"
        >
          Gerar Novo Composite
        </button>
      </div>
    </div>
  );
}

