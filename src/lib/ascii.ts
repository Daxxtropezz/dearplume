// ASCII is produced locally. A separately compressed image preview is included in new encrypted links for the color reveal.
export async function photoToAscii(photo: Blob): Promise<string> {
  const src = URL.createObjectURL(photo);
  try {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement("canvas");
    const width = 52;
    const height = Math.max(8, Math.min(36, Math.round((image.naturalHeight / image.naturalWidth) * width * 0.48)));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("ASCII conversion is unavailable in this browser.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    const ramp = "@%#*+=-:. ";
    const lines: string[] = [];
    for (let y = 0; y < height; y++) {
      let line = "";
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const brightness = (pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722) / 255;
        const index = Math.min(ramp.length - 1, Math.floor(brightness * (ramp.length - 1)));
        line += ramp[index];
      }
      lines.push(line.trimEnd());
    }
    return lines.join("\n");
  } finally {
    URL.revokeObjectURL(src);
  }
}

/**
 * Create a small, raster-only image to reveal after typing finishes.
 * Full-resolution photos stay in local IndexedDB. Because a share is embedded
 * in a URL (no file server/database), this version must fit a strict byte budget.
 */
export async function photoToSharedPreview(photo: Blob): Promise<string> {
  const url = URL.createObjectURL(photo);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    if (!naturalWidth || !naturalHeight) throw new Error("Could not read the picture.");

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image preview creation is unavailable in this browser.");

    // URL fragments have practical length limits. Optimize down to a safe size.
    for (const maxEdge of [360, 320, 280, 240, 200, 168, 144, 120, 96]) {
      const scale = Math.min(1, maxEdge / Math.max(naturalWidth, naturalHeight));
      canvas.width = Math.max(1, Math.round(naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(naturalHeight * scale));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.8, 0.68, 0.56, 0.44, 0.35]) {
        let preview = canvas.toDataURL("image/webp", quality);
        if (!preview.startsWith("data:image/webp;base64,")) {
          preview = canvas.toDataURL("image/jpeg", quality);
        }
        if (preview.length <= 12_000) return preview;
      }
    }
    throw new Error("This picture could not fit in a protected link. Try a simpler picture.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
