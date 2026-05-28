import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import { Cloud, X, RotateCcw, GripVertical, Star } from "lucide-react";
import { supabase, isConfigured } from "../lib/supabase";

const MAX_FILES = 20;
const MAX_SIZE_MB = 10;
const COMPRESS_THRESHOLD_MB = 2;
const ACCEPTED_TYPES = { "image/jpeg": [], "image/png": [], "image/webp": [], "image/heic": [] };

/* ---------- Item sortable individual ---------- */
function SortableImage({ item, onRemove, onRetry }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: DndCSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={`uploader-item ${item.status}`}>
      <div className="uploader-item-thumb">
        <img src={item.preview} alt="" loading="lazy" />
        {item.isFirst && <span className="uploader-principal"><Star size={10} /> Principal</span>}

        {/* Progreso de subida */}
        {item.status === "uploading" && (
          <div className="uploader-progress-bar">
            <div style={{ width: `${item.progress}%` }} />
          </div>
        )}

        {/* Error */}
        {item.status === "error" && (
          <div className="uploader-error-overlay">
            <button className="uploader-retry-btn" onClick={() => onRetry(item.id)} title="Reintentar">
              <RotateCcw size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Info de tamaño */}
      <div className="uploader-item-meta">
        {item.originalSize && item.compressedSize && item.originalSize !== item.compressedSize ? (
          <span className="uploader-size compressed">
            {formatBytes(item.originalSize)} → {formatBytes(item.compressedSize)}
          </span>
        ) : item.compressedSize ? (
          <span className="uploader-size">{formatBytes(item.compressedSize)}</span>
        ) : null}
      </div>

      {/* Controles */}
      <div className="uploader-item-controls">
        <button {...attributes} {...listeners} className="uploader-drag-handle" title="Arrastrar para reordenar">
          <GripVertical size={14} />
        </button>
        <button className="uploader-remove" onClick={() => onRemove(item.id)} title="Eliminar">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

/**
 * Uploader de imágenes para autos.
 * Props:
 *   - autoId: string — ID del auto en Supabase (para la ruta de storage)
 *   - value: string[] — URLs actuales de imágenes
 *   - onChange: (urls: string[]) => void — callback con las nuevas URLs
 */
export default function ImageUploader({ autoId, value = [], onChange }) {
  // items: { id, file, preview, status, progress, originalSize, compressedSize, url, isFirst }
  const [items, setItems] = useState(() =>
    value.map((url, i) => ({
      id: `existing-${i}`,
      file: null,
      preview: url,
      status: "done",
      progress: 100,
      url,
      isFirst: i === 0,
    }))
  );
  const [uploading, setUploading] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /* ---------- Drag & Drop de archivos ---------- */
  const onDrop = useCallback(async (acceptedFiles) => {
    const remaining = MAX_FILES - items.length;
    if (remaining <= 0) return;
    const files = acceptedFiles.slice(0, remaining);

    // Crear previews inmediatos
    const newItems = files.map((file) => ({
      id: `new-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
      progress: 0,
      originalSize: file.size,
      compressedSize: null,
      url: null,
      isFirst: false,
    }));

    setItems((prev) => {
      const updated = [...prev, ...newItems];
      // Marcar el primer item como principal
      return updated.map((it, i) => ({ ...it, isFirst: i === 0 }));
    });

    // Subir cada archivo
    setUploading(true);
    await uploadFiles(newItems);
    setUploading(false);
  }, [items]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    multiple: true,
    disabled: items.length >= MAX_FILES,
  });

  /* ---------- Subida individual ---------- */
  async function uploadSingle(item) {
    setItemStatus(item.id, "uploading", 0);

    try {
      let fileToUpload = item.file;
      let compressedSize = item.file.size;

      // Comprimir si supera el umbral
      if (item.file.size > COMPRESS_THRESHOLD_MB * 1024 * 1024) {
        const compressed = await imageCompression(item.file, {
          maxSizeMB: COMPRESS_THRESHOLD_MB,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.85,
          onProgress: (p) => setItemProgress(item.id, Math.round(p * 0.5)), // 0–50%
        });
        fileToUpload = compressed;
        compressedSize = compressed.size;
      }

      setItemProgress(item.id, 60);

      let url = null;

      if (isConfigured && supabase && autoId) {
        // Subir a Supabase Storage
        const ext = fileToUpload.name?.split(".").pop() || "jpg";
        const path = `autos/${autoId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { data, error } = await supabase.storage.from("autos").upload(path, fileToUpload, {
          upsert: false,
          contentType: fileToUpload.type,
        });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("autos").getPublicUrl(data.path);
        url = publicUrl;
      } else {
        // Modo demo: usar ObjectURL como URL temporal
        url = item.preview;
      }

      setItemProgress(item.id, 100);
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, status: "done", progress: 100, url, compressedSize }
            : it
        )
      );
      return url;
    } catch (err) {
      console.error("Error subiendo imagen:", err);
      setItems((prev) =>
        prev.map((it) => it.id === item.id ? { ...it, status: "error" } : it)
      );
      return null;
    }
  }

  async function uploadFiles(newItems) {
    let done = 0;
    for (const item of newItems) {
      await uploadSingle(item);
      done++;
      setTotalProgress(Math.round((done / newItems.length) * 100));
    }
    setTotalProgress(0);
    // Notificar al padre con las URLs
    notifyParent();
  }

  function notifyParent() {
    setItems((current) => {
      const urls = current
        .filter((it) => it.status === "done" && it.url)
        .map((it) => it.url);
      onChange(urls);
      return current;
    });
  }

  function setItemStatus(id, status, progress) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, status, progress } : it));
  }
  function setItemProgress(id, progress) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, progress } : it));
  }

  function removeItem(id) {
    setItems((prev) => {
      const updated = prev.filter((it) => it.id !== id).map((it, i) => ({ ...it, isFirst: i === 0 }));
      const urls = updated.filter((it) => it.status === "done" && it.url).map((it) => it.url);
      onChange(urls);
      return updated;
    });
  }

  async function retryItem(id) {
    const item = items.find((it) => it.id === id);
    if (!item || !item.file) return;
    await uploadSingle(item);
    notifyParent();
  }

  /* ---------- Reordenar con dnd-kit ---------- */
  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIdx = prev.findIndex((it) => it.id === active.id);
      const newIdx = prev.findIndex((it) => it.id === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx).map((it, i) => ({ ...it, isFirst: i === 0 }));
      const urls = reordered.filter((it) => it.status === "done" && it.url).map((it) => it.url);
      onChange(urls);
      return reordered;
    });
  }

  const doneCount = items.filter((it) => it.status === "done").length;
  const errorCount = items.filter((it) => it.status === "error").length;

  return (
    <div className="uploader">
      {/* Área de drop */}
      {items.length < MAX_FILES && (
        <div
          {...getRootProps()}
          className={`uploader-dropzone ${isDragActive ? "dragging" : ""}`}
        >
          <input {...getInputProps()} />
          <Cloud size={36} className="uploader-cloud" />
          <p className="uploader-text">
            {isDragActive
              ? "Suelta las fotos aquí…"
              : "Arrastra tus fotos aquí o haz clic para seleccionar"}
          </p>
          <p className="uploader-hint">JPG, PNG, WEBP · Máx. 10MB · Hasta {MAX_FILES} fotos</p>
          {items.length > 0 && (
            <p className="uploader-count">{items.length}/{MAX_FILES} fotos</p>
          )}
        </div>
      )}

      {/* Barra de progreso general */}
      {uploading && totalProgress > 0 && (
        <div className="uploader-total-progress">
          <div className="uploader-total-bar">
            <div style={{ width: `${totalProgress}%` }} />
          </div>
          <span>Subiendo… {totalProgress}%</span>
        </div>
      )}

      {/* Resumen de estado */}
      {items.length > 0 && (
        <div className="uploader-summary">
          {doneCount > 0 && <span className="uploader-stat ok">{doneCount} lista{doneCount !== 1 ? "s" : ""}</span>}
          {errorCount > 0 && <span className="uploader-stat err">{errorCount} con error</span>}
          {uploading && <span className="uploader-stat uploading">Subiendo…</span>}
        </div>
      )}

      {/* Grid de miniaturas */}
      {items.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((it) => it.id)} strategy={rectSortingStrategy}>
            <div className="uploader-grid">
              {items.map((item) => (
                <SortableImage
                  key={item.id}
                  item={item}
                  onRemove={removeItem}
                  onRetry={retryItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;
}
