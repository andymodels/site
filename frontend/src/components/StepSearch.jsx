import React, { useState, useRef, useEffect } from 'react';
import { searchModels } from '../api';

export default function StepSearch({ gender, onResults, onBack }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSearch(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const results = await searchModels(gender, trimmed);
      if (results.length === 0) {
        setError('Nenhum modelo encontrado. Verifique o nome e tente novamente.');
      } else {
        onResults(results);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-8 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">Buscar modelo</h2>
        <p className="text-sm text-gray-400">
          Pesquisando em{' '}
          <span className="font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md text-xs uppercase tracking-wide">
            {gender}
          </span>
        </p>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path strokeLinecap="round" strokeWidth="2" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null); }}
            placeholder="Nome do modelo..."
            disabled={loading}
            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 bg-white outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all placeholder-gray-300 disabled:opacity-50"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path strokeLinecap="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
            </svg>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Buscando...
            </span>
          ) : (
            'Buscar'
          )}
        </button>
      </form>
    </div>
  );
}

