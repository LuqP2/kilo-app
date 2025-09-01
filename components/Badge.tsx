import React from 'react';

interface BadgeProps {
  text: string;
  variant?: 'default' | 'suggestion';
  onClick: () => void;
  removable?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
}

const Badge: React.FC<BadgeProps> = ({ text, variant = 'default', onClick, removable = false, ariaLabel, disabled = false }) => {
  const baseClasses = "inline-flex items-center gap-x-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition-colors";

  const variantClasses = {
    default: "bg-orange-100 text-orange-800",
    suggestion: "bg-slate-200 text-slate-700 hover:bg-slate-300",
  };
  
  const disabledClasses = "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-200";

  if (variant === 'default') {
    return (
      <span className={`${baseClasses} ${variantClasses.default}`}>
        <span className="capitalize">{text}</span>
        {removable && (
            <button
            type="button"
            onClick={onClick}
            className="group relative -mr-1 h-3.5 w-3.5 rounded-sm hover:bg-orange-600/20"
            aria-label={ariaLabel || `Remover ${text}`}
            >
            <span className="sr-only">Remover {text}</span>
            <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 stroke-orange-700/50 group-hover:stroke-orange-700/75">
                <path d="M4 4l6 6m0-6l-6 6" />
            </svg>
            </button>
        )}
      </span>
    );
  }

  // Suggestion variant
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${variantClasses.suggestion} ${disabledClasses}`}
      aria-label={ariaLabel || `Adicionar ${text}`}
      disabled={disabled}
    >
      + <span className="capitalize">{text}</span>
    </button>
  );
};

export default Badge;
