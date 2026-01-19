// Remove <footnote>...</footnote> tags and their contents from HTML
export function stripFootnotes(html) {
    if (!html) return html;
    return html.replace(/<footnote>[\s\S]*?<\/footnote>/gi, '');
}
