import { useLanguage } from '../context/LanguageContext';

const IG_URL = 'https://www.instagram.com/andymodels/';

export default function AboutPage() {
  const { t } = useLanguage();
  const A = t.about;

  return (
    <main>
      <div className="max-w-screen-xl mx-auto px-6 py-16">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 xl:gap-32">

          {/* ── Coluna esquerda ── */}
          <div>
            <p className="text-[11px] tracking-[0.35em] uppercase text-gray-600 font-medium mb-6">{A.badge}</p>
            <h1 className="text-2xl sm:text-3xl font-extralight tracking-wide leading-snug text-black mb-8">
              {A.title}
            </h1>

            <div className="space-y-5 text-sm font-light leading-relaxed text-gray-700 max-w-md">
              <p>{A.p1}</p>
              <p>{A.p2}</p>
              <p>{A.p3}</p>
              <p>{A.p4}</p>
              <p className="border-t border-gray-200 pt-5 font-medium text-black">
                {A.disclaimer}
              </p>
            </div>

            {/* ── Instagram ── */}
            <div className="mt-10 border-t border-gray-200 pt-8">
              <a
                href={IG_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-light text-gray-700 hover:text-black transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
                </svg>
                {A.followLabel}
              </a>
            </div>
          </div>

          {/* ── Coluna direita: missão, visão, valores ── */}
          <div className="flex flex-col justify-start lg:pt-16">
            <div className="space-y-8">
              {[A.mission, A.vision, A.values].map(({ label, text }) => (
                <div key={label} className="border-t border-gray-200 pt-6">
                  <p className="text-[11px] tracking-[0.22em] uppercase text-gray-600 font-medium mb-3">{label}</p>
                  <p className="text-sm font-light text-gray-700 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
