import { useEffect, useState } from 'react';
import { getModels } from '../api';
import ModelCard from '../components/ModelCard';
import { useLanguage } from '../context/LanguageContext';

function SkeletonCard() {
  return (
    <div>
      <div className="bg-gray-100 animate-pulse w-full" style={{ aspectRatio: '3/4' }} />
      <div className="mt-2 h-2 w-1/2 bg-gray-100 animate-pulse" />
    </div>
  );
}

export default function CategoryPage({ category }) {
  const { t } = useLanguage();
  const label = t.category[category] || category;
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getModels({ category })
      .then(setModels)
      .catch(() => setModels([]))
      .finally(() => setLoading(false));
  }, [category]);

  const gridClass = "grid gap-1 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

  return (
    <main className="pb-16">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">

        <div className="py-10 border-b border-gray-100 mb-6">
          <h1 className="text-[12px] tracking-[0.4em] uppercase font-light text-black">
            {label}
          </h1>
        </div>

        {loading ? (
          <div className={gridClass}>
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : models.length === 0 ? (
          <div className="flex items-center justify-center py-40">
            <p className="text-[11px] tracking-[0.2em] uppercase text-gray-400">
              {t.category.empty}
            </p>
          </div>
        ) : (
          <div className={gridClass}>
            {models.map(model => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
