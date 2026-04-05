import React, { useState } from 'react';
import { generateComposite, getImageProxyUrl } from '../api';

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

export default function StepGenerate({ model, gender, selectedImages, measurements, onGenerated, onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const imageIds = selectedImages.map((img) => img.id);
      const url = await generateComposite(model.name, gender, imageIds);
      onGenerated(url);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-5">
        <div className="w-12 h-12 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 mb-1">Gerando composite...</p>
          <p className="text-xs text-gray-400 max-w-xs">
            Inserindo fotos e medidas no template. Isso pode levar alguns instantes.
          </p>
        </div>
      </div>
    );
  }

  const pairs = [];
  for (let i = 0; i < selectedImages.length; i += 2) {
    pairs.push([selectedImages[i], selectedImages[i + 1] || null]);
  }

  return (
    <div>
      <BackButton onClick={onBack} />

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Revisar e gerar</h2>
        <p className="text-sm text-gray-400">
          <span className="font-medium text-gray-700">{model.name}</span>
          {' '}·{' '}
          {selectedImages.length} foto{selectedImages.length !== 1 ? 's' : ''}
          {' '}·{' '}
          {pairs.length} slide{pairs.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Measurements */}
      {measurements?.formatted && (
        <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 mb-5">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">Medidas</p>
          <div className="flex flex-wrap gap-2">
            {measurements.formatted.split(' | ').map((part, i) => (
              <span key={i} className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 text-gray-600">
                {part.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Slides preview */}
      <div className="space-y-3 mb-6">
        {pairs.map((pair, idx) => (
          <div key={idx} className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">
              Slide {idx + 1}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {pair.map((img, bi) =>
                img ? (
                  <div key={bi} className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={getImageProxyUrl(img.id)}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    key={bi}
                    className="aspect-[3/4] rounded-lg bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center"
                  >
                    <span className="text-xs text-gray-300">—</span>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path strokeLinecap="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button
        onClick={handleGenerate}
        className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-black transition-colors"
      >
        Gerar Composite
      </button>
    </div>
  );
}
