import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary border border-primary/20",
        secondary:
          "bg-secondary text-secondary-foreground border border-white/[0.06]",
        outline: "border border-white/[0.1] text-foreground",
        success: "bg-emerald-400/15 text-emerald-400 border border-emerald-400/20",
        warning: "bg-amber-400/15 text-amber-400 border border-amber-400/20",
        destructive: "bg-destructive/15 text-destructive border border-destructive/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
