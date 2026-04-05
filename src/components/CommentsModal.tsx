import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PostService, Comment } from '../services/postService';

interface CommentsModalProps {
  postId: string;
  onClose: () => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({ postId, onClose }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    setLoading(true);
    const data = await PostService.getComments(postId);
    setComments(data);
    setLoading(false);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    const comment = await PostService.addComment(postId, user.id, newComment);
    if (comment) {
      setComments([...comments, comment]);
      setNewComment('');
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    const success = await PostService.deleteComment(commentId, user.id);
    if (success) {
      setComments(comments.filter(c => c.id !== commentId));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-lg max-h-[80vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Comentários ({comments.length})
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">close</span>
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nura-petrol dark:border-primary"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-4xl">chat_bubble_outline</span>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Nenhum comentário ainda. Seja o primeiro!
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                  {comment.profiles?.avatar_url ? (
                    <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-gray-400 text-[16px] flex items-center justify-center h-full">
                      person
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                      {comment.profiles?.display_name || 'Usuário'}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 break-words">
                      {comment.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 px-1">
                    <span className="text-[10px] text-gray-400">
                      {new Date(comment.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    {user?.id === comment.user_id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-[10px] text-red-500 hover:text-red-600 font-medium"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        {user && (
          <form onSubmit={handleSubmitComment} className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicione um comentário..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-nura-petrol dark:focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="px-4 py-2 bg-nura-petrol dark:bg-primary text-white rounded-full text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {submitting ? (
                  <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin block" />
                ) : (
                  <span className="material-symbols-outlined text-[20px]">send</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CommentsModal;
