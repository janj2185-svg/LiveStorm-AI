import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary/55 shadow-sm shadow-primary/20 hover:brightness-110 hover:shadow-md hover:shadow-primary/30 active:brightness-95 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive/40 shadow-sm hover:brightness-110 active:brightness-95 active:scale-[0.98]",
        outline:
          "border border-white/14 bg-white/[0.04] text-white/80 hover:bg-white/[0.09] hover:border-white/22 hover:text-white active:bg-white/[0.06] active:scale-[0.98]",
        secondary:
          "bg-white/[0.07] text-white/85 border border-white/[0.09] hover:bg-white/[0.11] hover:text-white active:bg-white/[0.06] active:scale-[0.98]",
        ghost:
          "text-white/65 hover:bg-white/[0.07] hover:text-white active:bg-white/[0.04] active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
