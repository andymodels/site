import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getModels } from '../api';
import InstagramFeed from '../components/InstagramFeed';

function SkeletonCard() {
  return <div className="bg-gray-100 animate-pulse" style={{ aspectRatio: '3/4' }} />;
}

export default function Home() {
  const [models, setModels]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getModels({ featured: '1' })
      .then(setModels)
      .catch(() => setModels([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">

        {/* Featured grid — smaller cells, more columns */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-px bg-gray-100">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white">
                  <SkeletonCard />
                </div>
              ))
            : models.map(model => (
                <Link
                  key={model.id}
                  to={`/${model.slug}`}
                  className="group block bg-white overflow-hidden"
                >
                  <div
                    className="relative overflow-hidden bg-gray-100"
                    style={{ aspectRatio: '3/4' }}
                  >
                    {(model.cover_thumb || model.cover_image) ? (
                      <img
                        src={model.cover_thumb || model.cover_image}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover object-top
                          transition-all duration-700 ease-out
                          grayscale group-hover:grayscale-0 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-50" />
                    )}
                  </div>
                </Link>
              ))
          }
        </div>

        <div className="mt-6">
          <InstagramFeed />
        </div>

      </div>
    </main>
  );
}
