import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Note, PlacedImage } from "../types/drawing";

let noteId = 1;
let imageId = 1;

interface OverlayContextValue {
  notes: Note[];
  images: PlacedImage[];
  addNote: (color: string) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  removeNote: (id: string) => void;
  addImage: (dataUrl: string) => void;
  updateImage: (id: string, patch: Partial<PlacedImage>) => void;
  removeImage: (id: string) => void;
}

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [images, setImages] = useState<PlacedImage[]>([]);

  const addNote = useCallback((color: string) => {
    const note: Note = {
      id: `n${noteId++}-${Date.now()}`,
      text: "",
      x: window.innerWidth / 2 - 80,
      y: window.innerHeight / 2 - 30,
      color,
      fontSize: 14,
      createdAt: Date.now(),
    };
    setNotes((prev) => [...prev, note]);
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const removeNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addImage = useCallback((dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 200;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const placed: PlacedImage = {
        id: `i${imageId++}-${Date.now()}`,
        src: dataUrl,
        x: window.innerWidth / 2 - (img.width * scale) / 2,
        y: window.innerHeight / 2 - (img.height * scale) / 2,
        width: img.width * scale,
        height: img.height * scale,
        createdAt: Date.now(),
      };
      setImages((prev) => [...prev, placed]);
    };
    img.src = dataUrl;
  }, []);

  const updateImage = useCallback((id: string, patch: Partial<PlacedImage>) => {
    setImages((prev) =>
      prev.map((im) => (im.id === id ? { ...im, ...patch } : im)),
    );
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((im) => im.id !== id));
  }, []);

  return (
    <OverlayContext.Provider
      value={{
        notes,
        images,
        addNote,
        updateNote,
        removeNote,
        addImage,
        updateImage,
        removeImage,
      }}
    >
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlayContext() {
  const ctx = useContext(OverlayContext);
  if (!ctx)
    throw new Error("useOverlayContext must be used within OverlayProvider");
  return ctx;
}
