import React, { useState } from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

const SocialProofStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      name: 'Maria Silva',
      age: 32,
      result: 'Perdeu 12kg em 3 meses',
      text: 'O Nura mudou completamente a minha relação com a comida. Aprendi a comer melhor sem passar fome!',
      rating: 5
    },
    {
      name: 'João Santos',
      age: 45,
      result: 'Perdeu 18kg em 5 meses',
      text: 'Finalmente consegui atingir o meu peso ideal. O acompanhamento personalizado fez toda a diferença.',
      rating: 5
    },
    {
      name: 'Ana Costa',
      age: 28,
      result: 'Perdeu 8kg em 2 meses',
      text: 'Adorei as sugestões de refeições! São práticas e deliciosas. Recomendo a todos!',
      rating: 5
    }
  ];

  const stats = [
    { value: '50k+', label: 'Utilizadores ativos' },
    { value: '4.8⭐', label: 'Avaliação média' },
    { value: '85%', label: 'Taxa de sucesso' }
  ];

  return (
    <StepContainer currentStep={currentStep} totalSteps={totalSteps} onBack={onBack} showBack={true}>
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Histórias de sucesso
            </h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-md w-full mb-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full border-2 border-gray-100 dark:border-gray-700">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold">
                {testimonials[currentTestimonial].name.charAt(0)}
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                {testimonials[currentTestimonial].name}, {testimonials[currentTestimonial].age} anos
              </h3>
              <p className="text-green-600 dark:text-green-400 font-semibold text-sm">
                {testimonials[currentTestimonial].result}
              </p>
            </div>

            <div className="mb-4 flex justify-center gap-1">
              {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                <span key={i} className="text-yellow-500 text-xl">⭐</span>
              ))}
            </div>

            <p className="text-gray-700 dark:text-gray-300 text-center italic mb-6">
              "{testimonials[currentTestimonial].text}"
            </p>

            <div className="flex justify-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentTestimonial === index
                      ? 'bg-green-500 w-6'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={onNext}
            className="w-full bg-gradient-to-r from-primary to-emerald-500 text-white py-4 px-6 rounded-2xl font-bold text-xl shadow-md hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Seguinte
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default SocialProofStep;
