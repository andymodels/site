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

function exportTXT(data) {
  const cats = modelCategories(data).join(', ');
  const line = (label, val) => val ? `${label.padEnd(16)}${val}\n` : '';
  const section = (title) => `\n${'─'.repeat(40)}\n${title.toUpperCase()}\n${'─'.repeat(40)}\n`;

  let txt = `ANDY MODELS — FICHA DO MODELO\n${'═'.repeat(40)}\n\n`;
  txt += line('Nome', data.name);
  txt += line('Status', data.model_status);
  txt += line('Categorias', cats);
  txt += line('Cidade', data.city);
  txt += line('Idade', data.age);

  if (data.height || data.bust || data.waist || data.hips || data.shoes || data.torax) {
    txt += section('Medidas');
    txt += line('Altura', data.height);
    txt += line('Busto/Tórax', data.bust || data.torax);
    txt += line('Cintura', data.waist);
    txt += line('Quadril', data.hips);
    txt += line('Calçado', data.shoes);
    txt += line('Terno', data.terno);
    txt += line('Camisa', data.camisa);
    txt += line('Manequim', data.manequim);
    txt += line('Olhos', data.eyes);
    txt += line('Cabelo', data.hair);
  }

  if (data.phone || data.email || data.whatsapp) {
    txt += section('Contato');
    txt += line('Telefone', data.phone);
    txt += line('Telefone 2', data.phone2);
    txt += line('WhatsApp', data.whatsapp);
    txt += line('E-mail', data.email);
  }

  if (data.instagram || data.tiktok || data.youtube) {
    txt += section('Redes Sociais');
    txt += line('Instagram', data.instagram);
    txt += line('TikTok', data.tiktok);
    txt += line('YouTube', data.youtube);
    txt += line('Facebook', data.facebook);
    txt += line('X', data.twitter);
  }

  if (data.cpf || data.rg || data.passport) {
    txt += section('Documentos');
    txt += line('CPF', data.cpf);
    txt += line('RG', data.rg);
    txt += line('Passaporte', data.passport);
    txt += line('Val. Passaporte', data.passport_expiry);
    txt += line('Visto', data.visa_type);
    txt += line('Val. Visto', data.visa_expiry);
    txt += line('Nacionalidade', data.nationality);
  }

  if (data.bank_name || data.bank_pix) {
    txt += section('Dados Bancários');
    txt += line('Banco', data.bank_name);
    txt += line('Agência', data.bank_agency);
    txt += line('Conta', data.bank_account);
    txt += line('Tipo', data.bank_account_type);
    txt += line('PIX', data.bank_pix);
  }

  if (data.address || data.address_city) {
    txt += section('Endereço');
    txt += line('Rua', data.address);
    txt += line('Cidade', data.address_city);
    txt += line('Estado', data.address_state);
    txt += line('País', data.address_country);
    txt += line('CEP', data.address_zip);
  }

  if (data.emergency_name) {
    txt += section('Emergência');
    txt += line('Nome', data.emergency_name);
    txt += line('Telefone', data.emergency_phone);
    txt += line('Parentesco', data.emergency_relation);
  }

  if (data.agent_notes) {
    txt += section('Notas');
    txt += data.agent_notes + '\n';
  }

  txt += `\n${'═'.repeat(40)}\nGerado em ${new Date().toLocaleString('pt-BR')}\n`;

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${(data.name || 'modelo').toLowerCase().replace(/\s+/g, '_')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function DataRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-[9px] tracking-wider uppercase text-gray-400 w-28 flex-shrink-0 pt-px">{label}</span>
      <span className="text-[12px] text-gray-800 break-all leading-snug">{value}</span>
    </div>
  );
}

