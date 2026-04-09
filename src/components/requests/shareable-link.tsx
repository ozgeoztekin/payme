'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ShareableLinkProps {
  url: string;
}

export function ShareableLink({ url }: ShareableLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [url]);

  return (
    <div className="w-full space-y-3">
      <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
        Shareable Link
      </label>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-700 truncate select-all">
          {url}
        </div>
        <Button
          variant={copied ? 'secondary' : 'primary'}
          size="sm"
          onClick={handleCopy}
          className={cn(
            'shrink-0 transition-all',
            copied && 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
          )}
        >
          {copied ? (
            <>
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
