import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-widest font-medium",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        blood:
          "border-transparent bg-primary/15 text-primary ring-1 ring-primary/30",
        rust:
          "border-transparent bg-accent/20 text-accent-foreground ring-1 ring-accent/40",
        ghost: "border-transparent bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
