/**
 * AttendPro Image Utilities
 * Handles client-side image compression, max 512x512 resizing, and type validation
 */

export interface ProcessedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
];

export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * Sanitize an SVG string to remove script tags and malicious attributes
 */
export function sanitizeSvgString(svgText: string): string {
  return svgText
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/on\w+\s*=\s*[^>\s]+/gi, "")
    .replace(/javascript:/gi, "blocked:")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .trim();
}

/**
 * Compress and resize an image file to max 512x512 maintaining aspect ratio
 */
export async function compressLogoImage(
  file: File,
  maxDimension = 512,
  quality = 0.85
): Promise<ProcessedImageResult> {
  // 1. Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("រូបធំពេក សូមជ្រើសរូបតូចជាង 2MB");
  }

  // 2. Check file type
  const mimeType = file.type.toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType) && !file.name.match(/\.(png|jpe?g|webp|svg)$/i)) {
    throw new Error("ប្រភេទឯកសារមិនត្រឹមត្រូវ (អនុញ្ញាតតែ PNG, JPG, WEBP, SVG)");
  }

  // 3. Handle SVG files
  if (mimeType === "image/svg+xml" || file.name.endsWith(".svg")) {
    const rawText = await file.text();
    if (!rawText.toLowerCase().includes("<svg")) {
      throw new Error("ឯកសារ SVG មិនត្រឹមត្រូវ");
    }
    const cleanSvg = sanitizeSvgString(rawText);
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(cleanSvg)}`;
    return {
      dataUrl,
      width: maxDimension,
      height: maxDimension,
      sizeBytes: new Blob([cleanSvg]).size,
      mimeType: "image/svg+xml",
    };
  }

  // 4. Handle Raster Images (PNG, JPG, WEBP)
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("មិនអាចបង្កើតផ្ទាំងគំនូរ Canvas បានទេ"));
        return;
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP with fallback to PNG
      let outputMime = "image/webp";
      let dataUrl = canvas.toDataURL("image/webp", quality);

      if (!dataUrl.startsWith("data:image/webp")) {
        // Fallback for browsers without webp canvas export
        outputMime = "image/png";
        dataUrl = canvas.toDataURL("image/png");
      }

      // Calculate approximate base64 size
      const base64Str = dataUrl.split(",")[1] || "";
      const sizeBytes = Math.round((base64Str.length * 3) / 4);

      resolve({
        dataUrl,
        width,
        height,
        sizeBytes,
        mimeType: outputMime,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("មិនអាចអានឯកសាររូបភាពបានទេ"));
    };

    img.src = objectUrl;
  });
}
