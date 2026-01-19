// Replace <footnote>...</footnote> with <Footnote :number="n">...</Footnote>
export function preprocessFootnotes(html) {
    if (!html) return html;
    let footnoteIndex = 1;
    // Replace all <footnote>...</footnote> with numbered Footnote components
    return html.replace(/<footnote>([\s\S]*?)<\/footnote>/gi, function (match, content) {
        // Escape double quotes in content for attribute safety
        const safeContent = content.replace(/"/g, '&quot;');
        return `<Footnote :number=\"${footnoteIndex++}\">${content}</Footnote>`;
    });
}
