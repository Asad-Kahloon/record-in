"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

/** Bottom drawer on phones, centered dialog on larger screens. */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[94svh]">
          <DrawerHeader className="flex-row items-start gap-3 text-left">
            <div className="min-w-0 flex-1 space-y-0.5 text-left">
              <DrawerTitle className="text-lg">{title}</DrawerTitle>
              {description ? <DrawerDescription>{description}</DrawerDescription> : null}
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="-mt-1 -mr-2 size-9 shrink-0 rounded-full" aria-label="Close">
                <XIcon />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          {/* Scrolling the form must never swipe the sheet closed; the handle and header still do. */}
          <div
            data-vaul-no-drag
            className="overflow-y-auto overscroll-y-contain px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
          >
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
