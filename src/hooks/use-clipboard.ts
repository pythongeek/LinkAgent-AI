import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export function useClipboard({ timeout = 2000 } = {}) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback((text: string) => {
    if (!text) return;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setIsCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setIsCopied(false), timeout);
      }).catch((err) => {
        console.error('Failed to copy text: ', err);
        toast.error("Failed to copy text.");
      });
    } else {
        // Fallback for non-secure contexts (if needed, though unlikely in modern apps)
        toast.error("Clipboard access not available.");
    }
  }, [timeout]);

  return { isCopied, copyToClipboard };
}
