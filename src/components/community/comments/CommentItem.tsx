import React, { useState } from 'react';
import { Trash2, CornerDownRight } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { formatDistanceToNow } from '../../../utils/dateUtils';
import type { ThreadedComment } from '../../../services/communityService';

interface CommentItemProps {
  comment: ThreadedComment;
  currentUserId: string;
  onReply: (comment: ThreadedComment) => void;
  depth?: number;
}

export const CommentItem: React.FC<CommentItemProps> = ({ comment, currentUserId, onReply, depth = 0 }) => {
  const [showReplies, setShowReplies] = useState(true);
  const [deleted, setDeleted] = useState(false);

  const handleDelete = async () => {
    if (comment.user_id !== currentUserId) return;
    await supabase.from('comments').delete().eq('id', comment.id);
    setDeleted(true);
  };

  if (deleted) return null;

  return (
    <div className={depth > 0 ? 'ml-8 border-l-2 border-gray-100 dark:border-gray-800 pl-3' : ''}>
      <div className="flex gap-2.5 mb-1">
        {comment.author.avatar_url ? (
          <img src={comment.author.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#2ECC71]/20 flex items-center justify-center text-[#2ECC71] text-xs font-bold shrink-0 mt-0.5">
            {comment.author.display_name[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {comment.author.display_name}
              </span>
              {comment.user_id === currentUserId && (
                <button onClick={handleDelete} className="p-0.5 text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {comment.content}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(comment.created_at))}</span>
            {depth === 0 && (
              <button
                onClick={() => onReply(comment)}
                className="text-xs text-[#2ECC71] font-medium flex items-center gap-0.5 hover:underline"
              >
                <CornerDownRight size={11} /> Responder
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && depth === 0 && (
        <>
          {!showReplies ? (
            <button
              onClick={() => setShowReplies(true)}
              className="ml-10 text-xs text-[#2ECC71] font-medium mb-2"
            >
              Ver {comment.replies.length} resposta{comment.replies.length !== 1 ? 's' : ''}
            </button>
          ) : (
            <div className="space-y-1 mb-1">
              {comment.replies.map(reply => (
                <CommentItem key={reply.id} comment={reply} currentUserId={currentUserId} onReply={onReply} depth={1} />
              ))}
              <button onClick={() => setShowReplies(false)} className="ml-10 text-xs text-gray-400 hover:underline">
                Recolher respostas
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
