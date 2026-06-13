/**
 * Helper utility to decode HTML entities like &#047;, &amp;, etc.
 */
export function decodeHtml(str: string | null | undefined): string {
  if (!str) return "";
  const map: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };
  
  let result = str.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    if (map[entity]) {
      return map[entity];
    }
    if (entity.startsWith("&#")) {
      const isHex = entity[2] === "x" || entity[2] === "X";
      const codeStr = isHex 
        ? entity.substring(3, entity.length - 1) 
        : entity.substring(2, entity.length - 1);
      const code = parseInt(codeStr, isHex ? 16 : 10);
      if (!isNaN(code)) {
        return String.fromCharCode(code);
      }
    }
    return entity;
  });
  return result;
}
