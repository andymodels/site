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
      subtitle: 'Só analisamos perfis que atendem aos requisitos mínimos abaixo.\nInscrições fora do padrão não serão consideradas.',
      intro: 'Leia com atenção antes de enviar. O não cumprimento dos requisitos elimina automaticamente a candidatura.',
      reqTitle: 'Requisitos Mínimos',
      femLabel: 'Feminino', masLabel: 'Masculino',
      femReq1: 'A partir de 13 anos', femReq2: 'Altura mínima: 1,70m',
      masReq1: 'Altura mínima obrigatória: 1,80m',
      noKids: 'Não trabalhamos com crianças.',
      photoTitle: 'Fotos — Padrão Obrigatório',
      photoIntro: 'Envie entre 3 e 5 fotos recentes. Qualidade mínima exigida — fotos inadequadas descartam a inscrição.',
      photoHints: [
        'Fundo claro e luz natural — sem flash',
        'Sem maquiagem, filtros ou efeitos',
        'Roupas básicas ou biquíni/sunga — sem acessórios',
        'Não envie fotos com outras pessoas ou retiradas de redes sociais',
        'Enquadramento: rosto e corpo inteiro (frente e perfil)',
      ],
      photoLimit: 'Mínimo 3 fotos · Máximo 5 fotos',
      selectTitle: 'Processo de Seleção',
      selectText1: 'Se o perfil estiver alinhado com o nosso mercado, entraremos em contato para avaliação presencial.',
      selectText2: 'Não havendo retorno, o perfil não atendeu aos critérios desta seleção.',
      aboutTitle: 'Sobre a Andy Models',
      aboutHighlight: 'A Andy Models não comercializa cursos, books ou pacotes.',
      aboutText: 'Atuamos exclusivamente no mercado profissional de moda, com representação nacional e internacional, baseada em critérios reais de mercado.',
      fields: {
        name: 'Nome completo *', namePh: 'Seu nome completo',
        age: 'Idade *', agePh: 'Ex: 20',
        height: 'Altura *', heightPh: 'Ex: 1,74',
        city: 'Cidade *', cityPh: 'Sua cidade',
        state: 'Estado', statePh: 'SP',
        whatsapp: 'WhatsApp *', whatsappPh: '(00) 00000-0000',
        instagram: 'Instagram (URL completa)', instagramPh: 'https://instagram.com/seu.perfil',
        email: 'E-mail *', emailPh: 'seu@email.com',
        photos: 'Fotos *', addPhotos: '+ Adicionar fotos',
        limitHit: 'Limite atingido',
        photoHint: 'JPG ou PNG · máx. 5MB por foto',
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
      subtitle: 'We only review profiles that meet the minimum requirements below.\nApplications outside our standards will not be considered.',
      intro: 'Read carefully before submitting. Failure to meet requirements automatically disqualifies the application.',
      reqTitle: 'Minimum Requirements',
      femLabel: 'Female', masLabel: 'Male',
      femReq1: 'From 13 years old', femReq2: 'Minimum height: 1.70m',
      masReq1: 'Mandatory minimum height: 1.80m',
      noKids: 'We do not work with children.',
      photoTitle: 'Photos — Required Standards',
      photoIntro: 'Submit 3 to 5 recent photos. Minimum quality required — inadequate photos will disqualify the application.',
      photoHints: [
        'Light background and natural light — no flash',
        'No makeup, filters or effects',
        'Basic clothes or swimwear — no accessories',
        'Do not send photos with other people or taken from social media',
        'Framing: face and full body (front and side)',
      ],
      photoLimit: 'Minimum 3 photos · Maximum 5 photos',
      selectTitle: 'Selection Process',
      selectText1: 'If your profile aligns with our market, we will contact you for an in-person evaluation.',
      selectText2: 'If you don\'t hear back, the profile did not meet the criteria for this selection.',
      aboutTitle: 'About Andy Models',
      aboutHighlight: 'Andy Models does not sell courses, portfolios or packages.',
      aboutText: 'We operate exclusively in the professional fashion market, with national and international representation, based on real market criteria.',
      fields: {
        name: 'Full name *', namePh: 'Your full name',
        age: 'Age *', agePh: 'e.g. 20',
        height: 'Height *', heightPh: 'e.g. 1.74',
        city: 'City *', cityPh: 'Your city',
        state: 'State', statePh: 'SP',
        whatsapp: 'WhatsApp *', whatsappPh: '(00) 00000-0000',
        instagram: 'Instagram (full URL)', instagramPh: 'https://instagram.com/yourprofile',
        email: 'E-mail *', emailPh: 'you@email.com',
        photos: 'Photos *', addPhotos: '+ Add photos',
        limitHit: 'Limit reached',
        photoHint: 'JPG or PNG · max. 5MB per photo',
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
