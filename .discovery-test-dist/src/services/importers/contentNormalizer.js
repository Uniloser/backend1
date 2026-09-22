"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blocksToHtml = blocksToHtml;
exports.countWords = countWords;
exports.buildNormalizedChapter = buildNormalizedChapter;
const sanitizer_1 = require("./sanitizer");
function blockToHtml(block) {
    switch (block.type) {
        case 'paragraph': {
            const clean = (0, sanitizer_1.sanitizeHtml)(block.html);
            if (!clean || !(0, sanitizer_1.stripHtml)(clean).trim())
                return '';
            return clean.startsWith('<p') ? clean : `<p>${clean}</p>`;
        }
        case 'heading': {
            const level = Math.min(Math.max(block.level, 1), 3);
            const text = (0, sanitizer_1.sanitizeHtml)(block.text);
            return `<h${level}>${text}</h${level}>`;
        }
        case 'image': {
            const alt = (0, sanitizer_1.sanitizeHtml)(block.alt || 'Image');
            return `<img src="${block.signedUrl}" alt="${alt}" data-storage-path="${block.storagePath}" />`;
        }
        case 'divider':
        case 'pageBreak':
            return '<hr />';
        default:
            return '';
    }
}
function blocksToHtml(blocks) {
    return blocks.map(blockToHtml).filter(Boolean).join('\n');
}
function countWords(blocks) {
    return blocks.reduce((sum, block) => {
        let text = '';
        if (block.type === 'paragraph')
            text = (0, sanitizer_1.stripHtml)(block.html);
        else if (block.type === 'heading')
            text = block.text;
        return sum + text.trim().split(/\s+/).filter(Boolean).length;
    }, 0);
}
function buildNormalizedChapter(title, order, blocks) {
    return {
        title: title.trim() || `Chapter ${order}`,
        order,
        blocks,
        html: blocksToHtml(blocks),
        wordCount: countWords(blocks),
    };
}
