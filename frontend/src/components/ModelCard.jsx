import { Link } from 'react-router-dom';

export default function ModelCard({ model }) {
  const img = model.cover_thumb || model.cover_image;
  if (!img) return null;

  return (
    <Link to={`/${model.slug}`} className="group block">
      <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: '3/4' }}>
        <img
          src={img}
          alt={model.name}
          loading="lazy"
          className="w-full h-full object-cover object-top transition-all duration-500 ease-out grayscale group-hover:grayscale-0 group-hover:scale-[1.02]"
        />
      </div>

      <div className="mt-2 px-px pb-1">
        <p className="text-[11px] tracking-[0.12em] uppercase font-medium text-black leading-none">
          {model.name}
        </p>
        {model.model_status && (
          <p className="text-[9px] tracking-[0.15em] uppercase text-gray-400 mt-0.5">{model.model_status}</p>
        )}
      </div>
    </Link>
  );
}
