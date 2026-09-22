"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — Manuscript Import Types
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_EXTENSIONS = void 0;
exports.detectFileType = detectFileType;
exports.ALLOWED_EXTENSIONS = ['pdf', 'docx'];
function detectFileType(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf')
        return 'pdf';
    if (ext === 'docx')
        return 'docx';
    return null;
}
