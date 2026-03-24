import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminGetModels, adminDeleteModel } from '../../api';

const TABS = [
  { value: 'all',       label: 'All'       },
  { value: 'women',     label: 'Women'     },
  { value: 'men',       label: 'Men'       },
  { value: 'creators',  label: 'Creators'  },
  { value: 'new-faces', label: 'New Faces' },
];

function modelCategories(model) {
  if (Array.isArray(model.categories) && model.categories.length) return model.categories;
  if (typeof model.categories === 'string') {
    try { const p = JSON.parse(model.categories); if (Array.isArray(p)) return p; } catch {}
  }
  return [model.category].filter(Boolean);
}

export default function AdminDashboard() {
  const [models, setModels]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('all');
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('admin_token');
    navigate('/admin');
  }

  async function load() {
    try {
      setModels(await adminGetModels());
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id, name) {
    if (!confirm(`Deletar "${name}"?`)) return;
    try {
      await adminDeleteModel(id);
      setModels(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      alert('Erro ao deletar: ' + e.message);
    }
  }

  const filtered = tab === 'all'
    ? models
    : models.filter(m => modelCategories(m).includes(tab));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src="/logo.png"
            alt="Andy Models"
            className="h-10 w-auto object-contain"
            onError={e => { e.target.style.display = 'none'; }}
          />
          <span className="text-[10px] font-light tracking-[0.3em] uppercase text-gray-400">Admin</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/admin/radio"
            className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">
            Rádio
          </Link>
          <Link to="/admin/applications"
            className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">
            Inscrições
          </Link>
          <Link to="/admin/models/new"
            className="text-xs tracking-widest uppercase bg-black text-white px-5 py-2.5 hover:bg-gray-800 transition-colors">
            + Novo Modelo
          </Link>
          <Link to="/admin/sync"
            className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors border border-gray-200 px-4 py-2.5 hover:border-black">
            Sync Drive
          </Link>
          <button onClick={logout}
            className="text-xs tracking-widest uppercase text-gray-400 hover:text-black transition-colors">
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-8">

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
          {TABS.map(t => {
            const count = t.value === 'all'
              ? models.length
              : models.filter(m => modelCategories(m).includes(t.value)).length;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase transition-colors relative
                  ${tab === t.value
                    ? 'text-black after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-black'
                    : 'text-gray-400 hover:text-gray-700'
                  }`}
              >
                {t.label}
                <span className={`ml-1.5 text-[9px] ${tab === t.value ? 'text-gray-400' : 'text-gray-300'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-5">
          {filtered.length} modelo{filtered.length !== 1 ? 's' : ''}
          {tab !== 'all' && <span className="ml-1 text-gray-300">em {TABS.find(t=>t.value===tab)?.label}</span>}
        </p>

        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-white animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-xs tracking-widest uppercase text-gray-300 mb-6">
              {tab === 'all' ? 'Nenhum modelo cadastrado' : `Nenhum modelo em ${TABS.find(t=>t.value===tab)?.label}`}
            </p>
            {tab === 'all' && (
              <Link to="/admin/models/new"
                className="text-xs tracking-widest uppercase border-b border-black pb-0.5 hover:text-gray-500 hover:border-gray-500 transition-colors">
                Cadastrar primeiro modelo
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-[10px] tracking-widest uppercase text-gray-300 font-normal w-16">Foto</th>
                  <th className="text-left px-5 py-3 text-[10px] tracking-widest uppercase text-gray-300 font-normal">Nome</th>
                  <th className="text-left px-5 py-3 text-[10px] tracking-widest uppercase text-gray-300 font-normal hidden sm:table-cell">Categorias</th>
                  <th className="text-left px-5 py-3 text-[10px] tracking-widest uppercase text-gray-300 font-normal hidden md:table-cell">Cidade</th>
                  <th className="text-left px-5 py-3 text-[10px] tracking-widest uppercase text-gray-300 font-normal hidden md:table-cell">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(model => {
                  const cats = modelCategories(model);
                  return (
                    <tr key={model.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        {model.cover_thumb || model.cover_image ? (
                          <img src={model.cover_thumb || model.cover_image} alt={model.name}
                            className="w-10 h-12 object-cover object-top bg-gray-100" />
                        ) : (
                          <div className="w-10 h-12 bg-gray-100" />
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm font-light">{model.name}</span>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {cats.map(c => (
                            <span key={c}
                              className={`text-[9px] tracking-wider uppercase px-1.5 py-0.5 border
                                ${tab === c ? 'border-black text-black' : 'border-gray-200 text-gray-400'}`}>
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className="text-xs text-gray-400">{model.city || '—'}</span>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className={`text-xs tracking-wider ${model.active ? 'text-green-600' : 'text-gray-300'}`}>
                          {model.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-4 justify-end">
                          <Link to={`/admin/models/${model.id}/edit`}
                            className="text-xs tracking-widest uppercase text-gray-400 hover:text-black transition-colors">
                            Editar
                          </Link>
                          <button onClick={() => handleDelete(model.id, model.name)}
                            className="text-xs tracking-widest uppercase text-gray-300 hover:text-red-500 transition-colors">
                            Deletar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
