import { cn } from '@/lib/utils';

interface AppIconProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'brand' | 'onDark';
  className?: string;
}

const sizeMap = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
} as const;

export function AppIcon({ size = 'md', variant = 'brand', className }: AppIconProps) {
  return (
    <svg
      className={cn(
        sizeMap[size],
        variant === 'brand' ? 'text-indigo-600' : 'text-white',
        className,
      )}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <rect x="7" y="11" width="10" height="8" rx="1.5" />
      <path
        d="M9 11V8a3 3 0 1 1 6 0v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="15"
        r="1"
        className={variant === 'brand' ? 'fill-white' : 'fill-indigo-600'}
      />
    </svg>
  );
}
