"use client";

import { useEffect, useState } from "react";

interface GalleryImage {
  url: string;
  alt: string;
}

/**
 * Product image gallery. Thumbnails swap the main image; clicking the main
 * image opens a full-screen viewer (Escape or click to close).
 */
export default function ProductGallery({
  images,
  title,
}: {
  images: GalleryImage[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  if (images.length === 0) {
    return <div className="pg-main pg-empty">No image</div>;
  }

  const current = images[active] ?? images[0];

  return (
    <div>
      <button
        type="button"
        className="pg-main"
        onClick={() => setZoom(true)}
        aria-label="View larger image"
      >
        <img src={current.url} alt={current.alt || title} />
      </button>

      {images.length > 1 && (
        <div className="pg-thumbs">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              className={`pg-thumb ${index === active ? "active" : ""}`}
              onClick={() => setActive(index)}
              aria-label={`View image ${index + 1}`}
              aria-current={index === active}
            >
              <img src={image.url} alt={image.alt || title} loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div
          className="pg-lightbox"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Product image"
        >
          <img src={current.url} alt={current.alt || title} />
          <button
            type="button"
            className="pg-lightbox-close"
            onClick={() => setZoom(false)}
            aria-label="Close image viewer"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
