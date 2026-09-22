"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeHtml = sanitizeHtml;
exports.stripHtml = stripHtml;
exports.sanitizeTitle = sanitizeTitle;
// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — HTML Sanitizer
// ─────────────────────────────────────────────────────────────────────────────
const isomorphic_dompurify_1 = __importDefault(require("isomorphic-dompurify"));
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
function sanitizeHtml(dirty) {
    if (!dirty || !dirty.trim())
        return '';
    const clean = isomorphic_dompurify_1.default.sanitize(dirty, {
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
function stripHtml(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function sanitizeTitle(raw) {
    const stripped = stripHtml(raw).trim();
    return stripped.slice(0, 255) || 'Untitled Chapter';
}
