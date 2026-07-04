type PreviewRow = { id?: unknown } | null | undefined;

export function assetPreviewPath(asset: PreviewRow) {
  return asset?.id ? `/api/studio/assets/${encodeURIComponent(String(asset.id))}/preview` : "";
}

export function mockupPreviewPath(mockup: PreviewRow) {
  return mockup?.id ? `/api/studio/mockups/${encodeURIComponent(String(mockup.id))}/preview` : "";
}
