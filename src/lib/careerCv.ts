export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const CV_BUCKET = "career-cvs";
export const CV_MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function validateCv(file: { name: string; size: number; type: string }): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!CV_MIME_TYPES[extension] || (file.type && file.type !== CV_MIME_TYPES[extension])) return "Choose a PDF or Word file (.pdf, .doc or .docx).";
  if (file.size === 0 || file.size > CV_MAX_BYTES) return "Choose a non-empty CV no larger than 5 MB.";
  return null;
}

export function cvContentType(name: string): string {
  return CV_MIME_TYPES[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}