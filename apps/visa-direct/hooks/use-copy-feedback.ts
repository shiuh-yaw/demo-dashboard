"use client";

import { useState, useCallback } from "react";
import { copyToClipboard } from "@dynamic-demos/utils";

export function useCopyFeedback(duration = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const success = await copyToClipboard(text);
      if (success) {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, duration);
      }
      return success;
    },
    [duration],
  );

  return { copied, copy };
}
