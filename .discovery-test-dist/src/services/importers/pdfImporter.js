"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPdf = extractPdf;
const sanitizer_1 = require("./sanitizer");
async function getPdfParse() {
    const mod = await Promise.resolve().then(() => __importStar(require('pdf-parse')));
    return (mod.default ?? mod);
}
const MIN_CHARS_PER_PAGE = 50;
async function extractPdf(fileBuffer, _context) {
    const warnings = [];
    let pdfData;
    try {
        const pdfParse = await getPdfParse();
        pdfData = await pdfParse(fileBuffer, { max: 500 });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypted')) {
            throw new Error('This PDF is password-protected. Please remove the password before importing.');
        }
        throw new Error(`Failed to parse PDF: ${msg}`);
    }
    const { text, numpages } = pdfData;
    const pageCount = numpages ?? 1;
    const textLength = (text ?? '').replace(/\s+/g, '').length;
    const charsPerPage = pageCount > 0 ? textLength / pageCount : 0;
    const isScanned = charsPerPage < MIN_CHARS_PER_PAGE;
    if (isScanned) {
        return {
            blocks: [],
            warnings: [
                'This PDF appears to be scanned or image-based and contains little extractable text. ' +
                    'OCR (optical character recognition) is required to import this type of document. ' +
                    'Please export your manuscript as a text-based PDF or DOCX file.',
            ],
            pageCount,
            isScanned: true,
        };
    }
    if (!text || !text.trim()) {
        return {
            blocks: [],
            warnings: ['The PDF contains no extractable text.'],
            pageCount,
            isScanned: false,
        };
    }
    const blocks = parsePdfTextToBlocks(text);
    return { blocks, warnings, pageCount, isScanned: false };
}
function parsePdfTextToBlocks(text) {
    const blocks = [];
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rawParagraphs = normalized.split(/\n{2,}/);
    for (const para of rawParagraphs) {
        const trimmed = para.trim();
        if (!trimmed)
            continue;
        if (isChapterLine(trimmed)) {
            blocks.push({
                type: 'heading',
                level: 2,
                text: trimmed,
            });
            continue;
        }
        const joinedText = trimmed.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ');
        const html = (0, sanitizer_1.sanitizeHtml)(`<p>${escapeHtml(joinedText)}</p>`);
        if (html) {
            blocks.push({ type: 'paragraph', html });
        }
    }
    return blocks;
}
function isChapterLine(text) {
    if (text.length > 120)
        return false;
    if (text.includes('\n'))
        return false;
    const patterns = [
        /^chapter\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|[ivxlcdm]+)[\s:.\-—]*/i,
        /^part\s+(\d+|one|two|three|four|five|[ivxlcdm]+)[\s:.\-—]*/i,
        /^(prologue|epilogue|preface|introduction|foreword|afterword|interlude|appendix)[\s:.\-—]*/i,
        /^act\s+(\d+|one|two|three|[ivxlcdm]+)[\s:.\-—]*/i,
    ];
    return patterns.some((p) => p.test(text.trim()));
}
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
