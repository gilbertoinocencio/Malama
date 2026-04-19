import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { getThreadedComments, addComment, type ThreadedComment } from '../../../services/communityService';
import { CommentItem } from './CommentItem';
import { MentionInput } from './MentionInput';

interface CommentsSheetV2Props {
  postId: string;
  currentUserId: string;
  onClose: () => void;
}

export const CommentsSheetV2: React.FC<CommentsSheetV2Props> = ({ postId, currentUserId, onClose }) => {
  const [comments, setComments] = useState<ThreadedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [replyingTo, setReplyingTo] = useState<ThreadedComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getThreadedComments(postId).then(c => { setComments(c); setLoading(false); });
  }, [postId]);

  const handleSubmit = async () => {
    const text = inputValue.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    const newComment = await addComment(postId, currentUserId, text, replyingTo?.id ?? null);
    if (newComment) {
      if (replyingTo) {
        setComments(prev =>
          prev.map(c => c.id === replyingTo.id
            ? { ...c, replies: [...(c.replies ?? []), newComment] }
            : c
          )
        );
      } else {
        setComments(prev => [...prev, newComment]);
      }
      setInputValue('');
      setReplyingTo(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white dark:bg-surface-dark rounded-t-2xl flex flex-col max-h-[85vh]"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10 shrink-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Comentários</h3>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-Malama-dark animate-pulse shrink-0" />
                    <div className="flex-1 h-14 bg-gray-100 dark:bg-Malama-dark rounded-xl animate-pulse" />
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Nenhum comentário ainda. Seja o primeiro! 💬
              </p>
            ) : (
              comments.map(c => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  currentUserId={currentUserId}
                  onReply={setReplyingTo}
                />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-white/10 shrink-0 pb-safe">
            {replyingTo && (
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-xs text-gray-400">
                  Respondendo a <span className="font-semibold text-gray-600 dark:text-slate-300">@{replyingTo.author.display_name}</span>
                </span>
                <button onClick={() => setReplyingTo(null)} className="text-xs text-gray-400 hover:underline">Cancelar</button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <MentionInput
                  value={inputValue}
                  onChange={setInputValue}
                  placeholder={replyingTo ? `Responder @${replyingTo.author.display_name}…` : 'Adicione um comentário…'}
                  onSubmit={handleSubmit}
                  disabled={submitting}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || submitting}
                className="w-10 h-10 bg-Malama-petrol disabled:bg-gray-200 dark:disabled:bg-gray-700 rounded-full
                  flex items-center justify-center shrink-0 transition-colors mb-0.5"
              >
                <Send size={16} className="text-white" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
