import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"
import { cn } from "cn"

function ScrollArea({
  className,
  children,
  orientation = "vertical",
  scrollbarClassName,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  orientation?: ScrollAreaPrimitive.Scrollbar.Props["orientation"]
  scrollbarClassName?: string
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        // max-h-[inherit]: when the root is sized with max-height instead of a
        // fixed height, size-full does not resolve against it and the viewport
        // never becomes a scroll container. Inherit resolves to `none` when the
        // root sets no max-height, so this is a no-op for fixed-height roots.
        // overflow-y-hidden: a horizontal area still reports a couple of pixels
        // of vertical overflow, which is enough for the wheel to scroll it
        // vertically instead of being translated into horizontal scrolling.
        className={cn(
          "focus-visible:ring-ring/50 size-full max-h-[inherit] rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1",
          orientation === "horizontal" && "overflow-y-hidden!"
        )}
        onWheel={
          orientation === "horizontal"
            ? (event) => {
                event.currentTarget.scrollLeft += event.deltaY
              }
            : undefined
        }
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar className={scrollbarClassName} orientation={orientation} />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px opacity-0 transition-opacity duration-150 select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-hovering:opacity-100 data-scrolling:opacity-100 data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
