// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — HTML Sanitizer
// ─────────────────────────────────────────────────────────────────────────────
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark',
  'ul', 'ol', 'li',
  'blockquote',
  'hr',
  'a',
  'img',
  'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'sub', 'sup',
  'span', 'div',
];

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'target', 'rel',
  'class', 'id',
  'colspan', 'rowspan',
  'width', 'height',
];

export function sanitizeHtml(dirty: string): string {
  if (!dirty || !dirty.trim()) return '';

  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
      'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
    ],
    ADD_ATTR: ['target'],
    FORCE_BODY: false,
  });

  return clean.replace(/data:[^;]+;base64,[^"'\s]*/g, '[image removed]');
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function sanitizeTitle(raw: string): string {
  const stripped = stripHtml(raw).trim();
  return stripped.slice(0, 255) || 'Untitled Chapter';
}

