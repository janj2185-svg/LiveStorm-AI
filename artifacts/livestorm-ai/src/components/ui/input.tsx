import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-white/12 bg-white/[0.05] px-3.5 py-2 text-sm text-white shadow-sm transition-all",
          "placeholder:text-white/32 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/40 focus-visible:bg-white/[0.07]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "hover:border-white/20 hover:bg-white/[0.06]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
