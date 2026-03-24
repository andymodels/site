import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { adminGetModel, adminCreateModel, adminUpdateModel } from '../../api';
import { parseVideoUrl } from '../../utils/videoUtils';

const ALL_CATEGORIES = [
  { value: 'women',     label: 'Women'     },
  { value: 'men',       label: 'Men'       },
  { value: 'new-faces', label: 'New Faces' },
  { value: 'creators',  label: 'Creators'  },
];

const EMPTY = {
  name: '', age: '', height: '', bust: '', waist: '',
  hips: '', shoes: '', eyes: '', hair: '', city: '', bio: '',
  featured: false, active: true,
  torax: '', terno: '', camisa: '', manequim: '',
  model_status: 'In Town',
  phone: '', phone2: '', email: '', whatsapp: '',
  cpf: '', rg: '', passport: '', passport_expiry: '', visa_type: '', visa_expiry: '', nationality: '',
  address: '', address_city: '', address_state: '', address_country: '', address_zip: '',
  bank_name: '', bank_agency: '', bank_account: '', bank_account_type: '', bank_pix: '',
  instagram: '', tiktok: '', youtube: '', facebook: '', twitter: '',
  emergency_name: '', emergency_phone: '', emergency_relation: '',
  agent_notes: '', contract_start: '', contract_end: '',
};

