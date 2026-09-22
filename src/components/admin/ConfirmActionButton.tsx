"use client";

export function ConfirmActionButton({ action, children, message, className }: { action: (formData: FormData) => void | Promise<void>; children: React.ReactNode; message: string; className?: string }) {
  return <button className={className} formAction={action} onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>{children}</button>;
}
