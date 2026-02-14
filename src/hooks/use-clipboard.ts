import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseClipboardProps {
  timeout?: number;
}

export function useClipboard({ timeout = 2000 }: UseClipboardProps = {}) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(
    async (value: string) => {
      if (!value) return;

      if (typeof window === 'undefined' || !navigator.clipboard?.writeText) {
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
        setIsCopied(true);
        toast.success('Copied to clipboard!');

        setTimeout(() => {
          setIsCopied(false);
        }, timeout);
      } catch (err) {
        console.error('Failed to copy: ', err);
        toast.error('Failed to copy to clipboard');
        setIsCopied(false);
      }
    },
    [timeout]
  );

  return { isCopied, copyToClipboard };
}
