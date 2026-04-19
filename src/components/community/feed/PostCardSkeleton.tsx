import React from 'react';
import { motion } from 'framer-motion';

export const PostCardSkeleton: React.FC = () => (
  <motion.div
    className="bg-white dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-white/10"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#363330] animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-28 bg-gray-200 dark:bg-[#363330] rounded animate-pulse" />
        <div className="h-3 w-16 bg-gray-100 dark:bg-Malama-dark rounded animate-pulse" />
      </div>
    </div>
    <div className="space-y-2 mb-3">
      <div className="h-3.5 w-full bg-gray-100 dark:bg-Malama-dark rounded animate-pulse" />
      <div className="h-3.5 w-3/4 bg-gray-100 dark:bg-Malama-dark rounded animate-pulse" />
    </div>
    <div className="h-40 w-full bg-gray-100 dark:bg-Malama-dark rounded-xl animate-pulse mb-3" />
    <div className="flex gap-4">
      <div className="h-7 w-14 bg-gray-100 dark:bg-Malama-dark rounded-full animate-pulse" />
      <div className="h-7 w-14 bg-gray-100 dark:bg-Malama-dark rounded-full animate-pulse" />
    </div>
  </motion.div>
);
