import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '../../../services/communityService';
import toast from 'react-hot-toast';

interface NotificationPreferencesSheetProps {
  userId: string;
  onClose: () => void;
}

const PREFS_LABELS: Array<{ key: keyof NotificationPreferences; label: string; description: string }> = [
  { key: 'on_comment',          label: 'Comentários',         description: 'Quando alguém comenta no seu post' },
  { key: 'on_reply',            label: 'Respostas',           description: 'Quando alguém responde seu comentário' },
  { key: 'on_reaction',         label: 'Reações',             description: 'Quando alguém reage ao seu post' },
  { key: 'on_new_follower',     label: 'Novos seguidores',    description: 'Quando alguém começa a te seguir' },
  { key: 'on_milestone',        label: 'Marcos',              description: 'Conquistas e marcos da jornada' },
  { key: 'on_spotlight',        label: 'Destaque da semana',  description: 'Quando seu post é o mais curtido' },
  { key: 'on_badge_earned',     label: 'Badges',              description: 'Quando você conquista um novo badge' },
  { key: 'on_doctor_broadcast', label: 'Mensagens médicas',   description: 'Broadcasts da equipe médica' },
  { key: 'milestone_opt_out',   label: 'Ocultar marcos no feed', description: 'Não publicar seus marcos automaticamente' },
];

export const NotificationPreferencesSheet: React.FC<NotificationPreferencesSheetProps> = ({ userId, onClose }) => {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNotificationPreferences(userId).then(setPrefs);
  }, [userId]);

  const toggle = (key: keyof NotificationPreferences) => {
    if (!prefs) return;
    setPrefs(p => p ? { ...p, [key]: !p[key] } : p);
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    const ok = await updateNotificationPreferences(userId, prefs);
    if (ok) { toast.success('Preferências salvas!'); onClose(); }
    else toast.error('Erro ao salvar.');
    setSaving(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-t-2xl flex flex-col max-h-[85vh]"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Notificações</h3>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!prefs ? (
              <div className="p-4 space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              PREFS_LABELS.map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                    <p className="text-xs text-gray-400">{description}</p>
                  </div>
                  <button
                    onClick={() => toggle(key)}
                    className={`w-11 h-6 rounded-full transition-colors shrink-0 ${prefs[key] ? 'bg-[#2ECC71]' : 'bg-gray-200 dark:bg-gray-700'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 pb-safe">
            <button
              onClick={handleSave}
              disabled={saving || !prefs}
              className="w-full bg-[#2ECC71] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Salvando…' : 'Salvar preferências'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
