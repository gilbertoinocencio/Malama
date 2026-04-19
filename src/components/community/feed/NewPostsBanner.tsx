import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

interface NewPostsBannerProps {
  count: number;
  onRefresh: () => void;
}

export const NewPostsBanner: React.FC<NewPostsBannerProps> = ({ count, onRefresh }) => (
  <AnimatePresence>
    {count > 0 && (
      <motion.button
        initial={{ y: -48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -48, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        onClick={onRefresh}
        className="sticky top-2 z-30 mx-auto flex items-center gap-2 bg-Malama-petrol text-white
          text-xs font-semibold px-4 py-2 rounded-full shadow-lg shadow-[#2ECC71]/30"
      >
        <ArrowUp size={13} />
        {count} novo{count !== 1 ? 's' : ''} post{count !== 1 ? 's' : ''} — ver agora
      </motion.button>
    )}
  </AnimatePresence>
);