function SocialLink({ label, handle, base }) {
  if (!handle) return null;
  const clean = handle.replace(/^@/, '').replace(/^https?:\/\/[^/]+\//, '');
  return (
    <div className="flex gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-[9px] tracking-wider uppercase text-gray-400 w-28 flex-shrink-0 pt-px">{label}</span>
      <a href={`${base}${clean}`} target="_blank" rel="noreferrer"
        className="text-[12px] text-black hover:underline break-all leading-snug">
        @{clean}
      </a>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[9px] tracking-[0.22em] uppercase text-gray-300 font-medium mb-1 mt-5">{title}</p>
      <div className="bg-gray-50/60 px-3 py-1 rounded-sm">{children}</div>
    </div>
  );
}

function ModelDrawer({ model, onClose, onDelete }) {
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
  const d = full || model;
  const cats = modelCategories(d);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[420px] bg-white z-50 shadow-2xl flex flex-col">

        {/* Header compacto */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0 bg-white">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.22em] uppercase font-semibold truncate">{d.name}</p>
            {d.model_status && <p className="text-[9px] tracking-wider text-gray-400 uppercase mt-0.5">{d.model_status}</p>}
          </div>
          <button onClick={onClose} className="ml-3 text-xl leading-none text-gray-300 hover:text-black transition-colors flex-shrink-0">×</button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto">

          {/* Foto grande */}
          {(d.cover_image || d.cover_thumb) ? (
            <div className="relative bg-gray-100" style={{ aspectRatio: '3/4' }}>
              <img src={d.cover_image || d.cover_thumb} alt={d.name}
                className="w-full h-full object-cover object-top" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p className="text-white text-sm tracking-[0.15em] uppercase font-medium">{d.name}</p>
                {d.model_status && <p className="text-white/70 text-[9px] tracking-wider uppercase mt-0.5">{d.model_status}</p>}
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 flex items-center justify-center" style={{ aspectRatio: '3/4' }}>
              <span className="text-gray-300 text-xs tracking-widest uppercase">Sem foto</span>
            </div>
          )}

          {/* Categorias + status ativo */}
          <div className="px-5 py-3 flex items-center gap-2 flex-wrap border-b border-gray-50">
            {cats.map(c => (
              <span key={c} className="text-[9px] tracking-wider uppercase px-2 py-0.5 bg-gray-100 text-gray-600">{c}</span>
            ))}
            <span className={`ml-auto text-[9px] tracking-wider uppercase px-2 py-0.5 ${d.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              {d.active ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          <div className="px-5 pb-6">
            {/* Medidas */}
            {(d.height || d.bust || d.waist || d.hips || d.shoes || d.torax || d.terno) && (
              <Section title="Medidas">
                <DataRow label="Altura"   value={d.height} />
                <DataRow label="Busto"    value={d.bust} />
                <DataRow label="Cintura"  value={d.waist} />
                <DataRow label="Quadril"  value={d.hips} />
                <DataRow label="Calçado"  value={d.shoes} />
                <DataRow label="Tórax"    value={d.torax} />
                <DataRow label="Terno"    value={d.terno} />
                <DataRow label="Camisa"   value={d.camisa} />
                <DataRow label="Manequim" value={d.manequim} />
                <DataRow label="Olhos"    value={d.eyes} />
                <DataRow label="Cabelo"   value={d.hair} />
              </Section>
            )}

            {/* Contato */}
            {(d.phone || d.phone2 || d.email || d.whatsapp) && (
              <Section title="Contato">
                <DataRow label="Telefone"   value={d.phone} />
                <DataRow label="Telefone 2" value={d.phone2} />
                <DataRow label="WhatsApp"   value={d.whatsapp} />
                <DataRow label="E-mail"     value={d.email} />
              </Section>
            )}

            {/* Redes */}
            {(d.instagram || d.tiktok || d.youtube || d.facebook || d.twitter) && (
              <Section title="Redes Sociais">
                <SocialLink label="Instagram" handle={d.instagram} base="https://instagram.com/" />
                <SocialLink label="TikTok"    handle={d.tiktok}    base="https://tiktok.com/@" />
                <SocialLink label="YouTube"   handle={d.youtube}   base="https://youtube.com/@" />
                <SocialLink label="Facebook"  handle={d.facebook}  base="https://facebook.com/" />
                <SocialLink label="X"         handle={d.twitter}   base="https://x.com/" />
              </Section>
            )}

            {/* Documentos */}
            {(d.cpf || d.rg || d.passport) && (
              <Section title="Documentos">
                <DataRow label="CPF"        value={d.cpf} />
                <DataRow label="RG"         value={d.rg} />
                <DataRow label="Passaporte" value={d.passport} />
                <DataRow label="Validade"   value={d.passport_expiry} />
                <DataRow label="Visto"      value={d.visa_type} />
                <DataRow label="Val. Visto" value={d.visa_expiry} />
                <DataRow label="Nac."       value={d.nationality} />
              </Section>
            )}

            {/* Endereço */}
            {(d.address || d.address_city) && (
              <Section title="Endereço">
                <DataRow label="Rua"    value={d.address} />
                <DataRow label="Cidade" value={d.address_city} />
                <DataRow label="Estado" value={d.address_state} />
                <DataRow label="País"   value={d.address_country} />
                <DataRow label="CEP"    value={d.address_zip} />
              </Section>
            )}

            {/* Bancário */}
            {(d.bank_name || d.bank_pix) && (
              <Section title="Dados Bancários">
                <DataRow label="Banco"   value={d.bank_name} />
                <DataRow label="Agência" value={d.bank_agency} />
                <DataRow label="Conta"   value={d.bank_account} />
                <DataRow label="Tipo"    value={d.bank_account_type} />
                <DataRow label="PIX"     value={d.bank_pix} />
              </Section>
            )}

            {/* Emergência */}
            {(d.emergency_name || d.emergency_phone) && (
              <Section title="Emergência">
                <DataRow label="Nome"       value={d.emergency_name} />
                <DataRow label="Telefone"   value={d.emergency_phone} />
                <DataRow label="Parentesco" value={d.emergency_relation} />
              </Section>
            )}

            {/* Contrato / Notas */}
            {(d.contract_start || d.contract_end || d.agent_notes) && (
              <Section title="Interno">
                <DataRow label="Início"  value={d.contract_start} />
                <DataRow label="Término" value={d.contract_end} />
                {d.agent_notes && (
                  <div className="py-1.5">
                    <p className="text-[9px] tracking-wider uppercase text-gray-400 mb-1">Notas</p>
                    <p className="text-[12px] text-gray-700 whitespace-pre-wrap leading-relaxed">{d.agent_notes}</p>
                  </div>
                )}
              </Section>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 flex-shrink-0 bg-white">
          <Link to={`/admin/models/${model.id}/edit`}
            className="flex-1 text-center text-[10px] tracking-widest uppercase bg-black text-white py-2.5 hover:bg-gray-800 transition-colors">
            Editar
          </Link>
          <button onClick={() => full && exportTXT(full)}
            disabled={!full}
            title="Exportar dados em TXT"
            className="text-[10px] tracking-widest uppercase border border-gray-200 text-gray-600 px-4 py-2.5 hover:border-black hover:text-black transition-colors disabled:opacity-30">
            Exportar TXT
          </button>
          <button onClick={() => onDelete(model.id, model.name)}
            className="text-[10px] tracking-widest uppercase text-gray-300 hover:text-red-500 transition-colors px-2">
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
          <Link to="/admin/instagram"
            className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">
            Instagram
          </Link>
          <Link to="/admin/applications"
            className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">
            Inscrições
          </Link>
          <Link to="/admin/models/new"
            className="text-xs tracking-widest uppercase bg-black text-white px-5 py-2.5 hover:bg-gray-800 transition-colors">
            + Novo Modelo
          </Link>
          <Link to="/admin/home"
            className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors border border-gray-200 px-4 py-2.5 hover:border-black">
            Home
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
