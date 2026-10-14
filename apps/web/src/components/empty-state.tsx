import type { PropsWithChildren } from "react";

export function EmptyState({
  icon,
  title,
  copy,
}: PropsWithChildren<{
  icon: React.ReactNode;
  title: string;
  copy: string;
}>) {
  return (
    <div className="grid place-items-center px-6 py-16 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-sand text-sage-dark">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
        {copy}
      </p>
    </div>
  );
}
