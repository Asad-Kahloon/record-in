"use client"

import * as React from "react"
import { cn } from "cn"
import { Drawer as DrawerPrimitive } from "vaul"

// vaul's own keyboard handling (repositionInputs) guesses "keyboard open" by
// flipping a flag on every viewport resize, which drifts out of sync on iOS and
// lifts the sheet — and the field being typed in — off the top of the screen.
// DrawerContent keeps bottom sheets above the keyboard itself instead.
function Drawer({
  repositionInputs = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" repositionInputs={repositionInputs} {...props} />
}

const NON_TEXT_INPUTS = new Set(["checkbox", "radio", "range", "color", "file", "image", "button", "submit", "reset"])
/** Viewport shrinks smaller than this are browser bars coming and going, not a keyboard. */
const KEYBOARD_MIN_PX = 100
/** Breathing room kept above the sheet while the keyboard is open. */
const KEYBOARD_TOP_GAP_PX = 12

function isTextField(el: Element | null): el is HTMLElement {
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(el.type)
  return el instanceof HTMLTextAreaElement || (el instanceof HTMLElement && el.isContentEditable)
}

/** Scrolls the sheet's own content — never the page — so the field and its label are in view. */
function revealField(field: HTMLElement, drawer: HTMLElement) {
  let scroller = field.parentElement
  while (scroller && scroller !== drawer) {
    const { overflowY } = getComputedStyle(scroller)
    if ((overflowY === "auto" || overflowY === "scroll") && scroller.scrollHeight > scroller.clientHeight) break
    scroller = scroller.parentElement
  }
  if (!scroller || scroller === drawer) return
  const box = scroller.getBoundingClientRect()
  const target = field.getBoundingClientRect()
  const above = 56 // room for the field's label
  const below = 24
  if (target.top < box.top + above) scroller.scrollTop -= box.top + above - target.top
  else if (target.bottom > box.bottom - below) scroller.scrollTop += target.bottom - (box.bottom - below)
}

/**
 * While a field inside a bottom sheet has the on-screen keyboard open, sits the
 * sheet directly above the keyboard, caps it to the visible height and keeps
 * the field in view. Works from the visual viewport, which shrinks when the
 * keyboard opens (and on iOS may also pan), so it holds on every phone.
 */
function useKeyboardAvoidance(drawer: HTMLDivElement | null) {
  React.useEffect(() => {
    const viewport = window.visualViewport
    if (!drawer || !viewport || drawer.dataset.vaulDrawerDirection !== "bottom") return

    let frame = 0
    let lifted = false
    const reset = () => {
      drawer.style.removeProperty("bottom")
      drawer.style.removeProperty("max-height")
      lifted = false
    }
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const focused = document.activeElement
        // How much of the layout viewport's bottom the keyboard covers.
        const covered = window.innerHeight - viewport.offsetTop - viewport.height
        if (covered > KEYBOARD_MIN_PX && isTextField(focused) && drawer.contains(focused)) {
          drawer.style.bottom = `${covered}px`
          drawer.style.maxHeight = `${viewport.height - KEYBOARD_TOP_GAP_PX}px`
          lifted = true
          revealField(focused, drawer)
        } else if (lifted) {
          reset()
        }
      })
    }

    viewport.addEventListener("resize", update)
    viewport.addEventListener("scroll", update)
    drawer.addEventListener("focusin", update)
    drawer.addEventListener("focusout", update)
    update()
    return () => {
      cancelAnimationFrame(frame)
      viewport.removeEventListener("resize", update)
      viewport.removeEventListener("scroll", update)
      drawer.removeEventListener("focusin", update)
      drawer.removeEventListener("focusout", update)
      reset()
    }
  }, [drawer])
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  // The content only exists while open, so track the node itself, not a ref object.
  const [node, setNode] = React.useState<HTMLDivElement | null>(null)
  const setRefs = React.useCallback(
    (el: HTMLDivElement | null) => {
      setNode(el)
      if (typeof ref === "function") ref(el)
      else if (ref) ref.current = el
    },
    [ref]
  )
  useKeyboardAvoidance(node)

  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={setRefs}
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content fixed z-50 flex h-auto flex-col bg-popover text-sm text-popover-foreground data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-xl data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:rounded-r-xl data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:rounded-l-xl data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-xl data-[vaul-drawer-direction=top]:border-b data-[vaul-drawer-direction=left]:sm:max-w-sm data-[vaul-drawer-direction=right]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        <div className="mx-auto mt-4 hidden h-1 w-[100px] shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-0.5 md:text-left",
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
