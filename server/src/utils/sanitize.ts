import sanitizeHtml from 'sanitize-html';

/**
 * Usuwa wszystkie tagi HTML z tekstu użytkownika.
 * Zostawia tylko czysty tekst — ochrona przed XSS w miejscach
 * gdzie ewentualnie byłoby użyte dangerouslySetInnerHTML.
 */
export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return sanitizeHtml(input, {
    allowedTags: [],        // żadnych tagów HTML
    allowedAttributes: {}, // żadnych atrybutów
  }).trim();
}

/**
 * Sanitizuje tekst i obcina do maksymalnej długości.
 */
export function sanitizeField(input: unknown, maxLength = 1000): string {
  return sanitizeText(input).slice(0, maxLength);
}
