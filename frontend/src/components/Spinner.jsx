import React from 'react';

export default function Spinner({ size = 'md', label }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizes[size]} border-2 border-gray-200 border-t-black rounded-full animate-spin`}
      />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  );
}
