import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function FloatingDropdown({
  anchorRef,
  open,
  onRequestClose,
  children,
}) {
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    setPosition({
      left: rect.left,
      top: rect.bottom + 4,
      width: rect.width,
      maxHeight: Math.max(96, window.innerHeight - rect.bottom - 12),
    });
  }, [anchorRef]);

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
      className="fixed z-[70] overflow-y-auto rounded-xl border border-neutral-700 bg-[#0a0a0a] shadow-2xl"
      style={position}
    >
      {children}
    </div>,
    document.body,
  );
}
