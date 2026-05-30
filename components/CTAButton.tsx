import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

type CTAButtonProps = {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
  ariaLabel?: string;
};

export default function CTAButton({
  href,
  children,
  variant = 'primary',
  className = '',
  ariaLabel
}: CTAButtonProps) {
  const baseClassName =
    'inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-[14px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

  const variantClassName =
    variant === 'primary'
      ? 'border-transparent bg-brand-600 text-white hover:bg-brand-800'
      : 'border-brand-100 bg-white text-brand-600 hover:border-brand-400';

  return (
    <Link aria-label={ariaLabel} className={`${baseClassName} ${variantClassName} ${className}`.trim()} href={href}>
      <span>{children}</span>
      {variant === 'primary' ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
    </Link>
  );
}