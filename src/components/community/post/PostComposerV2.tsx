import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2 } from 'lucide-react';
import { createCommunityPost } from '../../../services/communityService';
import { MediaUploadGrid } from './MediaUploadGrid';
import { TagInput } from './TagInput';
import toast from 'react-hot-toast';

interface PostComposerV2Props {
  userId: string;
  onClose: () => void;
  onPublished: () => void;
}

export const PostComposerV2: React.FC<PostComposerV2Props> = ({ userId, onClose, onPublished }) => {
  const [step, setStep] = useState<'compose' | 'preview'>('compose');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  const hasVideo = files.some(f => f.type.startsWith('video/'));
  const canPublish = caption.trim().length > 0 || files.length > 0;

  const handleMediaChange = (newFiles: File[], newPreviews: string[]) => {
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleTagsFromCaption = () => {
    const extracted = (caption.match(/#[\wÀ-ú]+/g) ?? []).map(t => t.slice(1).toLowerCase());
    const merged = [...new Set([...tags, ...extracted])].slice(0, 5);
    setTags(merged);
  };

  const handlePublish = async () => {
    if (!canPublish || publishing) return;
    setPublishError('');
    setPublishing(true);
    try {
      const postId = await createCommunityPost(userId, {
        caption,
        files: files.length > 0 ? files : undefined,
        type: hasVideo ? 'video' : files.length > 0 ? 'photo' : 'text',
      });
      if (postId) {
        toast.success('Post publicado!');
        onPublished();
      } else {
        setPublishError('Não foi possível publicar. Tente novamente.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === 'daily_limit_reached') {
        setPublishError('Você atingiu o limite de 10 posts por dia.');
      } else if (message === 'video_too_long') {
        setPublishError('O vídeo não pode ter mais de 60 segundos.');
      } else if (message === 'video_too_large') {
        setPublishError('O vídeo não pode ter mais de 50MB.');
      } else {
        setPublishError('Erro ao publicar. Verifique sua conexão e tente novamente.');
        console.error('[PostComposerV2] publish error:', err);
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-t-2xl flex flex-col max-h-[92vh]"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <X size={18} className="text-gray-500" />
            </button>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {step === 'compose' ? 'Novo post' : 'Revisar'}
            </h3>
            <button
              onClick={step === 'compose' ? () => setStep('preview') : handlePublish}
              disabled={!canPublish || publishing}
              className="flex items-center gap-1.5 bg-[#2ECC71] disabled:bg-gray-200 dark:disabled:bg-gray-700
                text-white disabled:text-gray-400 text-sm font-semibold px-4 py-1.5 rounded-full transition-colors"
            >
              {publishing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : step === 'compose' ? (
                'Avançar'
              ) : (
                <><Send size={14} /> Publicar</>
              )}
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-safe">
            {/* Error banner — shown inside modal so it's always visible */}
            {publishError && (
              <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                {publishError}
              </div>
            )}

            {/* Mídia */}
            <MediaUploadGrid
              files={files}
              previews={previews}
              hasVideo={hasVideo}
              onChange={handleMediaChange}
            />

            {/* Texto */}
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              onBlur={handleTagsFromCaption}
              placeholder="O que você quer compartilhar com a comunidade? Use #tags para categorizar…"
              rows={4}
              maxLength={1000}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400
                resize-none outline-none focus:ring-2 focus:ring-[#2ECC71]/40"
            />
            <div className="flex justify-end">
              <span className="text-xs text-gray-400">{caption.length}/1000</span>
            </div>

            {/* Tags */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Tags</p>
              <TagInput tags={tags} onChange={setTags} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
