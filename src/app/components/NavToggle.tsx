'use client';

type Props = {
  onClick?: () => void;      // коллбек для открытия дроуера
  title?: string;            // подсказка при наведении
  className?: string;
};

export default function NavToggle({ onClick, title = 'Меню', className = '' }: Props) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 border border-white/40 text-white/90 hover:bg-white/30 transition ${className}`}
    >
      {/* иконка-гамбургер в квадратике */}
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path fill="currentColor" d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
      </svg>
    </button>
  );
}
