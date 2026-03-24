import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getModel } from '../api';
import { parseVideoUrl } from '../utils/videoUtils';
import { useLanguage } from '../context/LanguageContext';

const MEASURES_WOMEN = [
  ['height','Height'], ['bust','Bust'], ['waist','Waist'], ['hips','Hips'],
  ['manequim','Size'], ['shoes','Shoes'], ['hair','Hair'], ['eyes','Eyes'],
];
const MEASURES_MEN = [
  ['height','Height'], ['torax','Chest'], ['waist','Waist'],
  ['terno','Suit'], ['camisa','Shirt'], ['manequim','Size'],
  ['shoes','Shoes'], ['hair','Hair'], ['eyes','Eyes'],
];
function getMeasures(model) {
  const cats = (() => { try { return JSON.parse(model.categories || '[]'); } catch { return []; } })();
  const isMen = model.category === 'men' || cats.includes('men');
  return (isMen ? MEASURES_MEN : MEASURES_WOMEN).filter(([k]) => model[k] && String(model[k]).trim());
}
const CAT_LABEL = { women:'Women', men:'Men', 'new-faces':'New Faces', creators:'Creators' };
const CAT_PATH  = { women:'/women', men:'/men', 'new-faces':'/new-faces', creators:'/creators' };
const API_BASE  = (import.meta.env.VITE_API_URL || '');

