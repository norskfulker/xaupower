"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"
import {
  buttonVariants,
  type ButtonVariantProps,
} from "@/components/ui/button-variants"

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & ButtonVariantProps) {
  const reduceMotion = useReducedMotion()

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      render={
        <motion.button
          whileHover={
            reduceMotion || variant === "link" ? undefined : { scale: 1.02 }
          }
          whileTap={
            reduceMotion || variant === "link" ? undefined : { scale: 0.97 }
          }
          transition={{ type: "spring", stiffness: 520, damping: 28 }}
        />
      }
      {...props}
    />
  )
}

export { Button, buttonVariants }
