export default function AboutPage() {
  return (
    <main>
      <div className="max-w-screen-2xl mx-auto px-6 py-16">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-gray-400 mb-8">About</p>
            <h1 className="text-3xl sm:text-4xl font-extralight tracking-wide leading-snug mb-10">
              Andy Models
            </h1>
            <div className="space-y-5 text-sm font-light leading-relaxed text-gray-600 max-w-md">
              <p>
                A Andy Models é uma agência de talentos dedicada a descobrir, desenvolver e
                posicionar modelos e criadores de conteúdo no mercado nacional e internacional.
              </p>
              <p>
                Com um olhar editorial apurado e compromisso com a autenticidade, construímos
                carreiras com base em identidade, propósito e visibilidade real.
              </p>
              <p>
                Nossa curadoria abrange moda, publicidade, editorial e o universo digital —
                conectando talentos a marcas, produtoras e agências em todo o Brasil.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="space-y-10">
              {[
                { label: 'Missão', text: 'Identificar talentos únicos e posicioná-los com estratégia, cuidado e visão de longo prazo.' },
                { label: 'Visão', text: 'Ser referência de qualidade e inovação no mercado de modelos e criadores de conteúdo.' },
                { label: 'Valores', text: 'Autenticidade. Diversidade. Excelência. Parceria.' },
              ].map(({ label, text }) => (
                <div key={label} className="border-t border-gray-100 pt-6">
                  <p className="text-[9px] tracking-[0.25em] uppercase text-gray-400 mb-2">{label}</p>
                  <p className="text-sm font-light text-gray-600 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
