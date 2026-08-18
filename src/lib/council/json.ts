/** Escapes raw control characters (literal newlines, tabs, etc.) that appear
 *  inside JSON string literals. Technically invalid JSON, but models asked
 *  for a JSON field containing markdown routinely emit a literal "\n"
 *  instead of the escaped "\\n" — this repairs that without touching
 *  anything outside a string (where whitespace is already legal). */
function sanitizeJsonControlChars(text: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (const ch of text) {
    if (!inString) {
      if (ch === '"') inString = true;
      result += ch;
      continue;
    }

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      result += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = false;
      result += ch;
      continue;
    }

    const code = ch.charCodeAt(0);
    if (code < 0x20) {
      if (ch === "\n") result += "\\n";
      else if (ch === "\r") result += "\\r";
      else if (ch === "\t") result += "\\t";
      else result += `\\u${code.toString(16).padStart(4, "0")}`;
      continue;
    }
    result += ch;
  }

  return result;
}

function tryParse(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Parses a JSON object out of an LLM's text response, tolerating the most
 *  common ways models mangle "strict JSON" — wrapping it in markdown code
 *  fences, surrounding it with commentary, or leaving raw control
 *  characters unescaped inside string values. */
export function extractJson(text: string, context: string): unknown {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "");

  const direct = tryParse(trimmed);
  if (direct !== undefined) return direct;

  const sanitized = tryParse(sanitizeJsonControlChars(trimmed));
  if (sanitized !== undefined) return sanitized;

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    const matched = tryParse(match[0]);
    if (matched !== undefined) return matched;
    const matchedSanitized = tryParse(sanitizeJsonControlChars(match[0]));
    if (matchedSanitized !== undefined) return matchedSanitized;
  }

  throw new Error(`${context} was not valid JSON`);
}
