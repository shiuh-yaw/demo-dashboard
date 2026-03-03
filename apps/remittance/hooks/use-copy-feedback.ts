"use client";

import { useState, useCallback } from "react";
import { copyToClipboard } from "@dynamic-demos/utils";

export function useCopyFeedback(duration = 2000) {
  const [copied, setCopied] = useState(false);
  const [lastCopiedText, setLastCopiedText] = useState<string | null>(null);

  const copy = useCallback(
    async (text: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const success = await copyToClipboard(text);
      if (success) {
        setLastCopiedText(text);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          setLastCopiedText(null);
        }, duration);
      }
      return success;
    },
    [duration],
  );

  return { copied, lastCopiedText, copy };
}
