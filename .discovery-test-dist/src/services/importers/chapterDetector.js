"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectChapterBoundaries = detectChapterBoundaries;
exports.splitBlocksIntoChapters = splitBlocksIntoChapters;
const CHAPTER_PATTERNS = [
    /^chapter\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|[ivxlcdm]+|0\d+)[\s:.\-—]*(.*)$/i,
    /^part\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|[ivxlcdm]+)[\s:.\-—]*(.*)$/i,
    /^(prologue|epilogue|preface|introduction|foreword|afterword|interlude|intermission|appendix)[\s:.\-—]*(.*)$/i,
    /^act\s+(\d+|one|two|three|four|five|[ivxlcdm]+)[\s:.\-—]*(.*)$/i,
    /^(volume|vol|book)\s+(\d+|one|two|three|[ivxlcdm]+)[\s:.\-—]*(.*)$/i,
];
function blockToPlainText(block) {
    switch (block.type) {
        case 'heading':
            return block.text;
        case 'paragraph':
            return block.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        default:
            return '';
    }
}
function isChapterHeading(text) {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 120)
        return false;
    return CHAPTER_PATTERNS.some((p) => p.test(trimmed));
}
function isHeadingBlock(block) {
    return block.type === 'heading';
}
function detectChapterBoundaries(blocks) {
    const boundaries = [];
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const text = blockToPlainText(block);
        if (isChapterHeading(text)) {
            boundaries.push({ startIndex: i, title: text.trim() });
            continue;
        }
        if (isHeadingBlock(block) && (block.level === 1 || block.level === 2)) {
            boundaries.push({ startIndex: i, title: block.text.trim() });
        }
    }
    const seen = new Set();
    const deduped = boundaries.filter((b) => {
        if (seen.has(b.startIndex))
            return false;
        seen.add(b.startIndex);
        return true;
    });
    if (deduped.length === 0)
        return [];
    deduped.sort((a, b) => a.startIndex - b.startIndex);
    return deduped;
}
function splitBlocksIntoChapters(blocks, boundaries) {
    if (blocks.length === 0)
        return [];
    if (boundaries.length === 0) {
        return [{ title: 'Imported Chapter', blocks }];
    }
    const chapters = [];
    for (let i = 0; i < boundaries.length; i++) {
        const current = boundaries[i];
        const next = boundaries[i + 1];
        const endIndex = next ? next.startIndex : blocks.length;
        const chapterBlocks = blocks.slice(current.startIndex + 1, endIndex);
        chapters.push({
            title: current.title,
            blocks: chapterBlocks,
        });
    }
    if (boundaries[0].startIndex > 0) {
        const preambleBlocks = blocks.slice(0, boundaries[0].startIndex);
        chapters.unshift({ title: 'Introduction', blocks: preambleBlocks });
    }
    return chapters;
}
