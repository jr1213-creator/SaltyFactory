type PreviewRow = { id?: unknown } | null | undefined;

export function assetPreviewPath(asset: PreviewRow) {
  return asset?.id ? `/api/studio/assets/${encodeURIComponent(String(asset.id))}/preview` : "";
}

export function assetDerivativePreviewPath(asset: PreviewRow, kind: string) {
  return asset?.id && kind ? `/api/studio/assets/${encodeURIComponent(String(asset.id))}/derivatives/${encodeURIComponent(kind)}/preview` : "";
}

export function mockupPreviewPath(mockup: PreviewRow) {
  return mockup?.id ? `/api/studio/mockups/${encodeURIComponent(String(mockup.id))}/preview` : "";
}
