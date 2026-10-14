import * as React from "react";
import { cn } from "cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content min-h-16 w-full resize-none rounded-xl",
        "border border-line bg-card px-3.5 py-3 text-sm outline-none transition",
        "placeholder:text-muted-foreground/70 focus-visible:border-sage",
        "focus-visible:ring-4 focus-visible:ring-sage/10 disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
