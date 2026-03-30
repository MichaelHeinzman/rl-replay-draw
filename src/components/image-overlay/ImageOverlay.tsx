import {
  useRef,
  useCallback,
  useState,
  PointerEvent as ReactPointerEvent,
} from "react";
import { PlacedImage } from "../../types/drawing";
import "./image-overlay.css";

interface ImageOverlayProps {
  image: PlacedImage;
  onUpdate: (id: string, patch: Partial<PlacedImage>) => void;
  onRemove: (id: string) => void;
}

export default function ImageOverlay({
  image,
  onUpdate,
  onRemove,
}: ImageOverlayProps) {
  const dragging = useRef(false);
  const resizing = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("rl-image__resize")) return;
      if (target.classList.contains("rl-image__close")) return;
      dragging.current = true;
      offset.current = { x: e.clientX - image.x, y: e.clientY - image.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [image.x, image.y],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (dragging.current) {
        onUpdate(image.id, {
          x: e.clientX - offset.current.x,
          y: e.clientY - offset.current.y,
        });
      }
      if (resizing.current) {
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        const aspect = resizeStart.current.w / resizeStart.current.h;
        const newW = Math.max(30, resizeStart.current.w + dx);
        const newH = Math.max(30, newW / aspect);
        onUpdate(image.id, { width: newW, height: newH });
      }
    },
    [image.id, onUpdate],
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
    resizing.current = false;
  }, []);

  const handleResizeDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      resizing.current = true;
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        w: image.width,
        h: image.height,
      };
      // Capture on the parent so move/up fire correctly
      const parent = (e.target as HTMLElement).closest(
        ".rl-image",
      ) as HTMLElement;
      parent?.setPointerCapture(e.pointerId);
    },
    [image.width, image.height],
  );

  return (
    <div
      className="rl-image"
      style={{ left: image.x, top: image.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="rl-image__wrapper">
        <img
          className="rl-image__img"
          src={image.src}
          alt=""
          style={{ width: image.width, height: image.height }}
        />
        <button
          className="rl-image__close"
          onClick={() => onRemove(image.id)}
          title="Remove image"
        >
          ✕
        </button>
        <div
          className="rl-image__resize"
          onPointerDown={handleResizeDown}
          title="Resize"
        />
      </div>
    </div>
  );
}