// ── Video thumb card ──────────────────────────────────────────────────────────
function VideoCard({ item, onClick }) {
  const vid = parseVideoUrl(item.url);
  return (
    <div onClick={onClick}
      className="relative overflow-hidden bg-gray-900 cursor-pointer group"
      style={{ aspectRatio: '3/4' }}>
      {vid?.thumb
        ? <img src={vid.thumb} alt="" loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03] opacity-80" />
        : <div className="absolute inset-0 bg-gray-800" />}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-110">
          <span className="text-black text-sm ml-0.5">▶</span>
        </div>
      </div>
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ items, index, onClose, onPrev, onNext }) {
  const { t } = useLanguage();
  const M = t.model;
  const item = items[index];
  const vid  = item?.type === 'video' ? parseVideoUrl(item.url) : null;

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-96 flex items-center justify-center overflow-hidden"
      onClick={onClose}>
      <div className="relative flex items-center justify-center"
        style={{ maxHeight: '92vh', maxWidth: '92vw' }}
        onClick={e => e.stopPropagation()}>
        {vid ? (
          <iframe src={vid.embed}
            className="w-[80vw] max-w-[900px]" style={{ aspectRatio:'16/9', border:'none' }}
            allow="autoplay; fullscreen" allowFullScreen />
        ) : (
          <img src={item.url} alt=""
            style={{ maxHeight: '92vh', maxWidth: '92vw', width: 'auto', height: 'auto', display: 'block' }}
            draggable={false} />
        )}
      </div>

      {items.length > 1 && <>
        <button onClick={e => { e.stopPropagation(); onPrev(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white text-3xl hover:opacity-50 transition-opacity select-none">
          ‹
        </button>
        <button onClick={e => { e.stopPropagation(); onNext(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white text-3xl hover:opacity-50 transition-opacity select-none">
          ›
        </button>
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-[10px] tracking-[0.2em] uppercase opacity-40 select-none">
          {index + 1} / {items.length}
        </span>
      </>}

      <button onClick={onClose}
        className="absolute top-4 right-5 text-white text-[10px] tracking-[0.2em] uppercase opacity-50 hover:opacity-100 transition-opacity">
        {M.close}
      </button>
    </div>
  );
}

// ── Composite picker ──────────────────────────────────────────────────────────
function CompositePicker({ images, model, onClose }) {
  const { t } = useLanguage();
  const M = t.model;
  const [selected, setSelected] = useState(new Set(images.slice(0, 4).map(i => i.url)));
  const [generating, setGenerating] = useState(false);

  function toggle(url) {
    setSelected(prev => { const s = new Set(prev); s.has(url) ? s.delete(url) : s.add(url); return s; });
  }

  async function download() {
    setGenerating(true);
    const urls = images.filter(img => selected.has(img.url)).map(img => img.url).join(',');
    const link = document.createElement('a');
    link.href  = `${API_BASE}/api/models/${model.slug}/composite.pdf?images=${encodeURIComponent(urls)}`;
    link.download = `composite_${model.slug}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setGenerating(false), 1500);
  }

  const selectedArr = images.filter(img => selected.has(img.url));

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <span className="text-[10px] tracking-[0.2em] uppercase text-black">{M.compositeTitle}</span>
          <button onClick={onClose} className="text-[10px] tracking-widest uppercase text-gray-400 hover:text-black">×</button>
        </div>
        <div className="px-6 py-5">
          <p className="text-[10px] text-gray-400 mb-4">
            {M.compositeHint} • {M.compositeSelected(selectedArr.length)}
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-6">
            {images.map((img, i) => {
              const sel = selected.has(img.url);
              return (
                <div key={i} onClick={() => toggle(img.url)}
                  className={`relative cursor-pointer transition-all duration-150
                    ${sel ? 'ring-2 ring-black ring-offset-1' : 'opacity-60 hover:opacity-90'}`}>
                  <img src={img.thumb || img.url} alt=""
                    className="w-full object-cover object-top bg-gray-100"
                    style={{ aspectRatio:'3/4' }} />
                  {sel && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center shadow">
                      <span className="text-white text-[9px] font-bold">
                        {images.filter(x => selected.has(x.url)).indexOf(img) + 1}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button
            onClick={download}
            disabled={selectedArr.length === 0 || generating}
            className="bg-black text-white text-[10px] tracking-[0.2em] uppercase px-6 py-3 hover:bg-gray-800 disabled:opacity-30 transition-colors">
            {generating ? M.compositeGenerating : M.compositeDownload(selectedArr.length)}
          </button>
        </div>
      </div>
    </div>
  );
}

function PolaroidPicker({ images, model, onClose }) {
  const { t } = useLanguage();
  const M = t.model;
  const polaroids = images.filter(img => img.polaroid);
  const [selected, setSelected] = useState(new Set(polaroids.length > 0 ? [polaroids[0].url] : []));
  const [generating, setGenerating] = useState(false);

  if (polaroids.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white max-w-sm w-full p-8 text-center" onClick={e => e.stopPropagation()}>
          <p className="text-[10px] tracking-[0.2em] uppercase text-black mb-2">Polaroid</p>
          <p className="text-xs text-gray-400 mt-4">{M.noPolaroidText}</p>
          <p className="text-[9px] text-gray-300 mt-2">{M.noPolaroidHint}</p>
          <button onClick={onClose} className="mt-6 text-[9px] tracking-widest uppercase text-gray-400 hover:text-black transition-colors">{M.close}</button>
        </div>
      </div>
    );
  }

  function toggle(url) {
    setSelected(prev => { const s = new Set(prev); s.has(url) ? s.delete(url) : s.add(url); return s; });
  }

  async function download() {
    setGenerating(true);
    const urls = polaroids.filter(img => selected.has(img.url)).map(img => img.url).join(',');
    const link = document.createElement('a');
    link.href  = `${API_BASE}/api/models/${model.slug}/polaroid.pdf?images=${encodeURIComponent(urls)}`;
    link.download = `polaroid_${model.slug}.pdf`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setTimeout(() => setGenerating(false), 1500);
  }

  const selectedArr = polaroids.filter(img => selected.has(img.url));

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <span className="text-[10px] tracking-[0.2em] uppercase text-black">{M.polaroidTitle(polaroids.length)}</span>
          <button onClick={onClose} className="text-[10px] tracking-widest uppercase text-gray-400 hover:text-black">×</button>
        </div>
        <div className="px-6 py-5">
          <p className="text-[10px] text-gray-400 mb-4">{M.polaroidSelected(selectedArr.length)}</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-6">
            {polaroids.map((img, i) => {
              const sel = selected.has(img.url);
              return (
                <div key={i} onClick={() => toggle(img.url)}
                  className={`relative cursor-pointer transition-all duration-150 ${sel ? 'ring-2 ring-black ring-offset-1' : 'opacity-60 hover:opacity-90'}`}>
                  <img src={img.thumb || img.url} alt="" className="w-full object-cover object-top bg-gray-100" style={{ aspectRatio:'3/4' }} />
                  {sel && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-black rounded-full flex items-center justify-center shadow">
                      <svg className="w-2 h-2 fill-white" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6"/></svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={download} disabled={selectedArr.length === 0 || generating}
            className="bg-black text-white text-[10px] tracking-[0.2em] uppercase px-6 py-3 hover:bg-gray-800 disabled:opacity-30 transition-colors">
            {generating ? M.polaroidGenerating : M.polaroidDownload}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Model Page ────────────────────────────────────────────────────────────────
export default function ModelPage() {
  const { slug } = useParams();
  const { t } = useLanguage();
  const M = t.model;
  const [model, setModel]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [showPolaroid, setShowPolaroid] = useState(false);
  const [showComposite, setShowComposite] = useState(false);
  const [showPolaroidPicker, setShowPolaroidPicker] = useState(false);

  useEffect(() => {
    setModel(null); setLoading(true); setShowPolaroid(false);
    getModel(slug).then(setModel).catch(() => setModel(null)).finally(() => setLoading(false));
  }, [slug]);

  const mediaItems = model?.media?.length
    ? model.media
    : [model?.cover_image, ...(model?.images || [])].filter(Boolean).map(url => ({
        type: 'image',
        url,
        thumb: url.includes('/full_') ? url.replace('/full_', '/thumb_') : null,
        polaroid: false,
      }));

  const visibleItems = showPolaroid
    ? mediaItems.filter(m => m.polaroid)
    : mediaItems.filter(m => !m.polaroid);

  const hasPolaroids = mediaItems.some(m => m.polaroid);
  const imageItems   = mediaItems.filter(m => m.type === 'image');

  const onClose = useCallback(() => setLightboxIdx(null), []);
  const onPrev  = useCallback(() => setLightboxIdx(i => (i - 1 + visibleItems.length) % visibleItems.length), [visibleItems.length]);
  const onNext  = useCallback(() => setLightboxIdx(i => (i + 1) % visibleItems.length), [visibleItems.length]);

  const catPath = model ? (CAT_PATH[model.category] || '/') : '/';

  if (loading) return (
    <main>
      <div className="max-w-screen-xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-100 animate-pulse" style={{ aspectRatio: '3/4' }} />
            ))}
          </div>
          <div className="space-y-3">{Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-2.5 bg-gray-100 animate-pulse" style={{ width: `${45 + i * 7}%` }} />
          ))}</div>
        </div>
      </div>
    </main>
  );

  if (!model) return (
    <main>
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <p className="text-[10px] tracking-[0.2em] uppercase text-gray-300">Model not found</p>
        <Link to="/" className="text-[10px] tracking-[0.14em] uppercase border-b border-black pb-px">Back</Link>
      </div>
    </main>
  );

  const measures = getMeasures(model);

  return (
    <main>
      <div className="max-w-screen-xl mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8">
          <Link to={catPath}
            className="text-[10px] tracking-[0.14em] uppercase text-gray-400 hover:text-black transition-colors">
            {CAT_LABEL[model.category] || model.category}
          </Link>
          <span className="text-gray-200 text-[10px]">/</span>
          <span className="text-[10px] tracking-[0.14em] uppercase text-black">{model.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-10 xl:gap-14">

          {/* ── Gallery ── */}
          <div>
            {hasPolaroids && (
              <div className="flex items-center gap-5 mb-5">
                {[{ key: 'gallery', label: M.gallery }, { key: 'polaroid', label: 'Polaroid' }].map(({ key, label }) => (
                  <button key={key} onClick={() => setShowPolaroid(key === 'polaroid')}
                    className={`text-[10px] tracking-[0.14em] uppercase transition-colors
                      ${(showPolaroid ? 'polaroid' : 'gallery') === key
                        ? 'text-black border-b border-black pb-px'
                        : 'text-gray-400 hover:text-black'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {visibleItems.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1">
                {visibleItems.map((item, i) =>
                  item.type === 'video'
                    ? (
                      <div key={i} onClick={() => setLightboxIdx(i)}
                        className="relative overflow-hidden bg-gray-900 cursor-pointer group"
                        style={{ aspectRatio: '4/5' }}>
                        {parseVideoUrl(item.url)?.thumb
                          ? <img src={parseVideoUrl(item.url).thumb} alt="" loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]" />
                          : <div className="absolute inset-0 bg-gray-800" />}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white text-xs opacity-70 group-hover:opacity-100">▶</span>
                        </div>
                      </div>
                    )
                    : (
                      <div key={i}
                        className="relative overflow-hidden bg-gray-100 cursor-pointer group"
                        style={{ aspectRatio: '4/5' }}
                        onClick={() => setLightboxIdx(i)}>
                        <img
                          src={item.thumb || item.url}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover object-top
                            transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                    )
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <p className="text-[10px] tracking-widest uppercase text-gray-300">
                  {showPolaroid ? M.noPolaroids : M.noImages}
                </p>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="lg:sticky lg:top-8 lg:self-start space-y-0">
            <h1 className="text-[13px] tracking-[0.18em] uppercase font-medium">{model.name}</h1>
            {(model.city || model.address_city) && (
              <p className="text-[10px] tracking-[0.14em] uppercase text-gray-400 mt-0.5 mb-6">
                {[model.city, model.address_country].filter(Boolean).join(', ')}
              </p>
            )}

            {/* Action buttons */}
            {imageItems.length > 0 && (
              <div className="flex gap-2 mb-8">
                <button onClick={() => setShowComposite(true)}
                  className="text-[9px] tracking-[0.14em] uppercase border border-gray-200 px-3 py-2
                    hover:border-black hover:text-black text-gray-500 transition-colors">
                  Composite
                </button>
                <button onClick={() => setShowPolaroidPicker(true)}
                  className="text-[9px] tracking-[0.14em] uppercase border border-gray-200 px-3 py-2
                    hover:border-black hover:text-black text-gray-500 transition-colors">
                  Polaroid
                </button>
              </div>
            )}

            {measures.length > 0 && (
              <div className="border-t border-gray-100 pt-5">
                <p className="text-[9px] tracking-[0.2em] uppercase text-gray-300 mb-4">Measurements</p>
                <div className="space-y-2.5">
                  {measures.map(([k, l]) => (
                    <div key={k} className="flex justify-between items-baseline">
                      <span className="text-[10px] tracking-[0.1em] uppercase text-gray-400">{l}</span>
                      <span className="text-[10px] text-black font-light">{model[k]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {model.bio && (
              <div className="border-t border-gray-100 mt-5 pt-5">
                <p className="text-[11px] font-light leading-relaxed text-gray-500">{model.bio}</p>
              </div>
            )}

            <div className="border-t border-gray-100 mt-8 pt-5">
              <Link to={catPath}
                className="text-[10px] tracking-[0.14em] uppercase text-gray-400 hover:text-black transition-colors">
                {M.back}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {lightboxIdx !== null && (
        <Lightbox
          items={visibleItems}
          index={lightboxIdx}
          onClose={onClose}
          onPrev={onPrev}
          onNext={onNext}
        />
      )}

      {showComposite && (
        <CompositePicker
          images={imageItems}
          model={model}
          onClose={() => setShowComposite(false)}
        />
      )}

      {showPolaroidPicker && (
        <PolaroidPicker
          images={imageItems}
          model={model}
          onClose={() => setShowPolaroidPicker(false)}
        />
      )}
    </main>
  );
}
