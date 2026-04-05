import React, { useEffect, useState } from 'react';
import { getModelImages, getMeasurements, getImageProxyUrl } from '../api';

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

function MeasurementsBadge({ formatted }) {
  if (!formatted) return null;
  const parts = formatted.split(' | ');
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 mb-6">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">Medidas</p>
      <div className="flex flex-wrap gap-2">
        {parts.map((part, i) => (
          <span key={i} className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 text-gray-600">
            {part.trim()}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function StepGallery({ model, gender, onProceed, onBack }) {
  const [images, setImages]           = useState([]);
  const [selected, setSelected]       = useState([]);
  const [measurements, setMeasurements] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [imgs, meas] = await Promise.all([
          getModelImages(model.id),
          getMeasurements(model.id, gender, model.name),
        ]);
        setImages(imgs);
        setMeasurements(meas);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [model.id, gender, model.name]);

  function toggleSelect(img) {
    setSelected((prev) =>
      prev.find((i) => i.id === img.id)
        ? prev.filter((i) => i.id !== img.id)
        : [...prev, img]
    );
  }

  if (loading) {
    return (
      <div>
        <BackButton onClick={onBack} />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Carregando fotos de <span className="font-medium text-gray-600">{model.name}</span>...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <BackButton onClick={onBack} />
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-4">
          <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path strokeLinecap="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const minRequired = 2;
  const canProceed = selected.length >= minRequired;

  return (
    <div>
      <BackButton onClick={onBack} />

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Selecionar fotos</h2>
        <p className="text-sm text-gray-400">
          <span className="font-medium text-gray-700">{model.name}</span>
          {' '}·{' '}
          {images.length} foto{images.length !== 1 ? 's' : ''} disponív{images.length !== 1 ? 'eis' : 'el'}
        </p>
      </div>

      <MeasurementsBadge formatted={measurements?.formatted} />

      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-gray-200 rounded-2xl text-center">
          <svg className="w-10 h-10 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
            <path strokeLinecap="round" strokeWidth="1.5" d="M3 16l5-5 4 4 3-3 6 6" />
          </svg>
          <p className="text-sm text-gray-400">Nenhuma foto encontrada na pasta SITE.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5 mb-6">
            {images.map((img) => {
              const selIdx = selected.findIndex((i) => i.id === img.id);
              const isSelected = selIdx !== -1;
              return (
                <button
                  key={img.id}
                  onClick={() => toggleSelect(img)}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden transition-all duration-150 outline-none ${
                    isSelected
                      ? 'ring-2 ring-gray-900 ring-offset-2 shadow-md'
                      : 'ring-1 ring-gray-200 hover:ring-gray-400'
                  }`}
                >
                  <img
                    src={getImageProxyUrl(img.id)}
                    alt={img.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {isSelected ? (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-gray-900 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow">
                      {selIdx + 1}
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-white/70 rounded-full border border-gray-300" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Sticky footer bar */}
          <div className="sticky bottom-4 bg-white border border-gray-200 rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {selected.length} selecionada{selected.length !== 1 ? 's' : ''}
              </p>
              {!canProceed && (
                <p className="text-xs text-gray-400">Selecione pelo menos {minRequired} fotos</p>
              )}
            </div>
            <button
              onClick={() => onProceed(selected, measurements)}
              disabled={!canProceed}
              className="bg-gray-900 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Continuar →
            </button>
          </div>
        </>
      )}
    </div>
  );
}


