const { JSDOM } = require("jsdom");
const cmarkGfm = require("cmark-gfm");

const renderMarkdown = async (data) => {
  const html = await cmarkGfm.renderHtml(data);

  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Adding IDs to headings
  const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
  headings.forEach((heading) => {
    const headingText = heading.textContent.trim();

    // Replacing non-alphanumeric characters with hyphen
    const anchorId = headingText
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");

    heading.id = anchorId;
  });

  // Highlight code blocks
  const codeBlocks = document.querySelectorAll("code");
  for (const block of codeBlocks) {
    const lang = block.className.split("language-")[1];
    if (lang) {
      const highlighted = await highlightCode(lang, block.textContent);
      block.innerHTML = highlighted;
    }
  }

  return dom.serialize();
};

// Highlight code blocks function
const highlightCode = async (lang, str) => {
  const { createStarryNight, common } = await import("@wooorm/starry-night");
  const sourceCss = await import("@wooorm/starry-night/source.css");
  const starryNight = await createStarryNight(common, [sourceCss]);
  const { toHtml } = await import("hast-util-to-html");
 
  //lang mermaid
  if (lang === "mermaid") {
    return `<div class="mermaid">${str}</div>`;
  } else if (lang && starryNight.flagToScope(lang)) {
    try {
      const highlighted = starryNight.highlight(
        str,
        starryNight.flagToScope(lang)
      );
      return `<pre class="hljs"><code>${toHtml(highlighted)}</code></pre>`;
    } catch (error) {
      console.error("Error highlighting code:", error);
      return `<pre class="hljs"><code>${str}</code></pre>`;
    }
  } else {
    return `<pre class="hljs"><code>${str}</code></pre>`;
  }
};

module.exports = renderMarkdown;
