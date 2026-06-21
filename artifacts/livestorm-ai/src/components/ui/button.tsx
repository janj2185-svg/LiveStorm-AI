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
          "bg-gradient-to-r from-sky-500 to-sky-400 text-white border border-sky-300 shadow-sm shadow-sky-500/20 hover:brightness-105 hover:shadow-md hover:shadow-sky-500/25 active:brightness-95 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive/40 shadow-sm hover:brightness-110 active:brightness-95 active:scale-[0.98]",
        outline:
          "border border-white/75 bg-white/58 text-slate-700 hover:bg-white/82 hover:border-sky-200 hover:text-slate-950 active:bg-white/70 active:scale-[0.98]",
        secondary:
          "bg-white/66 text-slate-700 border border-white/75 hover:bg-white/88 hover:text-slate-950 active:bg-white/70 active:scale-[0.98]",
        ghost:
          "text-slate-500 hover:bg-white/64 hover:text-slate-950 active:bg-white/54 active:scale-[0.98]",
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
