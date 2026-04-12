import { cn } from '@/lib/utils';

const containerSizes = {
  sm: 'max-w-lg',
  md: 'max-w-2xl',
  lg: 'max-w-5xl',
} as const;

type ContainerSize = keyof typeof containerSizes;

interface PageContainerProps {
  size?: ContainerSize;
  centered?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function PageContainer({
  size = 'md',
  centered = false,
  className,
  children,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto space-y-8',
        containerSizes[size],
        centered && 'flex flex-col items-center text-center',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  if (actions) {
    return (
      <div className={cn('flex items-start justify-between gap-4', className)}>
        <div>
          <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="mt-1.5 text-on-surface-variant">{subtitle}</p>}
        </div>
        {actions}
      </div>
    );
  }

  return (
    <div className={className}>
      <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      {subtitle && <p className="mt-1.5 text-on-surface-variant">{subtitle}</p>}
    </div>
  );
}

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionTitle({ children, className }: SectionTitleProps) {
  return (
    <h2
      className={cn(
        'font-[family-name:var(--font-manrope)] text-lg font-semibold text-foreground',
        className,
      )}
    >
      {children}
    </h2>
  );
}
