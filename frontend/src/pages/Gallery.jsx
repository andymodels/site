import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getModels } from '../api';
import ModelCard from '../components/ModelCard';

const PATH_TO_CATEGORY = {
  '/women': 'women',
  '/men': 'men',
  '/new-faces': 'new-faces',
};

const CATEGORY_LABEL = {
  women: 'Women',
  men: 'Men',
  'new-faces': 'New Faces',
};

export default function Gallery() {
  const { pathname } = useLocation();
  const category = PATH_TO_CATEGORY[pathname] || 'women';

  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getModels({ category })
      .then(data => setModels(data))
      .catch(() => setModels([]))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <main className="pt-14">
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <h1 className="text-xs font-light tracking-[0.4em] uppercase mb-12">
          {CATEGORY_LABEL[category] || category}
        </h1>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-100 animate-pulse" style={{ aspectRatio: '3/4' }} />
            ))}
          </div>
        ) : models.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-xs tracking-widest uppercase text-gray-300">Nenhum modelo cadastrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {models.map(model => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
