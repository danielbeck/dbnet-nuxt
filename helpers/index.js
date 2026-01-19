import { marked } from 'marked';
import dateFormat from 'dateformat';
import * as parse5 from 'parse5';

// Convert markdown to HTML (shared helper)
function markdownToHtml(md) {
    return marked.parse(md || '');
}

const formatDate = (d, fmt) => {
    fmt = fmt || "dddd, mmmm dS, yyyy, h:MM:ss TT";
    fmt = (fmt === 'day') ? "mmmm d" : fmt;
    fmt = (fmt === 'date') ? "m/d/yy" : fmt;
    if (isFinite(d)) {
        if (!(d instanceof Date)) {
            d = new Date(d);
        }
        return dateFormat(d, fmt);
    } else {
        return undefined
    }
}

const datetimeLocal = function (d) {
    if (isFinite(d)) {
        if (!(d instanceof Date)) {
            d = new Date(d);
        }
        return dateFormat(d, "yyyy-mm-dd'T'HH:MM:ss");
    } else {
        return undefined
    }
}

const fromDatetimeLocal = function (input) {
    const t = new Date(new Date(input + "Z").getTime() + (new Date().getTimezoneOffset() * 60000));
    if (isNaN(t.getTime())) {
        return undefined
    } else {
        return t.getTime()
    }
}

const truncate = function (text, length, clamp) {
    if (text === undefined || text === '' || text === null) return '';
    clamp = clamp || '...';
    length = length || 30;
    // Avoid using `document` so this works during SSR
    // Strip HTML tags safely and fall back to the original string if needed
    try {
        text = String(text).replace(/<[^>]*>/g, '');
    } catch (e) {
        text = String(text);
    }
    if (text.length <= length) return text;
    let tcText = text.slice(0, length - clamp.length);
    let last = tcText.length - 1;
    while (last > 0 && tcText[last] !== ' ' && tcText[last] !== clamp[0]) last -= 1;
    last = last || length - clamp.length;
    tcText = tcText.slice(0, last);
    return tcText + clamp;
};

function detectContentFormat(body, fallback = 'markdown') {
    if (!body) return fallback;
    if (/<\s*(p|div|br|span|img|a)[\s>]/i.test(body)) {
        return 'html';
    }
    return 'markdown';
}

function smartquotes(text) {
    if (!text) return text;
    return text.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, nonTag) => {
        if (tag) return tag;
        if (!nonTag) return '';
        nonTag = nonTag.replace(/ -- /g, ' \u2014 ');
        nonTag = nonTag.replace(/'''/g, '\u2034');
        nonTag = nonTag.replace(/(^|[\s\[{(])"(?=\S)/g, '$1\u201C');
        nonTag = nonTag.replace(/"/g, '\u201D');
        nonTag = nonTag.replace(/''/g, '\u2033');
        nonTag = nonTag.replace(/(^|[\s\[{(])'(?=\S)/g, '$1\u2018');
        nonTag = nonTag.replace(/'/g, '\u2019');
        return nonTag;
    });
}

function fixHtmlString(html) {
    try {
        const fragment = parse5.parseFragment(html || '');
        return parse5.serialize(fragment);
    } catch (e) {
        throw new Error('Failed to fix HTML: ' + e.message);
    }
}

export { formatDate, datetimeLocal, fromDatetimeLocal, truncate, markdownToHtml, detectContentFormat, smartquotes, fixHtmlString };
