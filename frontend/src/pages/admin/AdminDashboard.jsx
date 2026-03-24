import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminGetModels, adminDeleteModel } from '../../api';

const TABS = [
  { value: 'all',      label: 'All'      },
  { value: 'women',    label: 'Women'    },
  { value: 'men',      label: 'Men'      },
  { value: 'creators', label: 'Creators' },
];

function modelCategories(model) {
  if (Array.isArray(model.categories) && model.categories.length) return model.categories;
  if (typeof model.categories === 'string') {
    try { const p = JSON.parse(model.categories); if (Array.isArray(p)) return p; } catch {}
  }
  return [model.category].filter(Boolean);
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <span className="text-[9px] tracking-wider uppercase text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 break-all">{value}</span>
    </div>
  );
}

function SocialLink({ label, handle, base }) {
  if (!handle) return null;
  const clean = handle.replace(/^@/, '').replace(/^https?:\/\/[^/]+\//, '');
  return (
    <div className="flex gap-3">
      <span className="text-[9px] tracking-wider uppercase text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <a href={`${base}${clean}`} target="_blank" rel="noreferrer"
        className="text-sm text-black hover:underline break-all">
        @{clean}
      </a>
    </div>
  );
}

function ModelDrawer({ model, onClose, onEdit, onDelete }) {
  const [full, setFull] = useState(null);
  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    if (!model) return;
    setFull(null);
    fetch(`/api/admin/models/${model.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(setFull).catch(() => setFull(model));
  }, [model?.id]);

  if (!model) return null;
  const data = full || model;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <p className="text-xs tracking-[0.25em] uppercase font-medium truncate pr-4">{data.name}</p>
          <button onClick={onClose} className="text-2xl leading-none text-gray-300 hover:text-black transition-colors flex-shrink-0">×</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Foto */}
          {(data.cover_image || data.cover_thumb) && (
            <div className="px-6 pt-5">
              <img
                src={data.cover_image || data.cover_thumb}
                alt={data.name}
                className="w-full max-h-72 object-cover object-top bg-gray-100"
              />
            </div>
          )}

          <div className="px-6 py-5 space-y-6">
            {/* Info básica */}
            <div className="space-y-2.5">
              <p className="text-[9px] tracking-[0.2em] uppercase text-gray-300 border-b border-gray-100 pb-1.5 mb-3">Perfil</p>
              <Row label="Nome"       value={data.name} />
              <Row label="Status"     value={data.model_status} />
              <Row label="Cidade"     value={data.city} />
              <Row label="Idade"      value={data.age} />
              <Row label="Categorias" value={modelCategories(data).join(', ')} />
            </div>

            {/* Medidas */}
            {(data.height || data.bust || data.waist || data.hips || data.shoes || data.torax || data.terno) && (
              <div className="space-y-2.5">
                <p className="text-[9px] tracking-[0.2em] uppercase text-gray-300 border-b border-gray-100 pb-1.5 mb-3">Medidas</p>
                <Row label="Altura"   value={data.height} />
                <Row label="Busto"    value={data.bust} />
                <Row label="Cintura"  value={data.waist} />
                <Row label="Quadril"  value={data.hips} />
                <Row label="Calçado"  value={data.shoes} />
                <Row label="Tórax"    value={data.torax} />
                <Row label="Terno"    value={data.terno} />
                <Row label="Camisa"   value={data.camisa} />
                <Row label="Manequim" value={data.manequim} />
                <Row label="Olhos"    value={data.eyes} />
                <Row label="Cabelo"   value={data.hair} />
              </div>
            )}

            {/* Dados internos */}
            {(data.phone || data.phone2 || data.email || data.whatsapp || data.cpf || data.rg || data.passport) && (
              <div className="space-y-2.5">
                <p className="text-[9px] tracking-[0.2em] uppercase text-gray-300 border-b border-gray-100 pb-1.5 mb-3">Dados Internos</p>
                <Row label="Telefone"  value={data.phone} />
                <Row label="Telefone 2" value={data.phone2} />
                <Row label="WhatsApp"  value={data.whatsapp} />
                <Row label="E-mail"    value={data.email} />
                <Row label="CPF"       value={data.cpf} />
                <Row label="RG"        value={data.rg} />
                <Row label="Passaporte" value={data.passport} />
                <Row label="Validade"  value={data.passport_expiry} />
                <Row label="Visto"     value={data.visa_type} />
                <Row label="Val. Visto" value={data.visa_expiry} />
                <Row label="Nac."      value={data.nationality} />
              </div>
            )}

            {/* Endereço */}
            {(data.address || data.address_city) && (
              <div className="space-y-2.5">
                <p className="text-[9px] tracking-[0.2em] uppercase text-gray-300 border-b border-gray-100 pb-1.5 mb-3">Endereço</p>
                <Row label="Rua"    value={data.address} />
                <Row label="Cidade" value={data.address_city} />
                <Row label="Estado" value={data.address_state} />
                <Row label="País"   value={data.address_country} />
                <Row label="CEP"    value={data.address_zip} />
              </div>
            )}

            {/* Dados bancários */}
            {(data.bank_name || data.bank_pix) && (
              <div className="space-y-2.5">
                <p className="text-[9px] tracking-[0.2em] uppercase text-gray-300 border-b border-gray-100 pb-1.5 mb-3">Dados Bancários</p>
                <Row label="Banco"   value={data.bank_name} />
                <Row label="Agência" value={data.bank_agency} />
                <Row label="Conta"   value={data.bank_account} />
                <Row label="Tipo"    value={data.bank_account_type} />
                <Row label="PIX"     value={data.bank_pix} />
              </div>
            )}

            {/* Redes sociais */}
            {(data.instagram || data.tiktok || data.youtube || data.facebook || data.twitter) && (
              <div className="space-y-2.5">
                <p className="text-[9px] tracking-[0.2em] uppercase text-gray-300 border-b border-gray-100 pb-1.5 mb-3">Redes Sociais</p>
                <SocialLink label="Instagram" handle={data.instagram} base="https://instagram.com/" />
                <SocialLink label="TikTok"    handle={data.tiktok}    base="https://tiktok.com/@" />
                <SocialLink label="YouTube"   handle={data.youtube}   base="https://youtube.com/@" />
                <SocialLink label="Facebook"  handle={data.facebook}  base="https://facebook.com/" />
                <SocialLink label="X"         handle={data.twitter}   base="https://x.com/" />
              </div>
            )}

            {/* Emergência */}
            {(data.emergency_name || data.emergency_phone) && (
              <div className="space-y-2.5">
                <p className="text-[9px] tracking-[0.2em] uppercase text-gray-300 border-b border-gray-100 pb-1.5 mb-3">Contato de Emergência</p>
                <Row label="Nome"       value={data.emergency_name} />
                <Row label="Telefone"   value={data.emergency_phone} />
                <Row label="Parentesco" value={data.emergency_relation} />
              </div>
            )}

            {/* Contrato */}
            {(data.contract_start || data.contract_end || data.agent_notes) && (
              <div className="space-y-2.5">
                <p className="text-[9px] tracking-[0.2em] uppercase text-gray-300 border-b border-gray-100 pb-1.5 mb-3">Interno</p>
                <Row label="Início"  value={data.contract_start} />
                <Row label="Término" value={data.contract_end} />
                {data.agent_notes && (
                  <div className="flex gap-3">
                    <span className="text-[9px] tracking-wider uppercase text-gray-400 w-24 flex-shrink-0 pt-0.5">Notas</span>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.agent_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 flex-shrink-0 bg-white">
          <Link to={`/admin/models/${model.id}/edit`}
            className="flex-1 text-center text-[11px] tracking-widest uppercase bg-black text-white py-2.5 hover:bg-gray-800 transition-colors">
            Editar Modelo
          </Link>
          <button onClick={() => onDelete(model.id, model.name)}
            className="text-[11px] tracking-widest uppercase text-gray-300 hover:text-red-500 transition-colors px-3">
            Deletar
          </button>
        </div>
      </div>
    </>
  );
}

export default function AdminDashboard() {
  const [models, setModels]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('all');
  const [drawer, setDrawer]   = useState(null);
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('admin_token');
    navigate('/admin');
  }

  async function load() {
    try { setModels(await adminGetModels()); }
    catch { logout(); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id, name) {
    if (!confirm(`Deletar "${name}"?`)) return;
    try {
      await adminDeleteModel(id);
      setModels(prev => prev.filter(m => m.id !== id));
      if (drawer?.id === id) setDrawer(null);
    } catch (e) { alert('Erro ao deletar: ' + e.message); }
  }

  const filtered = tab === 'all'
    ? models
    : models.filter(m => modelCategories(m).includes(tab));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Andy Models" className="h-10 w-auto object-contain"
            onError={e => { e.target.style.display = 'none'; }} />
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
              <button key={t.value} onClick={() => setTab(t.value)}
                className={`px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase transition-colors relative
                  ${tab === t.value
                    ? 'text-black after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-black'
                    : 'text-gray-400 hover:text-gray-700'}`}>
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
          {tab !== 'all' && <span className="ml-1 text-gray-300">em {TABS.find(t => t.value === tab)?.label}</span>}
        </p>

        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 bg-white animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-xs tracking-widest uppercase text-gray-300 mb-6">
              {tab === 'all' ? 'Nenhum modelo cadastrado' : `Nenhum modelo em ${TABS.find(t => t.value === tab)?.label}`}
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
                  const isOpen = drawer?.id === model.id;
                  return (
                    <tr key={model.id}
                      onClick={() => setDrawer(isOpen ? null : model)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors
                        ${isOpen ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
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
                        {model.model_status && (
                          <span className="ml-2 text-[9px] tracking-wider uppercase text-gray-400">{model.model_status}</span>
                        )}
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
                      <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
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

      {/* Drawer */}
      <ModelDrawer
        model={drawer}
        onClose={() => setDrawer(null)}
        onEdit={() => {}}
        onDelete={handleDelete}
      />
    </div>
  );
}
