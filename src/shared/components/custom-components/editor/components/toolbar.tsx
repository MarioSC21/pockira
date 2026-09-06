"use client"

import { Toolbar as ToolbarPrimitive } from "@base-ui/react/toolbar"
import { cva } from "class-variance-authority"
import type { VariantProps } from "class-variance-authority"
import { ChevronDown } from "lucide-react"
import * as React from "react"

import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu"
import { Separator } from "@/shared/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import { cn } from "@/shared/lib/utils"

export function Toolbar({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Root>) {
  return (
    <ToolbarPrimitive.Root
      className={cn("relative flex items-center select-none", className)}
      {...props}
    />
  )
}

export function ToolbarLink({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Link>) {
  return (
    <ToolbarPrimitive.Link
      className={cn("font-medium underline underline-offset-4", className)}
      {...props}
    />
  )
}

export function ToolbarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Separator>) {
  return (
    <ToolbarPrimitive.Separator
      className={cn("bg-border mx-2 my-1 w-px shrink-0", className)}
      {...props}
    />
  )
}

// From toggleVariants
const toolbarButtonVariants = cva(
  "hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 data-pressed:bg-accent data-pressed:text-accent-foreground aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 inline-flex cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-9 min-w-9 px-2",
        lg: "h-10 min-w-10 px-2.5",
        sm: "h-8 min-w-8 px-1.5",
      },
      variant: {
        default: "bg-transparent",
        outline:
          "border-input hover:bg-accent hover:text-accent-foreground border bg-transparent shadow-xs",
      },
    },
  }
)

const dropdownArrowVariants = cva(
  cn(
    "text-foreground inline-flex items-center justify-center rounded-r-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
  ),
  {
    defaultVariants: {
      size: "sm",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-9 w-6",
        lg: "h-10 w-8",
        sm: "h-8 w-4",
      },
      variant: {
        default:
          "hover:bg-muted hover:text-muted-foreground data-pressed:bg-accent data-pressed:text-accent-foreground bg-transparent",
        outline:
          "border-input hover:bg-accent hover:text-accent-foreground border border-l-0 bg-transparent",
      },
    },
  }
)

type ToolbarButtonProps = {
  isDropdown?: boolean
  pressed?: boolean
} & Omit<React.ComponentProps<typeof ToolbarPrimitive.Button>, "value"> &
  VariantProps<typeof toolbarButtonVariants>

export const ToolbarButton = withTooltip(
  ({
    children,
    className,
    isDropdown,
    pressed,
    size = "sm",
    variant,
    ...props
  }: ToolbarButtonProps) => (
    <ToolbarPrimitive.Button
      className={cn(
        toolbarButtonVariants({
          size,
          variant,
        }),
        isDropdown && "justify-between gap-1 pr-1",
        className
      )}
      data-pressed={pressed ? true : undefined}
      {...props}
    >
      {isDropdown ? (
        <>
          <div className="flex flex-1 items-center gap-2 whitespace-nowrap">
            {children}
          </div>
          <div>
            <ChevronDown className="text-muted-foreground size-3.5" data-icon />
          </div>
        </>
      ) : (
        children
      )}
    </ToolbarPrimitive.Button>
  )
)

export function ToolbarSplitButton({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ToolbarButton>) {
  return (
    <ToolbarButton
      className={cn("group flex gap-0 px-0 hover:bg-transparent", className)}
      {...props}
    />
  )
}

type ToolbarSplitButtonPrimaryProps = React.ComponentPropsWithoutRef<"span"> &
  VariantProps<typeof toolbarButtonVariants>

export function ToolbarSplitButtonPrimary({
  children,
  className,
  size = "sm",
  variant,
  ...props
}: ToolbarSplitButtonPrimaryProps) {
  return (
    <span
      className={cn(
        toolbarButtonVariants({
          size,
          variant,
        }),
        "rounded-r-none",
        "group-data-[pressed=true]:bg-accent group-data-[pressed=true]:text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function ToolbarSplitButtonSecondary({
  className,
  size,
  variant,
  ...props
}: React.ComponentPropsWithoutRef<"span"> &
  VariantProps<typeof dropdownArrowVariants>) {
  return (
    <span
      className={cn(
        dropdownArrowVariants({
          size,
          variant,
        }),
        "group-data-[pressed=true]:bg-accent group-data-[pressed=true]:text-accent-foreground",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      role="button"
      {...props}
    >
      <ChevronDown className="text-muted-foreground size-3.5" data-icon />
    </span>
  )
}

export function ToolbarGroup({
  children,
  className,
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "group/toolbar-group",
        "relative hidden has-[button]:flex",
        className
      )}
    >
      <div className="flex items-center">{children}</div>

      <div className="mx-1.5 py-0.5 group-last/toolbar-group:hidden!">
        <Separator orientation="vertical" />
      </div>
    </div>
  )
}

type TooltipProps<T extends React.ElementType> = {
  tooltip?: React.ReactNode
  tooltipContentProps?: Omit<
    React.ComponentPropsWithoutRef<typeof TooltipContent>,
    "children"
  >
  tooltipProps?: Omit<
    React.ComponentPropsWithoutRef<typeof Tooltip>,
    "children"
  >
  tooltipTriggerProps?: React.ComponentPropsWithoutRef<typeof TooltipTrigger>
} & React.ComponentProps<T>

function withTooltip<T extends React.ElementType>(Component: T) {
  return function ExtendComponent({
    tooltip,
    tooltipContentProps,
    tooltipProps,
    tooltipTriggerProps,
    ...props
  }: TooltipProps<T>) {
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
      setMounted(true)
    }, [])

    const component = <Component {...(props as React.ComponentProps<T>)} />

    if (tooltip && mounted) {
      return (
        <Tooltip {...tooltipProps}>
          <TooltipTrigger {...tooltipTriggerProps} render={component} />

          <TooltipContent {...tooltipContentProps}>{tooltip}</TooltipContent>
        </Tooltip>
      )
    }

    return component
  }
}

export function ToolbarMenuGroup({
  children,
  className,
  label,
  ...props
}: React.ComponentProps<typeof DropdownMenuRadioGroup> & { label?: string }) {
  return (
    <>
      <DropdownMenuSeparator
        className={cn(
          "hidden",
          "mb-0 shrink-0 peer-has-[[role=menuitem]]/menu-group:block peer-has-[[role=menuitemradio]]/menu-group:block peer-has-[[role=option]]/menu-group:block"
        )}
      />

      <DropdownMenuRadioGroup
        {...props}
        className={cn(
          "hidden",
          "peer/menu-group group/menu-group my-1.5 has-[[role=menuitem]]:block has-[[role=menuitemradio]]:block has-[[role=option]]:block",
          className
        )}
      >
        {label && (
          <DropdownMenuLabel className="text-muted-foreground text-xs font-semibold select-none">
            {label}
          </DropdownMenuLabel>
        )}
        {children}
      </DropdownMenuRadioGroup>
    </>
  )
}
