import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function FloatingDropdown({
  anchorRef,
  open,
  onRequestClose,
  minWidth = 0,
  maxHeight = 320,
  children,
}) {
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const viewportPadding = 12;
    const gap = 4;
    const boundary = anchor.closest("[data-floating-dropdown-boundary]");
    const boundaryRect = boundary?.getBoundingClientRect();
    const boundaryTop = Math.max(
      viewportPadding,
      (boundaryRect?.top ?? 0) + viewportPadding,
    );
    const boundaryBottom = Math.min(
      window.innerHeight - viewportPadding,
      (boundaryRect?.bottom ?? window.innerHeight) - viewportPadding,
    );
    const availableBelow = Math.max(
      0,
      boundaryBottom - rect.bottom - gap,
    );
    const availableAbove = Math.max(0, rect.top - boundaryTop - gap);
    const openAbove = availableBelow < maxHeight && availableAbove > availableBelow;
    const desiredWidth = Math.min(
      Math.max(rect.width, minWidth),
      window.innerWidth - viewportPadding * 2,
    );
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - desiredWidth - viewportPadding,
    );
    const availableHeight = openAbove ? availableAbove : availableBelow;

    setPosition({
      left,
      width: desiredWidth,
      maxHeight: Math.max(0, Math.min(maxHeight, availableHeight)),
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    });
  }, [anchorRef, maxHeight, minWidth]);

  useEffect(() => {
    if (!open) return undefined;

    updatePosition();
    const handlePointerDown = (event) => {
      if (
        !anchorRef.current?.contains(event.target) &&
        !dropdownRef.current?.contains(event.target)
      ) {
        onRequestClose?.();
      }
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [anchorRef, onRequestClose, open, updatePosition]);

  if (!open || !position) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-70 overflow-hidden rounded-xl border border-control-border bg-surface-muted shadow-dialog"
      style={position}
    >
      {children}
    </div>,
    document.body,
  );
}
