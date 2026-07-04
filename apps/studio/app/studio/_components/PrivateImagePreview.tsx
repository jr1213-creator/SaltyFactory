"use client";

import { useState, type CSSProperties } from "react";

type PrivateImagePreviewProps = {
  src: string;
  alt: string;
  aspectRatio?: string;
  maxHeight?: number;
  className?: string;
};

export function PrivateImagePreview({
  src,
  alt,
  aspectRatio = "1 / 1",
  maxHeight,
  className
}: PrivateImagePreviewProps) {
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const resolvedSrc = reloadKey ? `${src}${src.includes("?") ? "&" : "?"}preview_retry=${reloadKey}` : src;

  if (!src) {
    return <div className={className} style={previewFrameStyle(aspectRatio, maxHeight)}>
      <strong>Preview unavailable</strong>
      <p className="text-muted" style={{ margin: 0 }}>This private image does not have a preview route yet.</p>
    </div>;
  }

  if (failed) {
    return <div className={className} style={previewFrameStyle(aspectRatio, maxHeight)}>
      <strong>Private preview could not load</strong>
      <p className="text-muted" style={{ margin: 0 }}>The asset record exists, but the private image bytes could not be read. Check storage readiness or retry the preview.</p>
      <button
        className="btn btn-secondary"
        type="button"
        onClick={() => {
          setFailed(false);
          setReloadKey(Date.now());
        }}
      >
        Retry preview
      </button>
    </div>;
  }

  return <img
    key={resolvedSrc}
    src={resolvedSrc}
    alt={alt}
    onError={() => setFailed(true)}
    style={{
      width: "100%",
      aspectRatio,
      maxHeight,
      objectFit: "contain",
      borderRadius: 8,
      background: "#f8fafc",
      border: "1px solid rgba(15,23,42,0.08)"
    }}
  />;
}

function previewFrameStyle(aspectRatio: string, maxHeight?: number): CSSProperties {
  return {
    width: "100%",
    aspectRatio,
    maxHeight,
    minHeight: 180,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.12)",
    background: "#f8fafc",
    display: "grid",
    gap: 10,
    alignContent: "center",
    justifyItems: "center",
    padding: 16,
    textAlign: "center"
  };
}
