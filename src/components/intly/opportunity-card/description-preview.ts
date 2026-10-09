const recognizedDescriptionHtmlPattern = /<\/?(?:p|div|br|ul|ol|li|h[1-6]|blockquote|section|article|strong|em|b|i|span|a|code|pre)\b[^>]*>/i;

function decodeDescriptionEntity(entity: string) {
  const rawName = entity.slice(1, -1);
  const name = rawName.toLowerCase();
  const named: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
  if (name in named) return named[name];
  const codePoint = /^#x[0-9a-f]+$/i.test(rawName)
    ? Number.parseInt(rawName.slice(2), 16)
    : /^#\d+$/.test(rawName)
      ? Number.parseInt(rawName.slice(1), 10)
      : null;
  if (codePoint === null || !Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10FFFF || codePoint >= 0xD800 && codePoint <= 0xDFFF) return entity;
  return String.fromCodePoint(codePoint);
}

function decodeDescriptionEntities(value: string) {
  return value.replace(/&(?:nbsp|amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, match => decodeDescriptionEntity(match));
}

export function descriptionPreviewText(description: string) {
  const visible = description
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, " ");
  if (!recognizedDescriptionHtmlPattern.test(visible)) return visible.trim();
  const text = visible
    .replace(/\r\n?|\n/g, " ")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(?:p|div|section|article|h[1-6]|blockquote|pre)\s*>/gi, "\n\n")
    .replace(/<\s*li\b[^>]*>/gi, "\n• ")
    .replace(/<\s*\/\s*li\s*>/gi, "\n")
    .replace(/<\s*\/\s*(?:ul|ol)\s*>/gi, "\n\n")
    .replace(/<\s*(?:p|div|section|article|h[1-6]|blockquote|pre|ul|ol)\b[^>]*>/gi, "\n")
    .replace(/<\/?(?:p|div|br|ul|ol|li|h[1-6]|blockquote|section|article|strong|em|b|i|span|a|code|pre)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, "")
    .replace(/<\/?(?:p|div|br|ul|ol|li|h[1-6]|blockquote|section|article|strong|em|b|i|span|a|code|pre)\b[^>]*$/gi, "");
  return decodeDescriptionEntities(text)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(line => line.replace(/[ \t\f\v]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/•\n+(?=\S)/g, "• ")
    .replace(/(• [^\n]*)\n\n(?=• )/g, "$1\n")
    .trim();
}