// ── Draggable Media Grid ─────────────────────────────────────────────────────
function MediaGrid({ items, onReorder, onSetCover, onTogglePolaroid, onRemove }) {
  const dragIdx = useRef(null);

  function onDragStart(i) { dragIdx.current = i; }
  function onDragOver(e, i) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    dragIdx.current = i;
    onReorder(next);
  }
  function onDrop() { dragIdx.current = null; }

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item, i) => {
        const isFirst = i === 0;
        const vid = item.type === 'video' ? parseVideoUrl(item.url) : null;
        const preview = item.type === 'image' ? (item.thumb || item.url) : (vid?.thumb || null);
        return (
          <div
            key={i}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={e => onDragOver(e, i)}
            onDrop={onDrop}
            className={`relative group cursor-grab select-none border-2 transition-colors
              ${isFirst ? 'border-black' : item.polaroid ? 'border-yellow-400' : 'border-transparent'}`}
          >
            {preview ? (
              <img src={preview} alt="" className="w-20 h-28 object-cover object-top bg-gray-100 block" />
            ) : (
              <div className="w-20 h-28 bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400 text-lg">▶</span>
              </div>
            )}
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-6 h-6 bg-white bg-opacity-80 rounded-full flex items-center justify-center">
                  <span className="text-black text-[10px] ml-0.5">▶</span>
                </div>
              </div>
            )}
            {isFirst && (
              <span className="absolute top-1 left-1 bg-black text-white text-[7px] tracking-widest uppercase px-1 py-0.5">
                Capa
              </span>
            )}
            {item.polaroid && (
              <span className="absolute top-1 right-1 bg-yellow-400 text-black text-[7px] px-1 py-0.5">
                Pola
              </span>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
              {!isFirst && item.type === 'image' && (
                <button type="button" title="Definir como capa" onClick={() => onSetCover(i)}
                  className="text-[9px] bg-white text-black px-1.5 py-0.5 font-bold">★ Capa</button>
              )}
              <button type="button" title={item.polaroid ? 'Remover pola' : 'Marcar como pola'} onClick={() => onTogglePolaroid(i)}
                className={`text-[9px] px-1.5 py-0.5 font-bold ${item.polaroid ? 'bg-yellow-400 text-black' : 'bg-white text-black'}`}>
                Pola
              </button>
              <button type="button" title="Remover" onClick={() => onRemove(i)}
                className="text-[9px] bg-white text-black px-1.5 py-0.5 font-bold">× Del</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Form ────────────────────────────────────────────────────────────────
export default function ModelForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm]               = useState(EMPTY);
  const [categories, setCategories]   = useState(['women']);
  const [mediaItems, setMediaItems]   = useState([]);
  const [scrapeUrl, setScrapeUrl]       = useState('');
  const [scraping, setScraping]         = useState(false);
  const [scrapeResult, setScrapeResult] = useState(null);
  const [urlInput, setUrlInput]         = useState('');
  const [urlPolaroid, setUrlPolaroid]   = useState(false);
  const [urlMode, setUrlMode]           = useState('import'); // 'import' | 'direct'
  const [urlImporting, setUrlImporting] = useState(false);
  const [urlResult, setUrlResult]       = useState(null);
  const [videoInput, setVideoInput]   = useState('');
  const [videoError, setVideoError]   = useState('');
  const [coverFile, setCoverFile]     = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [loading, setLoading]         = useState(isEdit);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const galleryRef = useRef();

  useEffect(() => {
    if (!isEdit) return;
    adminGetModel(id)
      .then(model => {
        setForm({
          name: model.name || '', age: model.age || '', height: model.height || '',
          bust: model.bust || '', waist: model.waist || '', hips: model.hips || '',
          shoes: model.shoes || '', eyes: model.eyes || '', hair: model.hair || '',
          city: model.city || '', bio: model.bio || '',
          featured: Boolean(model.featured), active: model.active !== 0,
          torax: model.torax || '', terno: model.terno || '', camisa: model.camisa || '', manequim: model.manequim || '',
          model_status: model.model_status || 'In Town',
          phone: model.phone || '', phone2: model.phone2 || '', email: model.email || '', whatsapp: model.whatsapp || '',
          cpf: model.cpf || '', rg: model.rg || '', passport: model.passport || '',
          passport_expiry: model.passport_expiry || '', visa_type: model.visa_type || '',
          visa_expiry: model.visa_expiry || '', nationality: model.nationality || '',
          address: model.address || '', address_city: model.address_city || '',
          address_state: model.address_state || '', address_country: model.address_country || '',
          address_zip: model.address_zip || '',
          bank_name: model.bank_name || '', bank_agency: model.bank_agency || '',
          bank_account: model.bank_account || '', bank_account_type: model.bank_account_type || '',
          bank_pix: model.bank_pix || '',
          instagram: model.instagram || '', tiktok: model.tiktok || '',
          youtube: model.youtube || '', facebook: model.facebook || '', twitter: model.twitter || '',
          emergency_name: model.emergency_name || '', emergency_phone: model.emergency_phone || '',
          emergency_relation: model.emergency_relation || '',
          agent_notes: model.agent_notes || '', contract_start: model.contract_start || '',
          contract_end: model.contract_end || '',
        });
        setCategories(model.categories?.length ? model.categories : [model.category || 'women']);
        setMediaItems(model.media || []);
      })
      .catch(() => navigate('/admin/dashboard'))
      .finally(() => setLoading(false));
  }, [id]);

  function field(key) {
    return { value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) };
  }
  function toggleCategory(val) {
    setCategories(prev =>
      prev.includes(val) ? (prev.length > 1 ? prev.filter(c => c !== val) : prev) : [...prev, val]
    );
  }
  function handleCoverChange(e) {
    const f = e.target.files[0];
    if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); }
  }
  function handleGalleryChange(e) {
    const files = Array.from(e.target.files);
    const newItems = files.map(f => ({
      type: 'image', url: URL.createObjectURL(f), thumb: URL.createObjectURL(f), polaroid: false, _file: f,
    }));
    setMediaItems(prev => [...prev, ...newItems]);
  }
  async function addFromUrl() {
    const lines = urlInput.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    if (!isEdit) {
      alert('Salve o modelo primeiro antes de importar imagens via URL.');
      return;
    }
    setUrlImporting(true);
    setUrlResult(null);
    const token = localStorage.getItem('admin_token');
    const endpoint = urlMode === 'import' ? 'media/url' : 'media/url-direct';
    try {
      const r = await fetch(`/api/admin/models/${id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ urls: lines, polaroid: urlPolaroid }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro');
      setMediaItems(data.media || []);
      setUrlInput('');
      setUrlResult({
        ok: true,
        msg: urlMode === 'import'
          ? `${data.imported} imagem(s) importada(s) e processada(s) localmente.`
          : `${data.added} URL(s) adicionada(s) diretamente.`,
        errors: data.errors || [],
      });
    } catch (e) {
      setUrlResult({ ok: false, msg: e.message });
    }
    setUrlImporting(false);
  }

  async function scrapeFromPortfolio(replace) {
    if (!scrapeUrl.trim()) return;
    if (!isEdit) return alert('Salve o modelo primeiro.');
    if (replace && !confirm(`Substituir TODAS as fotos atuais pelas imagens encontradas em:\n${scrapeUrl}\n\nIsso não pode ser desfeito.`)) return;
    setScraping(true);
    setScrapeResult(null);
    const token = localStorage.getItem('admin_token');
    try {
      const r = await fetch(`/api/admin/models/${id}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ page_url: scrapeUrl.trim(), replace }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro');
      setMediaItems(data.media || []);
      setScrapeResult({ ok: true, found: data.found, imported: data.imported, errors: data.errors || [] });
    } catch (e) {
      setScrapeResult({ ok: false, msg: e.message });
    }
    setScraping(false);
  }

  async function replaceAllFromUrl() {
    const lines = urlInput.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return alert('Cole ao menos uma URL antes de substituir.');
    if (!isEdit) return alert('Salve o modelo primeiro.');
    if (!confirm(`Substituir TODAS as ${mediaItems.length} fotos atuais pelas ${lines.length} URLs informadas?\n\nEssa ação não pode ser desfeita.`)) return;
    setUrlImporting(true);
    setUrlResult(null);
    const token = localStorage.getItem('admin_token');
    try {
      // 1. Clear all existing media
      const clear = await fetch(`/api/admin/models/${id}/media/clear`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!clear.ok) throw new Error('Falha ao limpar imagens existentes');
      // 2. Import new URLs
      const endpoint = urlMode === 'import' ? 'media/url' : 'media/url-direct';
      const r = await fetch(`/api/admin/models/${id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ urls: lines, polaroid: urlPolaroid }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro');
      setMediaItems(data.media || []);
      setUrlInput('');
      setUrlResult({
        ok: true,
        msg: `Fotos anteriores removidas. ${urlMode === 'import' ? `${data.imported} imagem(s) importada(s).` : `${data.added} URL(s) adicionada(s).`}`,
        errors: data.errors || [],
      });
    } catch (e) {
      setUrlResult({ ok: false, msg: e.message });
    }
    setUrlImporting(false);
  }

  function addVideo() {
    setVideoError('');
    const parsed = parseVideoUrl(videoInput.trim());
    if (!parsed) { setVideoError('URL inválida. Use YouTube ou Vimeo.'); return; }
    setMediaItems(prev => [...prev, { type: 'video', url: videoInput.trim(), polaroid: false }]);
    setVideoInput('');
  }
  function handleReorder(next) { setMediaItems(next); }
  function handleSetCover(i) {
    setMediaItems(prev => { const n=[...prev]; const [item]=n.splice(i,1); return [item,...n]; });
  }
  function handleTogglePolaroid(i) {
    setMediaItems(prev => prev.map((item,j) => j===i ? {...item, polaroid: !item.polaroid} : item));
  }
  function handleRemove(i) {
    setMediaItems(prev => prev.filter((_,j) => j!==i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'featured' || k === 'active') fd.append(k, v ? '1' : '0');
        else if (k === 'bio') fd.append(k, v ?? ''); // sempre envia, mesmo vazia
        else if (v !== '') fd.append(k, v);
      });
      fd.append('categories', JSON.stringify(categories));

      if (coverFile) fd.append('cover_image', coverFile);

      // For existing media (no _file), send as ordered_images JSON
      // For new image items with _file, send as gallery files
      const existingMedia = mediaItems
        .filter(m => !m._file)
        .map(m => ({ type: m.type, url: m.url, thumb: m.thumb || null, polaroid: m.polaroid || false }));

      fd.append('ordered_images', JSON.stringify(existingMedia));

      // new gallery files in order
      const newFiles = mediaItems.filter(m => m._file).map(m => m._file);
      newFiles.forEach(f => fd.append('gallery', f));

      if (isEdit) await adminUpdateModel(id, fd);
      else        await adminCreateModel(fd);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-xs tracking-widest uppercase text-gray-300">Carregando...</p>
    </div>;
  }

  const input  = 'w-full border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-black transition-colors bg-white';
  const lbl    = 'text-xs tracking-widest uppercase text-gray-400 block mb-1.5';
  const secHdr = 'text-xs tracking-[0.3em] uppercase text-gray-400 mb-6 pb-3 border-b border-gray-100';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link to="/admin/dashboard" className="text-xs tracking-widest uppercase text-gray-400 hover:text-black transition-colors">
          ← Dashboard
        </Link>
        <span className="text-gray-200">|</span>
        <span className="text-xs font-light tracking-[0.3em] uppercase">{isEdit ? 'Editar Modelo' : 'Novo Modelo'}</span>
      </header>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {error && <div className="bg-red-50 border border-red-200 px-4 py-3"><p className="text-xs text-red-600">{error}</p></div>}

        {/* Informações */}
        <section>
          <p className={secHdr}>Informações</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2"><label className={lbl}>Nome *</label><input type="text" className={input} required {...field('name')} /></div>
            <div><label className={lbl}>Idade (interno)</label><input type="number" className={input} {...field('age')} /></div>
            <div className="sm:col-span-2"><label className={lbl}>Bio</label><textarea className={input + ' resize-none'} rows={3} {...field('bio')} /></div>
          </div>
        </section>

        {/* Categorias */}
        <section>
          <p className={secHdr}>Categorias</p>
          <div className="flex flex-wrap gap-5">
            {ALL_CATEGORIES.map(c => (
              <label key={c.value} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={categories.includes(c.value)}
                  onChange={() => toggleCategory(c.value)} className="w-4 h-4 accent-black" />
                <span className="text-xs tracking-widest uppercase text-gray-600">{c.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Medidas */}
        <section>
          <p className={secHdr}>Medidas</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {[['height','Altura'],['bust','Busto/Tórax'],['waist','Cintura'],['hips','Quadril'],['shoes','Calçado'],['eyes','Olhos'],['hair','Cabelo'],['torax','Tórax (Masc.)'],['terno','Terno'],['camisa','Camisa'],['manequim','Manequim']].map(([k,l]) => (
              <div key={k}><label className={lbl}>{l}</label><input type="text" className={input} {...field(k)} /></div>
            ))}
          </div>
        </section>

        {/* Status / Localização */}
        <section>
          <p className={secHdr}>Status / Localização Pública</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={lbl}>Status do Modelo</label>
              <input type="text" className={input} placeholder="Ex: In Town, Milan, Paris, Introducing…" {...field('model_status')} />
            </div>
          </div>
        </section>

        {/* Contato */}
        <section>
          <p className={secHdr}>Contato</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[['phone','Telefone Principal'],['phone2','Telefone 2'],['email','E-mail'],['whatsapp','WhatsApp']].map(([k,l]) => (
              <div key={k}><label className={lbl}>{l}</label><input type="text" className={input} {...field(k)} /></div>
            ))}
          </div>
        </section>

        {/* Redes Sociais */}
        <section>
          <p className={secHdr}>Redes Sociais</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[['instagram','Instagram'],['tiktok','TikTok'],['youtube','YouTube'],['facebook','Facebook'],['twitter','X (Twitter)']].map(([k,l]) => (
              <div key={k}><label className={lbl}>{l}</label><input type="text" className={input} placeholder="@usuario ou URL" {...field(k)} /></div>
            ))}
          </div>
        </section>

        {/* Documentos */}
        <section>
          <p className={secHdr}>Documentos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[['cpf','CPF'],['rg','RG'],['passport','Passaporte'],['passport_expiry','Validade Passaporte'],['visa_type','Tipo de Visto'],['visa_expiry','Validade do Visto'],['nationality','Nacionalidade']].map(([k,l]) => (
              <div key={k}><label className={lbl}>{l}</label><input type="text" className={input} {...field(k)} /></div>
            ))}
          </div>
        </section>

        {/* Endereço */}
        <section>
          <p className={secHdr}>Endereço</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2"><label className={lbl}>Rua / Número</label><input type="text" className={input} {...field('address')} /></div>
            {[['address_city','Cidade'],['address_state','Estado'],['address_country','País'],['address_zip','CEP / ZIP']].map(([k,l]) => (
              <div key={k}><label className={lbl}>{l}</label><input type="text" className={input} {...field(k)} /></div>
            ))}
          </div>
        </section>

        {/* Dados Bancários */}
        <section>
          <p className={secHdr}>Dados Bancários</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[['bank_name','Banco'],['bank_agency','Agência'],['bank_account','Conta'],['bank_account_type','Tipo de Conta'],['bank_pix','Chave PIX']].map(([k,l]) => (
              <div key={k}><label className={lbl}>{l}</label><input type="text" className={input} {...field(k)} /></div>
            ))}
          </div>
        </section>

        {/* Contato de Emergência */}
        <section>
          <p className={secHdr}>Contato de Emergência</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[['emergency_name','Nome'],['emergency_phone','Telefone'],['emergency_relation','Parentesco']].map(([k,l]) => (
              <div key={k}><label className={lbl}>{l}</label><input type="text" className={input} {...field(k)} /></div>
            ))}
          </div>
        </section>

        {/* Informações Internas */}
        <section>
          <p className={secHdr}>Informações Internas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className={lbl}>Início do Contrato</label><input type="date" className={input} {...field('contract_start')} /></div>
            <div><label className={lbl}>Fim do Contrato</label><input type="date" className={input} {...field('contract_end')} /></div>
            <div className="sm:col-span-2"><label className={lbl}>Notas do Agente</label><textarea className={input + ' resize-none'} rows={3} {...field('agent_notes')} /></div>
          </div>
        </section>

        {/* Mídia */}
        <section>
          <p className={secHdr}>Mídia</p>
          <div className="space-y-8">
            {/* Existing media */}
            {mediaItems.length > 0 && (
              <div>
                <div className="flex items-baseline gap-3 mb-3">
                  <label className={lbl + ' mb-0'}>Organizar Mídia</label>
                  <span className="text-[10px] text-gray-300">arraste · ★ capa · Pola · × remove</span>
                </div>
                <MediaGrid
                  items={mediaItems}
                  onReorder={handleReorder}
                  onSetCover={handleSetCover}
                  onTogglePolaroid={handleTogglePolaroid}
                  onRemove={handleRemove}
                />
              </div>
            )}

            {/* Upload nova capa */}
            <div>
              <label className={lbl}>Nova Foto de Capa</label>
              {coverPreview && <img src={coverPreview} alt="" className="w-24 h-32 object-cover object-top mb-3 bg-gray-100" />}
              <input type="file" accept="image/*" onChange={handleCoverChange}
                className="text-xs text-gray-500 file:mr-3 file:text-xs file:tracking-widest file:uppercase file:border file:border-gray-300 file:px-3 file:py-1.5 file:bg-white hover:file:bg-gray-50 file:cursor-pointer" />
            </div>

            {/* Upload galeria */}
            <div>
              <label className={lbl}>Adicionar Fotos à Galeria</label>
              <input type="file" ref={galleryRef} accept="image/*" multiple onChange={handleGalleryChange}
                className="text-xs text-gray-500 file:mr-3 file:text-xs file:tracking-widest file:uppercase file:border file:border-gray-300 file:px-3 file:py-1.5 file:bg-white hover:file:bg-gray-50 file:cursor-pointer" />
            </div>

            {/* Importar do site andymodels.com (Adobe Portfolio) */}
            <div className="border border-black p-5 bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] tracking-[0.2em] uppercase font-medium text-black">Importar do andymodels.com</span>
                <span className="text-[8px] bg-black text-white px-1.5 py-0.5 tracking-wider uppercase">Automático</span>
              </div>
              <p className="text-[9px] text-gray-500 mb-3 leading-relaxed">
                Cole a URL da página do modelo no site atual. O sistema extrai todas as fotos automaticamente do Adobe Portfolio CDN e importa localmente.
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="url"
                  value={scrapeUrl}
                  onChange={e => setScrapeUrl(e.target.value)}
                  placeholder="https://andymodels.com/alika-vieira"
                  className="flex-1 border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-black bg-white"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => scrapeFromPortfolio(false)}
                  disabled={scraping || !scrapeUrl.trim()}
                  className="text-[10px] tracking-[0.18em] uppercase border border-gray-300 text-gray-600 px-4 py-2 hover:border-black hover:text-black transition-colors disabled:opacity-40 bg-white">
                  {scraping ? 'Importando…' : '+ Adicionar fotos'}
                </button>
                <button type="button" onClick={() => scrapeFromPortfolio(true)}
                  disabled={scraping || !scrapeUrl.trim()}
                  className="text-[10px] tracking-[0.18em] uppercase bg-black text-white px-4 py-2 hover:bg-gray-800 transition-colors disabled:opacity-40">
                  {scraping ? 'Importando…' : '↺ Substituir tudo'}
                </button>
              </div>
              {!isEdit && (
                <p className="text-[9px] text-amber-600 mt-2">Salve o modelo antes de importar.</p>
              )}
              {scrapeResult && (
                <div className={`mt-3 px-3 py-2 text-[10px] ${scrapeResult.ok ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                  {scrapeResult.ok
                    ? `${scrapeResult.found} foto(s) encontradas → ${scrapeResult.imported} importadas com sucesso.`
                    : scrapeResult.msg}
                  {scrapeResult.errors?.length > 0 && (
                    <p className="mt-1 text-red-500">{scrapeResult.errors.length} erro(s) de download.</p>
                  )}
                </div>
              )}
            </div>

            {/* Importar via URL */}
            <div className="border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <label className={lbl + ' mb-0'}>Importar via URL de Imagem</label>
                <div className="flex gap-1 text-[9px] tracking-wider uppercase">
                  {['import','direct'].map(m => (
                    <button key={m} type="button" onClick={() => setUrlMode(m)}
                      className={`px-2.5 py-1 border transition-colors ${
                        urlMode === m ? 'border-black text-black' : 'border-gray-200 text-gray-300 hover:border-gray-400 hover:text-gray-500'
                      }`}>
                      {m === 'import' ? 'Download' : 'Externo'}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[9px] text-gray-400 mb-3 leading-relaxed">
                {urlMode === 'import'
                  ? 'Download + processa localmente: preserva qualidade, gera thumbnails, salva no servidor. Recomendado para imagens do andymodels.com.'
                  : 'Armazena URL sem download: exibe imagem diretamente da fonte. Útil para links já estáveis.'}
              </p>
              <textarea
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder={'Cole URLs diretas de imagens (jpg/png)\nUma por linha\n\nEx: http://www.andymodels.com/img/modelos/adam/01.jpg'}
                rows={5}
                className="w-full border border-gray-200 px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-black resize-y mb-3"
              />
              <div className="flex items-center justify-between flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={urlPolaroid}
                    onChange={e => setUrlPolaroid(e.target.checked)} className="w-3.5 h-3.5 accent-black" />
                  <span className="text-[10px] tracking-wider uppercase text-gray-500">Marcar como Polaroid</span>
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={addFromUrl} disabled={urlImporting || !urlInput.trim()}
                    className="text-[10px] tracking-[0.18em] uppercase border border-gray-300 text-gray-600 px-4 py-2 hover:border-black hover:text-black transition-colors disabled:opacity-40">
                    {urlImporting ? 'Processando…' : '+ Adicionar'}
                  </button>
                  <button type="button" onClick={replaceAllFromUrl} disabled={urlImporting || !urlInput.trim()}
                    className="text-[10px] tracking-[0.18em] uppercase bg-black text-white px-4 py-2 hover:bg-gray-800 transition-colors disabled:opacity-40">
                    {urlImporting ? 'Processando…' : '↺ Substituir tudo'}
                  </button>
                </div>
              </div>
              {!isEdit && (
                <p className="text-[9px] text-amber-600 mt-2">Salve o modelo antes de importar imagens via URL.</p>
              )}
              {urlResult && (
                <div className={`mt-3 px-3 py-2 text-[10px] ${urlResult.ok ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                  {urlResult.msg}
                  {urlResult.errors?.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {urlResult.errors.map((e, i) => (
                        <li key={i} className="text-red-500">{e.url}: {e.error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Adicionar vídeo */}
            <div>
              <label className={lbl}>Adicionar Vídeo (YouTube / Vimeo)</label>
              <div className="flex gap-2">
                <input type="text" value={videoInput} onChange={e => setVideoInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className={input + ' flex-1'} />
                <button type="button" onClick={addVideo}
                  className="bg-black text-white text-xs tracking-widest uppercase px-4 hover:bg-gray-800 transition-colors whitespace-nowrap">
                  + Vídeo
                </button>
              </div>
              {videoError && <p className="text-[10px] text-red-500 mt-1">{videoError}</p>}
            </div>
          </div>
        </section>

        {/* Configurações */}
        <section>
          <p className={secHdr}>Configurações</p>
          <div className="flex gap-8">
            {[['featured','Destaque'],['active','Ativo']].map(([k,l]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[k]}
                  onChange={e => setForm(p=>({...p,[k]:e.target.checked}))} className="w-4 h-4 accent-black" />
                <span className="text-xs tracking-widest uppercase text-gray-600">{l}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-4 pt-2">
          <button type="submit" disabled={saving}
            className="bg-black text-white text-xs tracking-widest uppercase px-8 py-3 hover:bg-gray-800 transition-colors disabled:opacity-50">
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}
          </button>
          <Link to="/admin/dashboard" className="text-xs tracking-widest uppercase text-gray-400 hover:text-black transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
