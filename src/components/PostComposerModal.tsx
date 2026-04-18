import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PostService } from '../services/postService';

interface PostComposerModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  defaultImage?: string;
  defaultCaption?: string;
}

export const PostComposerModal: React.FC<PostComposerModalProps> = ({
  onClose,
  onSuccess,
  defaultImage,
  defaultCaption
}) => {
  const { user } = useAuth();
  const [caption, setCaption] = useState(defaultCaption || '');
  const [imageUrl, setImageUrl] = useState(defaultImage || '');
  const [postType, setPostType] = useState<PostType>('photo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  type PostType = 'photo' | 'meal' | 'streak' | 'hydration' | 'plan' | 'visual' | 'text';

  const postTypes: { value: PostType; label: string; icon: string }[] = [
    { value: 'photo', label: 'Foto', icon: 'photo_camera' },
    { value: 'meal', label: 'Refeição', icon: 'restaurant' },
    { value: 'streak', label: 'Sequência', icon: 'local_fire_department' },
    { value: 'hydration', label: 'Hidratação', icon: 'water_drop' },
    { value: 'plan', label: 'Plano', icon: 'calendar_today' },
    { value: 'visual', label: 'Visual', icon: 'trending_up' },
    { value: 'text', label: 'Texto', icon: 'notes' },
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB.');
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Erro ao processar imagem.');
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('Você precisa estar logado para postar.');
      return;
    }

    if (!caption.trim() && !imageUrl) {
      setError('Adicione uma legenda ou uma imagem.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const postId = await PostService.createPost(user.id, {
        type: postType,
        caption: caption.trim(),
        image_url: imageUrl || undefined,
      });

      if (postId) {
        onSuccess?.();
        onClose();
      } else {
        setError('Erro ao criar post. Tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao criar post:', err);
      setError('Erro ao criar post. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">close</span>
          </button>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Criar Post</h3>
          <button
            onClick={handleSubmit}
            disabled={loading || (!caption.trim() && !imageUrl)}
            className="px-4 py-2 bg-Malama-petrol dark:bg-primary text-white text-sm font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {loading ? 'Postando...' : 'Postar'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Post Type Selector */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
              Tipo de Post
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {postTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setPostType(type.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    postType === type.value
                      ? 'bg-Malama-petrol dark:bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
              Imagem
            </label>
            {imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden">
                <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-Malama-petrol dark:hover:border-primary transition-colors"
              >
                <span className="material-symbols-outlined text-gray-400 text-3xl">add_photo_alternate</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">Adicionar foto</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Caption Input */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
              Legenda
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Compartilhe seu progresso, dica ou pensamento..."
              className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-Malama-petrol dark:focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              {caption.length}/500
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostComposerModal;
