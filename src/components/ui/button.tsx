"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "motion/react"
import { Loader2 } from 'lucide-react';

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] text-primary-foreground hover:shadow-lg hover:shadow-primary/30 transition-shadow",
        active:
          "bg-primary/10 text-primary hover:bg-primary/20",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
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
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    // Only use motion.button for native buttons, and Slot for asChild (no animation)
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }), loading && "opacity-80 cursor-not-allowed")}
          ref={ref}
          {...props}
        />
      )
    }
    // Remove onDrag from props to avoid type conflict with motion.button
    const { onDrag, ...rest } = props as any;
    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }), loading && "opacity-80 cursor-not-allowed")}
        ref={ref}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        disabled={loading || props.disabled}
        {...rest}
      >
        {loading && <Loader2 className="animate-spin" />}
        {!loading && children}
      </motion.button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
