import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STATUS_OPTIONS = [
  { value: 'new',       label: 'Novo',      color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { value: 'reviewing', label: 'Avaliado',   color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'approved',  label: 'Aprovado',  color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'rejected',  label: 'Rejeitado', color: 'bg-red-50 text-red-500 border-red-200' },
];

const CAT_FILTERS = [
  { value: '',      label: 'Todas' },
  { value: 'women', label: 'Feminino' },
  { value: 'men',   label: 'Masculino' },
];

const STATUS_FILTERS = [
  { value: '',          label: 'Todos status' },
  { value: 'new',       label: 'Novos' },
  { value: 'reviewing', label: 'Avaliados' },
  { value: 'approved',  label: 'Aprovados' },
  { value: 'rejected',  label: 'Rejeitados' },
];

function statusInfo(val) {
  return STATUS_OPTIONS.find(s => s.value === val) || STATUS_OPTIONS[0];
}

export default function AdminApplications() {
  const [apps, setApps]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [catFilter, setCat]     = useState('');
  const [stFilter, setSt]       = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving]     = useState(false);
  const token = localStorage.getItem('admin_token');

  function buildUrl() {
    const p = new URLSearchParams();
    if (catFilter) p.set('category', catFilter);
    if (stFilter)  p.set('status', stFilter);
    return `/api/applications/admin?${p.toString()}`;
  }

  async function load() {
    setLoading(true);
    const r = await fetch(buildUrl(), { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    setApps(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [catFilter, stFilter]);

  async function updateStatus(id, status) {
    setSaving(true);
    await fetch(`/api/applications/admin/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    if (selected?.id === id) setSelected(s => ({ ...s, status }));
    setSaving(false);
  }

  async function saveNotes(id, notes) {
    await fetch(`/api/applications/admin/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ notes }),
    });
  }

  async function remove(id) {
    if (!confirm('Remover esta inscrição permanentemente?')) return;
    await fetch(`/api/applications/admin/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setApps(prev => prev.filter(a => a.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  const lbl = 'text-xs tracking-widest uppercase text-gray-400 block mb-1';
  const inp = 'w-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black transition-colors bg-white';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 flex-shrink-0">
        <Link to="/admin/dashboard" className="text-xs tracking-widest uppercase text-gray-400 hover:text-black transition-colors">
          ← Dashboard
        </Link>
        <span className="text-gray-200">|</span>
        <span className="text-xs font-light tracking-[0.3em] uppercase">Cadastro do Site</span>
        <span className="ml-auto text-xs text-gray-400">{apps.length} inscrição(ões)</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6">
            {/* Filtros */}
            <div className="flex flex-wrap gap-2 mb-6">
              {CAT_FILTERS.map(c => (
                <button key={c.value} onClick={() => setCat(c.value)}
                  className={`text-[10px] tracking-[0.18em] uppercase px-4 py-2 border transition-colors ${
                    catFilter === c.value ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'
                  }`}>
                  {c.label}
                </button>
              ))}
              <span className="w-px bg-gray-200 mx-1 self-stretch" />
              {STATUS_FILTERS.map(s => (
                <button key={s.value} onClick={() => setSt(s.value)}
                  className={`text-[10px] tracking-[0.18em] uppercase px-4 py-2 border transition-colors ${
                    stFilter === s.value ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>

            {loading && (
              <p className="text-xs tracking-widest uppercase text-gray-300 text-center py-20">Carregando...</p>
            )}
            {!loading && apps.length === 0 && (
              <p className="text-xs tracking-widest uppercase text-gray-300 text-center py-20">Nenhuma inscrição encontrada.</p>
            )}

            {!loading && apps.length > 0 && (
              <div className="space-y-2">
                {apps.map(app => {
                  const st = statusInfo(app.status);
                  const isActive = selected?.id === app.id;
                  return (
                    <div key={app.id}
                      className={`bg-white border transition-colors px-5 py-4 flex items-center gap-5 group ${
                        isActive ? 'border-black' : 'border-gray-100 hover:border-gray-300'
                      }`}>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelected(app)}>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-medium text-black truncate">{app.name}</p>
                          <span className={`text-[9px] tracking-wider uppercase px-2 py-0.5 border rounded-sm ${st.color}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {app.category === 'men' ? 'Masculino' : 'Feminino'}
                          {app.age ? ` · ${app.age} anos` : ''}
                          {app.height ? ` · ${app.height}` : ''}
                          {app.city ? ` · ${app.city}` : ''}
                        </p>
                      </div>
                      <p className="text-[10px] text-gray-300 flex-shrink-0">
                        {new Date(app.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      <button
                        onClick={e => { e.stopPropagation(); remove(app.id); }}
                        title="Apagar cadastro"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 flex-shrink-0"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Painel de detalhes */}
        {selected && (
          <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs tracking-[0.25em] uppercase font-medium">{selected.name}</p>
              <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-black text-lg leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Status */}
              <div>
                <label className={lbl}>Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s.value}
                      disabled={saving}
                      onClick={() => updateStatus(selected.id, s.value)}
                      className={`text-[10px] tracking-wider uppercase px-3 py-1.5 border transition-colors ${
                        selected.status === s.value
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dados */}
              <div className="space-y-3 text-sm">
                {[
                  ['Categoria',      selected.category === 'men' ? 'Masculino' : 'Feminino'],
                  ['Idade',          selected.age || '—'],
                  ['Altura',         selected.height || '—'],
                  ['Cidade / Estado',[selected.city, selected.state].filter(Boolean).join(' / ') || '—'],
                  ['E-mail',         selected.email],
                  ['Telefone',       selected.phone || '—'],
                  ['Instagram',      selected.instagram || '—'],
                  ['Data',           new Date(selected.created_at).toLocaleString('pt-BR')],
                ].map(([l, v]) => (
                  <div key={l} className="flex gap-3">
                    <span className="text-[10px] tracking-wider uppercase text-gray-400 w-28 flex-shrink-0 pt-0.5">{l}</span>
                    <span className="text-gray-800 break-all">{v}</span>
                  </div>
                ))}
              </div>

              {/* Fotos */}
              {selected.photos?.length > 0 && (
                <div>
                  <label className={lbl}>Fotos enviadas ({selected.photos.length})</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selected.photos.map((p, i) => (
                      <a key={i} href={p} target="_blank" rel="noreferrer">
                        <img src={p} alt={`foto ${i+1}`}
                          className="w-16 h-20 object-cover object-top bg-gray-100 hover:opacity-80 transition-opacity" />
                      </a>
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-400 mt-2">Fotos também enviadas por e-mail. Removidas automaticamente após 30 dias.</p>
                </div>
              )}

              {/* Notas internas */}
              <div>
                <label className={lbl}>Notas internas</label>
                <textarea
                  className={inp + ' resize-none'}
                  rows={4}
                  defaultValue={selected.notes || ''}
                  onBlur={e => saveNotes(selected.id, e.target.value)}
                  placeholder="Observações sobre o candidato..."
                />
                <p className="text-[9px] text-gray-400 mt-1">Salvo automaticamente ao sair do campo.</p>
              </div>

              {/* Ações */}
              <div className="pt-2 border-t border-gray-100 flex gap-3">
                {selected.email && (
                  <a href={`mailto:${selected.email}`}
                    className="text-[10px] tracking-widest uppercase border border-gray-200 text-gray-600 px-4 py-2 hover:border-black hover:text-black transition-colors">
                    Enviar E-mail
                  </a>
                )}
                <button onClick={() => remove(selected.id)}
                  className="text-[10px] tracking-widest uppercase text-red-400 hover:text-red-600 transition-colors ml-auto">
                  Remover
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
