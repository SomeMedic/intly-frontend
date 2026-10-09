export function clickDownloadLink(href: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.referrerPolicy = "no-referrer";
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  clickDownloadLink(url, filename);
  // The browser may consume the object URL after the click handler returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
