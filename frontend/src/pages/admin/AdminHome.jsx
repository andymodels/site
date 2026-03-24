import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';
const TOKEN = () => localStorage.getItem('admin_token') || '';

function headers() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN()}` };
}

export default function AdminHome() {
  const navigate  = useNavigate();
  const [models,  setModels]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState({});
  const [saved,   setSaved]   = useState({});
  const [draft,   setDraft]   = useState({});   // { [id]: home_order value }

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${API}/api/admin/models?limit=500`, { headers: headers() });
    const data = await r.json();
    const all = data.models || data;
    const featured = all
      .filter(m => m.featured)
      .sort((a, b) => {
        const oa = a.home_order ?? 9999;
        const ob = b.home_order ?? 9999;
        return oa !== ob ? oa - ob : a.name.localeCompare(b.name);
      });
    setModels(featured);
    const initial = {};
    featured.forEach(m => { initial[m.id] = m.home_order ?? ''; });
    setDraft(initial);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(model) {
    const value = draft[model.id];
    const parsed = value === '' ? null : parseInt(value, 10);
    setSaving(p => ({ ...p, [model.id]: true }));
    const r = await fetch(`${API}/api/admin/models/${model.id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ home_order: parsed }),
    });
    setSaving(p => ({ ...p, [model.id]: false }));
    if (r.ok) {
      setSaved(p => ({ ...p, [model.id]: true }));
      setTimeout(() => setSaved(p => ({ ...p, [model.id]: false })), 1500);
      load();
    }
  }

  function moveRow(index, dir) {
    const next = [...models];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    // Reassign home_order 1..n
    const newDraft = { ...draft };
    next.forEach((m, i) => { newDraft[m.id] = i + 1; });
    setModels(next);
    setDraft(newDraft);
  }

  async function saveAll() {
    for (const m of models) {
      const value = draft[m.id];
      const parsed = value === '' ? null : parseInt(value, 10);
      await fetch(`${API}/api/admin/models/${m.id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ home_order: parsed }),
      });
    }
    load();
  }

  const colHdr = 'text-[10px] tracking-[0.2em] uppercase text-gray-400 font-medium text-left';
  const cell   = 'py-3 pr-4 text-sm font-light text-gray-700';

  return (
    <div className="min-h-screen bg-white px-8 py-10 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-gray-400 mb-1">Admin</p>
          <h1 className="text-xl font-light tracking-wide text-black">Ordem da Home</h1>
          <p className="text-xs text-gray-400 mt-1">Modelos em destaque · ordenação manual</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveAll}
            className="text-[10px] tracking-[0.2em] uppercase bg-black text-white px-5 py-2.5 hover:bg-gray-800 transition-colors"
          >
            Salvar tudo
          </button>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-[10px] tracking-[0.2em] uppercase border border-gray-200 px-4 py-2.5 hover:border-black transition-colors text-gray-500"
          >
            ← Voltar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      ) : models.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-20">
          Nenhum modelo marcado como destaque.
        </p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className={`${colHdr} w-10`}>#</th>
              <th className={`${colHdr} w-8`}></th>
              <th className={colHdr}>Modelo</th>
              <th className={`${colHdr} w-24`}>Categoria</th>
              <th className={`${colHdr} w-28 text-center`}>Ordem</th>
              <th className={`${colHdr} w-20`}></th>
            </tr>
          </thead>
          <tbody>
            {models.map((m, i) => (
              <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                {/* Posição visual */}
                <td className={`${cell} text-gray-300 text-xs w-10`}>{i + 1}</td>

                {/* Setas de reordenação */}
                <td className="py-3 pr-2 w-8">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveRow(i, -1)}
                      disabled={i === 0}
                      className="text-gray-300 hover:text-black disabled:opacity-20 leading-none text-[10px]"
                      title="Mover para cima"
                    >▲</button>
                    <button
                      onClick={() => moveRow(i, 1)}
                      disabled={i === models.length - 1}
                      className="text-gray-300 hover:text-black disabled:opacity-20 leading-none text-[10px]"
                      title="Mover para baixo"
                    >▼</button>
                  </div>
                </td>

                {/* Nome */}
                <td className={cell}>
                  <span
                    className="cursor-pointer hover:underline"
                    onClick={() => navigate(`/admin/models/${m.id}/edit`)}
                  >
                    {m.name}
                  </span>
                </td>

                {/* Categoria */}
                <td className={`${cell} text-gray-400 text-xs uppercase tracking-wider w-24`}>
                  {m.category}
                </td>

                {/* Input de ordem */}
                <td className="py-3 pr-4 w-28 text-center">
                  <input
                    type="number"
                    min="1"
                    value={draft[m.id] ?? ''}
                    onChange={e => setDraft(p => ({ ...p, [m.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && save(m)}
                    className="w-16 text-center border-b border-gray-300 bg-transparent text-sm py-1 outline-none focus:border-black transition-colors"
                    placeholder="—"
                  />
                </td>

                {/* Botão salvar individual */}
                <td className="py-3 w-20 text-right">
                  {saved[m.id] ? (
                    <span className="text-[10px] text-green-600 tracking-wider uppercase">✓ Salvo</span>
                  ) : (
                    <button
                      onClick={() => save(m)}
                      disabled={saving[m.id]}
                      className="text-[10px] tracking-[0.15em] uppercase text-gray-400 hover:text-black disabled:opacity-40 transition-colors"
                    >
                      {saving[m.id] ? '...' : 'Salvar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && models.length > 0 && (
        <p className="text-[10px] text-gray-300 mt-6 text-center tracking-wide">
          Use as setas para reordenar visualmente · ou edite o número diretamente · Enter ou "Salvar" para confirmar
        </p>
      )}
    </div>
  );
}
