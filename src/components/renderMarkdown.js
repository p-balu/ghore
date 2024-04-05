const { JSDOM } = require("jsdom");
const cmarkGfm = require("cmark-gfm");

// Defining variables to store the Starry Night and related modules
let starryNight = null;
let toHtml = null;

// Initializing Starry Night libraries once and store them
const initializeStarryNight = async () => {
  if (!starryNight || !toHtml) {
    const { createStarryNight, common } = await import("@wooorm/starry-night");
    const sourceCss = await import("@wooorm/starry-night/source.css");
    starryNight = await createStarryNight(common, [sourceCss]);
    ({ toHtml } = await import("hast-util-to-html"));
  }
};

const renderMarkdown = async (data) => {
  await initializeStarryNight();
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

  // Highlight code blocks and replacing the original nodes
  const codeBlocks = document.querySelectorAll("code");
  for (const block of codeBlocks) {
    const lang = block.className.split("language-")[1];
    if (lang) {
      const highlightedHtml = await highlightCode(lang, block.textContent);

      // Creating a new wrapper for the highlighted code
      const wrapperDiv = document.createElement("div");
      wrapperDiv.className = `language-${lang}`;
      wrapperDiv.innerHTML = highlightedHtml;

      // Replacing the original code block with the new wrapper
      block.parentNode.replaceChild(wrapperDiv, block);
    }
  }

  return dom.serialize();
};

// Highlight code blocks function
const highlightCode = async (lang, str) => {
  if (!starryNight || !toHtml) {
    await initializeStarryNight();
  }

  //lang mermaid
  if (lang === "mermaid") {
    return `<div class="mermaid">${str}</div>`;
  } else if (lang && starryNight.flagToScope(lang)) {
    try {
      const highlighted = starryNight.highlight(
        str,
        starryNight.flagToScope(lang)
      );
      // Directly return highlighted code without wrapping it in <pre> and <code> here
      return toHtml(highlighted);
    } catch (error) {
      console.error("Error highlighting code:", error);
      // In case of an error, still do not wrap in <pre> and <code>
      return str;
    }
  } else {
    // For unspecified languages, consider wrapping as per your default style
    return str;
  }
};

module.exports = renderMarkdown;
