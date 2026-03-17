import React from 'react';

interface OptionChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: string;
}

const OptionChip: React.FC<OptionChipProps> = ({ label, selected, onClick, icon }) => {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-5 py-3 rounded-full
        font-medium text-base transition-all
        ${
          selected
            ? 'bg-orange-500 text-white border-2 border-orange-500'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      {icon && <span className="text-xl">{icon}</span>}
      <span>{label}</span>
      {selected && (
        <span className="w-2 h-2 rounded-full bg-white"></span>
      )}
    </button>
  );
};

export default OptionChip;
