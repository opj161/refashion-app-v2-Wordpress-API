"use client"

import * as React from "react"
import { motion, LayoutGroup } from "motion/react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

// 1. Create a context to hold the active tab's value
const TabsContext = React.createContext<{
  activeTab: string
}>({
  activeTab: "",
})

// 2. Tabs component provides the active tab value to context
const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ value, ...props }, ref) => (
  <TabsPrimitive.Root ref={ref} value={value} {...props}>
    <TabsContext.Provider value={{ activeTab: value || "" }}>
      {props.children}
    </TabsContext.Provider>
  </TabsPrimitive.Root>
))
Tabs.displayName = TabsPrimitive.Root.displayName

// 3. TabsList wraps children in LayoutGroup for shared layout animations
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "relative inline-flex h-12 items-center justify-center rounded-full bg-muted p-0",
      className
    )}
    {...props}
  >
    <LayoutGroup id={React.useId()}>{children}</LayoutGroup>
  </TabsPrimitive.List>
))
TabsList.displayName = TabsPrimitive.List.displayName

// 4. TabsTrigger uses context to determine if it's active and renders the indicator
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, value, ...props }, ref) => {
  const { activeTab } = React.useContext(TabsContext)
  const isActive = activeTab === value

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        "relative inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 py-2.5 text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {isActive && (
        <motion.div
          layoutId="active-tab-indicator"
          className="absolute inset-0 z-0 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
    </TabsPrimitive.Trigger>
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "data-[state=inactive]:hidden",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
