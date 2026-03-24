import { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';

const MAX_PHOTOS    = 5;
const MIN_PHOTOS    = 3;
const MAX_SIZE_MB   = 5;
const MAX_PDF_MB    = 10;
const ALLOWED_IMAGE = ['image/jpeg', 'image/png'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE, 'application/pdf'];

const EMPTY = {
  name: '', email: '', phone: '', age: '',
  height: '', city: '', state: '', instagram: '', category: 'women',
};

function InfoBlock({ title, children }) {
  return (
    <div className="mb-8 pt-7 border-t border-gray-200">
      <p className="text-[11px] tracking-[0.3em] uppercase text-gray-600 font-medium mb-4">{title}</p>
      <div className="space-y-2 text-sm font-light text-gray-700 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function Dot({ children }) {
  return (
    <p className="flex gap-2">
      <span className="text-gray-400 select-none">–</span>
      <span>{children}</span>
    </p>
  );
}

export default function InscrevaPage() {
  const { t } = useLanguage();
  const T = t.apply;
  const inputClass = 'w-full border-b border-gray-300 py-2.5 text-sm font-light outline-none focus:border-black transition-colors bg-transparent placeholder-gray-400';
  const labelClass = 'text-[11px] tracking-[0.22em] uppercase text-gray-600 font-medium block mb-1.5';

  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const fileRef = useRef();
  const pdfRef = useRef();

  function field(key) {
    return { value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) };
  }

  function handleFiles(e) {
    const selected = Array.from(e.target.files);
    setPhotoError('');

    const invalid = selected.filter(f => !ALLOWED_IMAGE.includes(f.type));
    if (invalid.length) {
      setPhotoError('Apenas imagens JPG e PNG são permitidas para fotos.');
      e.target.value = '';
      return;
    }
    if (photos.length + selected.length > MAX_PHOTOS) {
      setPhotoError(`Máximo de ${MAX_PHOTOS} fotos. Você já tem ${photos.length} selecionada(s).`);
      e.target.value = '';
      return;
    }
    const oversized = selected.filter(f => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (oversized.length) {
      setPhotoError(`Cada foto deve ter no máximo ${MAX_SIZE_MB}MB.`);
      e.target.value = '';
      return;
    }
    setPhotos(prev => [...prev, ...selected.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
    e.target.value = '';
  }

  function handlePdf(e) {
    const file = e.target.files[0];
    setPdfError('');
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setPdfError('Apenas arquivos PDF são aceitos neste campo.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_PDF_MB * 1024 * 1024) {
      setPdfError(`O PDF deve ter no máximo ${MAX_PDF_MB}MB.`);
      e.target.value = '';
      return;
    }
    setPdfFile(file);
    e.target.value = '';
  }

  function removePhoto(i) {
    setPhotos(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, idx) => idx !== i); });
    setPhotoError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (photos.length < MIN_PHOTOS) {
      setPhotoError(`Envie pelo menos ${MIN_PHOTOS} fotos para continuar.`);
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      photos.forEach(p => fd.append('photos', p.file));
      if (pdfFile) fd.append('pdf', pdfFile);
      const res = await fetch('/api/applications', { method: 'POST', body: fd });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Erro ao enviar.'); }
      setStatus('success');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (status === 'success') {
    return (
      <main>
        <div className="max-w-screen-xl mx-auto px-6 py-28 text-center">
          <p className="text-[11px] tracking-[0.3em] uppercase text-gray-500 mb-6">{T.successBadge}</p>
          <h2 className="text-2xl font-extralight tracking-wide mb-5">{T.successTitle}</h2>
          <p className="text-sm font-light text-gray-600 max-w-sm mx-auto leading-relaxed mb-10">
            {T.successText}
          </p>
          <button
            onClick={() => { setStatus(null); setForm(EMPTY); setPhotos([]); }}
            className="text-[11px] tracking-[0.2em] uppercase border-b border-black pb-px hover:text-gray-500 hover:border-gray-500 transition-colors"
          >
            {T.newApply}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="max-w-screen-xl mx-auto px-6 py-12">

        <div className="mb-14 max-w-xl">
          <p className="text-[11px] tracking-[0.3em] uppercase text-gray-500 mb-5">{T.badge}</p>
          <h1 className="text-3xl sm:text-4xl font-extralight tracking-wide leading-snug mb-5">
            {T.title}
          </h1>
          <p className="text-sm font-light text-gray-600 leading-relaxed">
            {T.subtitle.split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-16 xl:gap-24">

          <div>
            <p className="text-sm font-light text-gray-700 leading-relaxed max-w-md mb-8">
              {T.intro}
            </p>

            <InfoBlock title={T.reqTitle}>
              <div className="grid grid-cols-2 gap-6 mt-1">
                <div>
                  <p className="text-[12px] tracking-[0.12em] uppercase font-semibold text-black mb-2">{T.femLabel}</p>
                  <Dot>{T.femReq1}</Dot>
                  <Dot>{T.femReq2}</Dot>
                </div>
                <div>
                  <p className="text-[12px] tracking-[0.12em] uppercase font-semibold text-black mb-2">{T.masLabel}</p>
                  <Dot>{T.masReq1}</Dot>
                </div>
              </div>
              <p className="text-[11px] tracking-[0.1em] uppercase text-gray-500 mt-4">
                {T.noKids}
              </p>
            </InfoBlock>

            <InfoBlock title={T.photoTitle}>
              <p className="mb-3">{T.photoIntro}</p>
              {T.photoHints.map((hint, i) => <Dot key={i}>{hint}</Dot>)}
              <div className="mt-4">
                <span className="inline-block border border-gray-300 px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase text-black">
                  {T.photoLimit}
                </span>
              </div>
            </InfoBlock>

            <InfoBlock title={T.selectTitle}>
              <p>{T.selectText1}</p>
              <p className="mt-2">{T.selectText2}</p>
            </InfoBlock>

            <InfoBlock title={T.aboutTitle}>
              <p className="text-[12px] font-semibold text-black mb-2">{T.aboutHighlight}</p>
              <p>{T.aboutText}</p>
            </InfoBlock>
          </div>

          <div>
            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className={labelClass}>{T.fields.name}</label>
                  <input type="text" required className={inputClass} placeholder={T.fields.namePh} {...field('name')} />
                </div>
                <div>
                  <label className={labelClass}>{T.fields.age}</label>
                  <input type="number" required min="13" max="60" className={inputClass} placeholder={T.fields.agePh} {...field('age')} />
                </div>
                <div>
                  <label className={labelClass}>{T.fields.height}</label>
                  <input type="text" className={inputClass} placeholder={T.fields.heightPh} {...field('height')} />
                </div>
                <div>
                  <label className={labelClass}>{T.fields.city}</label>
                  <input type="text" required className={inputClass} placeholder={T.fields.cityPh} {...field('city')} />
                </div>
                <div>
                  <label className={labelClass}>{T.fields.state}</label>
                  <input type="text" maxLength={2} className={inputClass} placeholder={T.fields.statePh} {...field('state')} />
                </div>
                <div>
                  <label className={labelClass}>{T.fields.whatsapp}</label>
                  <input type="tel" required className={inputClass} placeholder={T.fields.whatsappPh} {...field('phone')} />
                </div>
                <div>
                  <label className={labelClass}>{T.fields.instagram}</label>
                  <input type="text" className={inputClass} placeholder={T.fields.instagramPh} {...field('instagram')} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>{T.fields.email}</label>
                  <input type="email" required className={inputClass} placeholder={T.fields.emailPh} {...field('email')} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>{T.fields.area}</label>
                  <select className={inputClass} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    <option value="women">{T.fields.areaOpts[0]}</option>
                    <option value="men">{T.fields.areaOpts[1]}</option>
                    <option value="creators">{T.fields.areaOpts[2]}</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-baseline justify-between mb-3">
                  <label className={labelClass}>{T.fields.photos}</label>
                  <span className={`text-[10px] tracking-wider tabular-nums ${photos.length >= MAX_PHOTOS ? 'text-black font-semibold' : photos.length >= MIN_PHOTOS ? 'text-green-600' : 'text-gray-400'}`}>
                    {photos.length}/{MAX_PHOTOS} {photos.length < MIN_PHOTOS ? `(mín. ${MIN_PHOTOS})` : ''}
                  </span>
                </div>

                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {photos.map((p, i) => (
                      <div key={i} className="relative group w-16 h-20 flex-shrink-0">
                        <img src={p.preview} alt="" className="w-full h-full object-cover bg-gray-100" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center"
                          aria-label="Remover foto"
                        >
                          <span className="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity">✕</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input type="file" ref={fileRef} accept="image/jpeg,image/png" multiple onChange={handleFiles} className="hidden" />

                {photos.length < MAX_PHOTOS ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="border border-gray-300 px-4 py-2.5 text-[11px] tracking-[0.14em] uppercase text-gray-600 hover:border-black hover:text-black transition-colors"
                    >
                      {T.fields.addPhotos}
                    </button>
                    <p className="text-[10px] text-gray-400 mt-2 tracking-wide">
                      {T.fields.photoHint}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] tracking-[0.12em] uppercase text-gray-600 border border-gray-300 px-4 py-2.5 inline-block">
                    {T.fields.limitHit} — {MAX_PHOTOS} fotos
                  </p>
                )}

                {photoError && (
                  <p className="text-sm text-red-500 mt-3 font-light">{photoError}</p>
                )}
              </div>

              {/* ── PDF opcional ─────────────────────────────────────────── */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-baseline justify-between mb-3">
                  <label className={labelClass}>Material complementar (PDF — opcional)</label>
                  {pdfFile && (
                    <button type="button" onClick={() => setPdfFile(null)} className="text-[10px] text-gray-400 hover:text-black tracking-wider uppercase">remover</button>
                  )}
                </div>
                {pdfFile ? (
                  <p className="text-[11px] text-gray-600 border border-gray-200 px-4 py-2.5 inline-flex items-center gap-2">
                    <span>📄</span> {pdfFile.name}
                  </p>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => pdfRef.current?.click()}
                      className="border border-gray-300 px-4 py-2.5 text-[11px] tracking-[0.14em] uppercase text-gray-600 hover:border-black hover:text-black transition-colors"
                    >
                      Adicionar PDF
                    </button>
                    <p className="text-[10px] text-gray-400 mt-2 tracking-wide">
                      Somente PDF · Máximo {MAX_PDF_MB}MB
                    </p>
                  </div>
                )}
                <input type="file" ref={pdfRef} accept="application/pdf" onChange={handlePdf} className="hidden" />
                {pdfError && (
                  <p className="text-sm text-red-500 mt-3 font-light">{pdfError}</p>
                )}
              </div>

              {formError && (
                <p className="text-sm text-red-500 font-light">{formError}</p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white text-[11px] tracking-[0.22em] uppercase py-4 hover:bg-gray-900 transition-colors disabled:opacity-50"
                >
                  {loading ? T.fields.sending : T.fields.submit}
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </main>
  );
}
