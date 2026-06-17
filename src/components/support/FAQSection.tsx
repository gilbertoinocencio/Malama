import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { useLanguage } from '../../i18n';
import type { Language } from '../../i18n/translations';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQ_DATA_BY_LANG: Record<Language, FAQItem[]> = {
  pt: [
    { id: 'nutricao-1', category: 'nutricao', question: 'Como são calculadas minhas metas de macros?', answer: 'Suas metas de proteínas, carboidratos e gorduras são calculadas com base no seu peso, altura, idade, nível de atividade e objetivo. Se você está no programa GLP-1, as metas são ajustadas automaticamente para preservar massa muscular.' },
    { id: 'nutricao-2', category: 'nutricao', question: 'Posso ajustar minhas metas manualmente?', answer: 'Sim! Vá até Configurações > Metas Nutricionais. Se você tem um médico acompanhando, ele pode ter definido metas fixas que não podem ser alteradas pelo app.' },
    { id: 'nutricao-3', category: 'nutricao', question: 'Como registrar refeições por foto?', answer: 'Na aba Nutri, toque no botão "+" e selecione "Foto". Tire uma foto da sua refeição e nossa IA identificará os alimentos e calculará os macros automaticamente.' },
    { id: 'nutricao-4', category: 'nutricao', question: 'O app considera restrições alimentares?', answer: 'Sim! Durante o onboarding você pode informar alergias e preferências. A IA levará isso em conta ao sugerir refeições.' },
    { id: 'glp1-1', category: 'glp1', question: 'Como funciona o programa GLP-1?', answer: 'O programa GLP-1 oferece acompanhamento nutricional personalizado para quem usa medicamentos como Ozempic, Mounjaro ou similar. Inclui metas ajustadas, check-in semanal de sintomas e orientação para minimizar efeitos colaterais.' },
    { id: 'glp1-2', category: 'glp1', question: 'Como registrar minha aplicação de medicação?', answer: 'Na aba Início, role até o Programa GLP-1 e clique no botão "+" para registrar. Informe o local da aplicação, efeitos colaterais e como você se sentiu.' },
    { id: 'glp1-3', category: 'glp1', question: 'Posso consultar um médico pelo app?', answer: 'Sim! Acesse a seção "Minhas Consultas" para agendar teleconsultas com médicos parceiros, renovar receitas e receber orientação personalizada.' },
    { id: 'glp1-4', category: 'glp1', question: 'Quais são os efeitos colaterais comuns?', answer: 'Os efeitos mais comuns são náusea, saciedade rápida, constipação e fadiga. Faça o check-in semanal para monitorar como você se sente. Se os sintomas forem intensos, consulte seu médico.' },
    { id: 'glp1-5', category: 'glp1', question: 'Como renovar minha receita?', answer: 'No Programa GLP-1, clique em "Renovar" quando a receita estiver próxima do vencimento. Você será direcionado para agendar uma consulta com um médico parceiro.' },
    { id: 'financeiro-1', category: 'financeiro', question: 'Quais são os planos disponíveis?', answer: 'Oferecemos planos mensais e trimestrais com diferentes níveis de acesso. Acesse Configurações > Meu Plano para ver detalhes.' },
    { id: 'financeiro-2', category: 'financeiro', question: 'Como cancelar minha assinatura?', answer: 'Vá em Configurações > Meu Plano > Cancelar Assinatura. Você manterá o acesso até o final do período pago.' },
    { id: 'financeiro-3', category: 'financeiro', question: 'Posso mudar de plano?', answer: 'Sim! Você pode fazer upgrade ou downgrade a qualquer momento. A diferença será calculada proporcionalmente.' },
    { id: 'tecnico-1', category: 'tecnico', question: 'O app funciona offline?', answer: 'Sim! Você pode registrar refeições e dados sem internet. Eles serão sincronizados quando você se conectar novamente.' },
    { id: 'tecnico-2', category: 'tecnico', question: 'Como faço backup dos meus dados?', answer: 'Seus dados são salvos automaticamente na nuvem. Para exportar, vá em Configurações > Exportar Dados.' },
    { id: 'tecnico-3', category: 'tecnico', question: 'O app está lento, o que fazer?', answer: 'Tente: 1) Fechar e reabrir o app, 2) Limpar o cache, 3) Verificar sua conexão. Se persistir, entre em contato com o suporte.' },
    { id: 'conta-1', category: 'conta', question: 'Como alterar meu e-mail?', answer: 'Vá em Configurações > Conta > Alterar E-mail. Você receberá um e-mail de confirmação no novo endereço.' },
    { id: 'conta-2', category: 'conta', question: 'Como alterar minha senha?', answer: 'No seu Perfil, clique em "Alterar Senha". Digite a nova senha (mínimo 8 caracteres) e confirme.' },
    { id: 'conta-3', category: 'conta', question: 'Posso excluir minha conta?', answer: 'Sim, mas atenção: todos os seus dados serão permanentemente excluídos. Entre em contato com o suporte para solicitar.' },
    { id: 'sugestao-1', category: 'sugestao', question: 'Como funciona o programa de indicação?', answer: 'Compartilhe seu link de indicação do seu Perfil. Para cada novo usuário que se cadastrar, você ganha uma comissão. Acompanhe seus ganhos no card de influenciador.' },
    { id: 'sugestao-2', category: 'sugestao', question: 'Quando recebo a comissão?', answer: 'As comissões são processadas mensalmente e podem ser sacadas via Pix quando atingirem o valor mínimo.' },
  ],
  en: [
    { id: 'nutricao-1', category: 'nutricao', question: 'How are my macro goals calculated?', answer: "Your protein, carbohydrate, and fat goals are calculated based on your weight, height, age, activity level, and objective. If you're on the GLP-1 program, goals are automatically adjusted to preserve muscle mass." },
    { id: 'nutricao-2', category: 'nutricao', question: 'Can I adjust my goals manually?', answer: "Yes! Go to Settings > Nutritional Goals. If you have a doctor following up, they may have set fixed goals that can't be changed in the app." },
    { id: 'nutricao-3', category: 'nutricao', question: 'How to log meals by photo?', answer: 'On the Nutri tab, tap the "+" button and select "Photo". Take a photo of your meal and our AI will identify the foods and calculate macros automatically.' },
    { id: 'nutricao-4', category: 'nutricao', question: 'Does the app consider dietary restrictions?', answer: 'Yes! During onboarding you can inform allergies and preferences. The AI will take this into account when suggesting meals.' },
    { id: 'glp1-1', category: 'glp1', question: 'How does the GLP-1 program work?', answer: 'The GLP-1 program offers personalized nutritional support for those using medications like Ozempic, Mounjaro, or similar. It includes adjusted goals, weekly symptom check-ins, and guidance to minimize side effects.' },
    { id: 'glp1-2', category: 'glp1', question: 'How to log my medication application?', answer: 'On the Home tab, scroll to the GLP-1 Program and click the "+" button to log. Enter the injection site, side effects, and how you felt.' },
    { id: 'glp1-3', category: 'glp1', question: 'Can I consult a doctor through the app?', answer: 'Yes! Access the "My Consultations" section to schedule teleconsultations with partner doctors, renew prescriptions, and receive personalized guidance.' },
    { id: 'glp1-4', category: 'glp1', question: 'What are the common side effects?', answer: 'The most common effects are nausea, rapid satiety, constipation, and fatigue. Do the weekly check-in to monitor how you feel. If symptoms are intense, consult your doctor.' },
    { id: 'glp1-5', category: 'glp1', question: 'How to renew my prescription?', answer: "In the GLP-1 Program, click \"Renew\" when the prescription is near expiration. You'll be directed to schedule a consultation with a partner doctor." },
    { id: 'financeiro-1', category: 'financeiro', question: 'What plans are available?', answer: 'We offer monthly and quarterly plans with different access levels. Go to Settings > My Plan to see details.' },
    { id: 'financeiro-2', category: 'financeiro', question: 'How to cancel my subscription?', answer: "Go to Settings > My Plan > Cancel Subscription. You'll keep access until the end of the paid period." },
    { id: 'financeiro-3', category: 'financeiro', question: 'Can I change plans?', answer: 'Yes! You can upgrade or downgrade at any time. The difference will be calculated proportionally.' },
    { id: 'tecnico-1', category: 'tecnico', question: 'Does the app work offline?', answer: "Yes! You can log meals and data without internet. They'll be synced when you reconnect." },
    { id: 'tecnico-2', category: 'tecnico', question: 'How do I backup my data?', answer: 'Your data is automatically saved to the cloud. To export, go to Settings > Export Data.' },
    { id: 'tecnico-3', category: 'tecnico', question: 'The app is slow, what to do?', answer: 'Try: 1) Close and reopen the app, 2) Clear the cache, 3) Check your connection. If it persists, contact support.' },
    { id: 'conta-1', category: 'conta', question: 'How to change my email?', answer: "Go to Settings > Account > Change Email. You'll receive a confirmation email at the new address." },
    { id: 'conta-2', category: 'conta', question: 'How to change my password?', answer: 'In your Profile, click "Change Password". Enter the new password (minimum 8 characters) and confirm.' },
    { id: 'conta-3', category: 'conta', question: 'Can I delete my account?', answer: 'Yes, but be careful: all your data will be permanently deleted. Contact support to request this.' },
    { id: 'sugestao-1', category: 'sugestao', question: 'How does the referral program work?', answer: 'Share your referral link from your Profile. For each new user who signs up, you earn a commission. Track your earnings in the influencer card.' },
    { id: 'sugestao-2', category: 'sugestao', question: 'When do I receive the commission?', answer: 'Commissions are processed monthly and can be withdrawn via Pix when they reach the minimum amount.' },
  ],
  es: [
    { id: 'nutricao-1', category: 'nutricao', question: '¿Cómo se calculan mis metas de macros?', answer: 'Tus metas de proteínas, carbohidratos y grasas se calculan según tu peso, altura, edad, nivel de actividad y objetivo. Si estás en el programa GLP-1, las metas se ajustan automáticamente para preservar la masa muscular.' },
    { id: 'nutricao-2', category: 'nutricao', question: '¿Puedo ajustar mis metas manualmente?', answer: '¡Sí! Ve a Configuración > Metas Nutricionales. Si tienes un médico haciendo seguimiento, puede haber establecido metas fijas que no se pueden cambiar en la app.' },
    { id: 'nutricao-3', category: 'nutricao', question: '¿Cómo registrar comidas por foto?', answer: 'En la pestaña Nutri, toca el botón "+" y selecciona "Foto". Toma una foto de tu comida y nuestra IA identificará los alimentos y calculará los macros automáticamente.' },
    { id: 'nutricao-4', category: 'nutricao', question: '¿La app considera restricciones alimentarias?', answer: '¡Sí! Durante el proceso de registro puedes informar alergias y preferencias. La IA las tendrá en cuenta al sugerir comidas.' },
    { id: 'glp1-1', category: 'glp1', question: '¿Cómo funciona el programa GLP-1?', answer: 'El programa GLP-1 ofrece acompañamiento nutricional personalizado para quienes usan medicamentos como Ozempic, Mounjaro o similares. Incluye metas ajustadas, seguimiento semanal de síntomas y orientación para minimizar efectos secundarios.' },
    { id: 'glp1-2', category: 'glp1', question: '¿Cómo registrar mi aplicación de medicación?', answer: 'En la pestaña Inicio, desplázate hasta el Programa GLP-1 y haz clic en el botón "+" para registrar. Indica el sitio de inyección, efectos secundarios y cómo te sentiste.' },
    { id: 'glp1-3', category: 'glp1', question: '¿Puedo consultar con un médico a través de la app?', answer: '¡Sí! Accede a la sección "Mis Consultas" para programar teleconsultas con médicos asociados, renovar recetas y recibir orientación personalizada.' },
    { id: 'glp1-4', category: 'glp1', question: '¿Cuáles son los efectos secundarios comunes?', answer: 'Los efectos más comunes son náuseas, saciedad rápida, estreñimiento y fatiga. Haz el seguimiento semanal para monitorear cómo te sientes. Si los síntomas son intensos, consulta a tu médico.' },
    { id: 'glp1-5', category: 'glp1', question: '¿Cómo renovar mi receta?', answer: 'En el Programa GLP-1, haz clic en "Renovar" cuando la receta esté cerca del vencimiento. Serás dirigido para programar una consulta con un médico asociado.' },
    { id: 'financeiro-1', category: 'financeiro', question: '¿Qué planes están disponibles?', answer: 'Ofrecemos planes mensuales y trimestrales con diferentes niveles de acceso. Ve a Configuración > Mi Plan para ver detalles.' },
    { id: 'financeiro-2', category: 'financeiro', question: '¿Cómo cancelar mi suscripción?', answer: 'Ve a Configuración > Mi Plan > Cancelar Suscripción. Mantendrás el acceso hasta el final del período pagado.' },
    { id: 'financeiro-3', category: 'financeiro', question: '¿Puedo cambiar de plan?', answer: '¡Sí! Puedes hacer upgrade o downgrade en cualquier momento. La diferencia se calculará proporcionalmente.' },
    { id: 'tecnico-1', category: 'tecnico', question: '¿La app funciona sin internet?', answer: '¡Sí! Puedes registrar comidas y datos sin internet. Se sincronizarán cuando vuelvas a conectarte.' },
    { id: 'tecnico-2', category: 'tecnico', question: '¿Cómo hago copia de seguridad de mis datos?', answer: 'Tus datos se guardan automáticamente en la nube. Para exportar, ve a Configuración > Exportar Datos.' },
    { id: 'tecnico-3', category: 'tecnico', question: 'La app está lenta, ¿qué hacer?', answer: 'Intenta: 1) Cerrar y volver a abrir la app, 2) Limpiar el caché, 3) Verificar tu conexión. Si persiste, contacta con el soporte.' },
    { id: 'conta-1', category: 'conta', question: '¿Cómo cambiar mi email?', answer: 'Ve a Configuración > Cuenta > Cambiar Email. Recibirás un email de confirmación en la nueva dirección.' },
    { id: 'conta-2', category: 'conta', question: '¿Cómo cambiar mi contraseña?', answer: 'En tu Perfil, haz clic en "Cambiar Contraseña". Ingresa la nueva contraseña (mínimo 8 caracteres) y confirma.' },
    { id: 'conta-3', category: 'conta', question: '¿Puedo eliminar mi cuenta?', answer: 'Sí, pero atención: todos tus datos serán eliminados permanentemente. Contacta con el soporte para solicitarlo.' },
    { id: 'sugestao-1', category: 'sugestao', question: '¿Cómo funciona el programa de referidos?', answer: 'Comparte tu enlace de referencia desde tu Perfil. Por cada nuevo usuario que se registre, ganas una comisión. Sigue tus ganancias en la tarjeta de influencer.' },
    { id: 'sugestao-2', category: 'sugestao', question: '¿Cuándo recibo la comisión?', answer: 'Las comisiones se procesan mensualmente y se pueden retirar vía Pix cuando alcancen el monto mínimo.' },
  ],
};

