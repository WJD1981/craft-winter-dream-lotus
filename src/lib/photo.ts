export async function compressListingPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Upload a photograph of this batch — not a document.");
  }
  const bitmap = await createImageBitmap(file);
  const max = 1400;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that photo.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  if (dataUrl.length > 1_600_000) {
    const tighter = canvas.toDataURL("image/jpeg", 0.7);
    if (tighter.length > 1_600_000) throw new Error("That photo is too large. Try another shot.");
    return tighter;
  }
  return dataUrl;
}
