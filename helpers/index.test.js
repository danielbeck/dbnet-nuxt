import assert from 'node:assert/strict'
import test from 'node:test'
import { markdownToHtml } from './index.js'

test('markdownToHtml emits Mermaid containers for Mermaid code fences', () => {
    const html = markdownToHtml('```mermaid\nflowchart LR\n    A --> B\n```')

    assert.equal(html, '<div class="mermaid">flowchart LR\n    A --&gt; B</div>\n')
})

test('markdownToHtml preserves normal fenced code blocks', () => {
    const html = markdownToHtml('```js\nconst answer = 42\n```')

    assert.match(html, /^<pre><code class="language-js">/)
    assert.match(html, /const answer = 42/)
})

test('markdownToHtml escapes HTML in Mermaid source', () => {
    const html = markdownToHtml('```mermaid\nflowchart LR\n    A["<script>"]\n```')

    assert.doesNotMatch(html, /<script>/)
    assert.match(html, /&lt;script&gt;/)
})