interface FAQProps {
  onContactSupport: () => void;
}

export const FAQSection: React.FC<FAQProps> = ({ onContactSupport }) => {
  const { t, language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const FAQ_DATA = FAQ_DATA_BY_LANG[language];
  const CATEGORY_LABELS = t.faq.categories as Record<string, string>;

  const filteredFAQs = selectedCategory === 'all'
    ? FAQ_DATA
    : FAQ_DATA.filter(f => f.category === selectedCategory);

  const groupedFAQs = filteredFAQs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-Malama-petrol/10 to-emerald-50 dark:from-primary/20 dark:to-emerald-900/10 rounded-2xl p-5 border border-Malama-petrol/20 dark:border-primary/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">❓</span>
          <h3 className="text-lg font-bold text-Malama-main dark:text-white">{t.faq.title}</h3>
        </div>
        <p className="text-sm text-Malama-muted dark:text-slate-400">
          {t.faq.subtitle}
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === 'all'
            ? 'bg-Malama-main dark:bg-white text-white dark:text-Malama-main'
            : 'bg-Malama-bg dark:bg-slate-700 text-Malama-muted dark:text-slate-400 hover:bg-Malama-petrol/10 dark:hover:bg-primary/10'
            }`}
        >
          {t.faq.all}
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === key
              ? 'bg-Malama-main dark:bg-white text-white dark:text-Malama-main'
              : 'bg-Malama-bg dark:bg-slate-700 text-Malama-muted dark:text-slate-400 hover:bg-Malama-petrol/10 dark:hover:bg-primary/10'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* FAQ Items */}
      <div className="flex flex-col gap-3">
        {Object.entries(groupedFAQs).map(([category, faqs]) => (
          <div key={category} className="flex flex-col gap-2">
            <h4 className="text-sm font-bold text-Malama-main dark:text-white flex items-center gap-2">
              <span>{CATEGORY_LABELS[category]}</span>
            </h4>
            {faqs.map(faq => (
              <div
                key={faq.id}
                className="bg-white dark:bg-surface-dark rounded-xl border border-Malama-border dark:border-transparent overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-Malama-bg dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="text-sm font-medium text-Malama-main dark:text-white pr-4">{faq.question}</span>
                  {expandedId === faq.id ? (
                    <ChevronUp className="w-5 h-5 text-Malama-muted dark:text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-Malama-muted dark:text-slate-400 flex-shrink-0" />
                  )}
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${expandedId === faq.id ? 'max-h-96' : 'max-h-0'
                  }`}>
                  <div className="px-4 pb-4 pt-0">
                    <p className="text-sm text-Malama-muted dark:text-slate-400 leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Contact Support CTA */}
      <div className="bg-Malama-bg dark:bg-slate-800 rounded-2xl p-5 text-center">
        <MessageCircle className="w-10 h-10 text-Malama-petrol dark:text-primary mx-auto mb-2" />
        <p className="text-sm font-semibold text-Malama-main dark:text-white mb-1">
          {t.faq.notFound}
        </p>
        <p className="text-xs text-Malama-muted dark:text-slate-400 mb-3">
          {t.faq.teamReady}
        </p>
        <button
          onClick={onContactSupport}
          className="px-6 py-2.5 bg-Malama-main dark:bg-white text-white dark:text-Malama-main text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
        >
          {t.faq.contactSupport}
        </button>
      </div>
    </div>
  );
};

export default FAQSection;
