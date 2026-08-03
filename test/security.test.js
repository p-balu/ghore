const assert = require("node:assert/strict");
const test = require("node:test");
const renderMarkdown = require("../src/components/renderMarkdown");

test("unknown code fences remain inert text", async () => {
  const html = await renderMarkdown(
    "```unknown\n<img src=x onerror=alert(1)>\n```"
  );

  assert.doesNotMatch(html, /<img src="x"/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test("Mermaid fences cannot inject HTML", async () => {
  const html = await renderMarkdown(
    "```mermaid\ngraph TD\n</div><script>alert(1)</script>\n```"
  );

  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /class="mermaid"/);
  assert.match(html, /&lt;\/div&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("supported languages still receive syntax highlighting", async () => {
  const html = await renderMarkdown("```js\nconst answer = 42;\n```");

  assert.match(html, /class="pl-k"/);
  assert.match(html, /answer/);
});
