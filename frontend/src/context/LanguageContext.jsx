import { createContext, useContext, useState } from 'react';

const translations = {
  pt: {
    nav: {
      home: 'Home', about: 'Sobre', women: 'Mulheres', men: 'Homens',
      creators: 'Criadores', apply: 'Inscreva-se', contact: 'Contato',
    },
    home: {
      viewAll: 'Ver modelos',
    },
    category: {
      women: 'Mulheres', men: 'Homens', creators: 'Criadores',
      'new-faces': 'New Faces', empty: 'Nenhum modelo cadastrado',
    },
    apply: {
      badge: 'Inscreva-se',
      title: 'Inscreva-se na Andy Models',
      subtitle: 'Quer entrar para o mercado de moda profissional?\nEstamos sempre em busca de novos talentos.',
      intro: 'Se você acredita que tem perfil para atuar como modelo, leia atentamente as orientações abaixo e envie seu material.',
      reqTitle: 'Requisitos Mínimos',
      femLabel: 'Feminino', masLabel: 'Masculino',
      femReq1: 'A partir de 13 anos', femReq2: 'Altura aprox. 1,70m',
      masReq1: 'Altura mínima: 1,80m',
      noKids: 'Não trabalhamos com crianças.',
      photoTitle: 'Como enviar suas fotos',
      photoIntro: 'Envie fotos recentes. Não precisam ser profissionais.',
      photoHints: [
        'Use fundo claro e luz natural', 'Não utilize flash', 'Evite maquiagem',
        'Valorize sua aparência natural', 'Roupas básicas ou roupa de banho com salto (feminino)',
        'Sem acessórios: óculos, bonés ou colares', 'Não envie fotos com outras pessoas',
        'Não envie fotos com filtros ou de redes sociais',
      ],
      photoLimit: 'Máximo de 5 fotos',
      selectTitle: 'Processo de Seleção',
      selectText1: 'Se o seu perfil estiver alinhado com o nosso mercado, entraremos em contato para agendar uma avaliação presencial.',
      selectText2: 'Caso não haja retorno, continue tentando. O timing do mercado varia.',
      aboutTitle: 'Sobre a Andy Models',
      aboutHighlight: 'A Andy Models não comercializa cursos, books ou pacotes.',
      aboutText: 'Nosso trabalho é focado exclusivamente no mercado profissional de moda, com atuação nacional e internacional, baseado em critérios reais de mercado.',
      fields: {
        name: 'Nome completo *', namePh: 'Seu nome completo',
        age: 'Idade *', agePh: 'Ex: 20',
        height: 'Altura', heightPh: 'Ex: 1,74',
        city: 'Cidade *', cityPh: 'Sua cidade',
        state: 'Estado', statePh: 'SP',
        whatsapp: 'WhatsApp *', whatsappPh: '(00) 00000-0000',
        instagram: 'Instagram', instagramPh: '@seu.perfil',
        email: 'E-mail *', emailPh: 'seu@email.com',
        area: 'Área de interesse',
        areaOpts: ['Modelo Feminina', 'Modelo Masculino', 'Creator / Influenciador'],
        photos: 'Fotos', addPhotos: '+ Adicionar fotos',
        limitHit: 'Limite atingido',
        photoHint: 'JPG ou PNG · máx. 5MB por foto · até 5 fotos',
        submit: 'Enviar inscrição', sending: 'Enviando...',
      },
      successBadge: 'Inscrição enviada',
      successTitle: 'Obrigado pelo interesse.',
      successText: 'Se o seu perfil estiver alinhado com o nosso mercado, entraremos em contato para agendar uma avaliação presencial.',
      newApply: 'Nova inscrição',
    },
    radio: { listen: 'Rádio Andy', by: 'Andy Models' },
  },
  en: {
    nav: {
      home: 'Home', about: 'About', women: 'Women', men: 'Men',
      creators: 'Creators', apply: 'Apply', contact: 'Contact',
    },
    home: {
      viewAll: 'View models',
    },
    category: {
      women: 'Women', men: 'Men', creators: 'Creators',
      'new-faces': 'New Faces', empty: 'No models registered',
    },
    apply: {
      badge: 'Apply',
      title: 'Apply to Andy Models',
      subtitle: 'Want to enter the professional fashion market?\nWe are always looking for new talent.',
      intro: 'If you believe you have the profile to work as a model, read the guidelines below carefully and submit your material.',
      reqTitle: 'Minimum Requirements',
      femLabel: 'Female', masLabel: 'Male',
      femReq1: 'From 13 years old', femReq2: 'Height approx. 1.70m',
      masReq1: 'Minimum height: 1.80m',
      noKids: 'We do not work with children.',
      photoTitle: 'How to send your photos',
      photoIntro: 'Send recent photos. They don\'t need to be professional.',
      photoHints: [
        'Use light background and natural light', 'Do not use flash', 'Avoid makeup',
        'Enhance your natural appearance', 'Basic clothes or swimwear with heels (female)',
        'No accessories: glasses, caps or necklaces', 'Do not send photos with other people',
        'Do not send photos with filters or from social media',
      ],
      photoLimit: 'Maximum 5 photos',
      selectTitle: 'Selection Process',
      selectText1: 'If your profile aligns with our market, we will contact you to schedule an in-person evaluation.',
      selectText2: 'If you don\'t hear back, keep trying. Market timing varies.',
      aboutTitle: 'About Andy Models',
      aboutHighlight: 'Andy Models does not sell courses, portfolios or packages.',
      aboutText: 'Our work is focused exclusively on the professional fashion market, operating nationally and internationally, based on real market criteria.',
      fields: {
        name: 'Full name *', namePh: 'Your full name',
        age: 'Age *', agePh: 'e.g. 20',
        height: 'Height', heightPh: 'e.g. 1.74',
        city: 'City *', cityPh: 'Your city',
        state: 'State', statePh: 'SP',
        whatsapp: 'WhatsApp *', whatsappPh: '(00) 00000-0000',
        instagram: 'Instagram', instagramPh: '@yourprofile',
        email: 'E-mail *', emailPh: 'you@email.com',
        area: 'Area of interest',
        areaOpts: ['Female Model', 'Male Model', 'Creator / Influencer'],
        photos: 'Photos', addPhotos: '+ Add photos',
        limitHit: 'Limit reached',
        photoHint: 'JPG or PNG · max. 5MB per photo · up to 5 photos',
        submit: 'Submit application', sending: 'Sending...',
      },
      successBadge: 'Application sent',
      successTitle: 'Thank you for your interest.',
      successText: 'If your profile aligns with our market, we will contact you to schedule an in-person evaluation.',
      newApply: 'New application',
    },
    radio: { listen: 'Andy Radio', by: 'Andy Models' },
  },
};

const LanguageContext = createContext({ lang: 'pt', t: translations.pt, toggle: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('pt');
  const toggle = () => setLang(l => (l === 'pt' ? 'en' : 'pt'));
  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
