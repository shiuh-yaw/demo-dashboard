interface ErrorMessageProps {
  error: Error | null | undefined;
  className?: string;
}

export function ErrorMessage({ error, className }: ErrorMessageProps) {
  if (!error) return null;
  return (
    <p className={`text-xs text-(--brand-error) text-center ${className ?? ""}`}>
      {error.message}
    </p>
  );
}
