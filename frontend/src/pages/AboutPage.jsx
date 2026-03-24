export default function AboutPage() {
  return (
    <main>
      <div className="max-w-screen-xl mx-auto px-6 py-16">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 xl:gap-32">

          {/* ── Coluna esquerda: conteúdo principal ── */}
          <div>
            <p className="text-[11px] tracking-[0.35em] uppercase text-gray-600 font-medium mb-6">Sobre</p>
            <h1 className="text-2xl sm:text-3xl font-extralight tracking-wide leading-snug text-black mb-10">
              Andy Models
            </h1>

            <div className="space-y-5 text-sm font-light leading-relaxed text-gray-700 max-w-md">
              <p>
                A Andy Models é uma agência fundada em 2008, com atuação voltada à descoberta,
                preparação e desenvolvimento de talentos para o mercado profissional da moda,
                no Brasil e no exterior.
              </p>
              <p>
                Desde o início, a agência construiu sua reputação com base em curadoria,
                direcionamento estratégico e leitura real de mercado. Mais do que representar
                perfis, a Andy Models trabalha na identificação de pessoas com potencial concreto
                para seguir carreira profissional, desenvolvendo cada etapa com critério,
                posicionamento e visão de longo prazo.
              </p>
              <p>
                Com foco no mercado internacional, a agência mantém conexões com importantes
                centros da moda em todo o mundo, incluindo América Latina, Ásia, Europa e
                Estados Unidos, atuando em sintonia com as exigências do mercado global e com
                o padrão de seleção adotado por agências de referência no exterior.
              </p>
              <p>
                Nosso trabalho não é baseado em quantidade, mas em precisão. Selecionamos
                perfis com potencial real e oferecemos direcionamento alinhado às exigências
                do mercado internacional.
              </p>
              <p className="text-[11px] tracking-[0.12em] uppercase text-gray-500 border-t border-gray-200 pt-5 leading-relaxed">
                A Andy Models não comercializa cursos, books ou pacotes.<br />
                Nossa atuação é voltada exclusivamente ao mercado profissional.
              </p>
            </div>

            {/* ── Acompanhe ── */}
            <div className="mt-10 border-t border-gray-200 pt-8">
              <p className="text-[11px] tracking-[0.22em] uppercase text-gray-600 font-medium mb-4">
                Acompanhe a Andy Models
              </p>
              <a
                href="https://www.instagram.com/andymodels_agencia"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-light text-gray-700 hover:text-black transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
                </svg>
                @andymodels_agencia
              </a>
            </div>
          </div>

          {/* ── Coluna direita: missão, visão, valores ── */}
          <div className="flex flex-col justify-start lg:pt-16">
            <div className="space-y-8">
              {[
                {
                  label: 'Missão',
                  text: 'Identificar talentos com potencial real e direcioná-los com estratégia, critério e visão de longo prazo para o mercado profissional.',
                },
                {
                  label: 'Visão',
                  text: 'Ser reconhecida como uma agência de referência na formação e projeção internacional de novos talentos.',
                },
                {
                  label: 'Valores',
                  text: 'Curadoria. Critério. Consistência. Posicionamento. Mercado real.',
                },
              ].map(({ label, text }) => (
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
