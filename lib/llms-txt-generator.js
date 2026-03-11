"use strict";

const { NodeHtmlMarkdown } = require("node-html-markdown");
const { minimatch } = require("minimatch");

const nhm = new NodeHtmlMarkdown();

const decodeEntities = (str) =>
  str
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const toAscii = (str) =>
  str
    .replace(/[\u2014\u2013]/g, "--")
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2026]/g, "...")
    .replace(/[\u00A0\u2002\u2003\u2009\u200A\u202F]/g, " ")
    .replace(/[\u2011\u2010]/g, "-");

function cleanMarkdown(html) {
  let md = nhm.translate(html);
  // Remove empty anchor links left by AsciiDoc (e.g. [](#_some_heading))
  md = md.replace(/\[[^\]]*\]\(#[^)]*\)/g, "");
  // Remove leftover empty heading lines
  md = md.replace(/^(#{1,6})\s*$/gm, "");
  return md;
}

/**
 * Walk a navigation tree and collect page URLs in order,
 * along with section headings from tree titles.
 */
function collectNavOrder(trees) {
  const entries = [];
  for (const tree of trees) {
    if (tree.content) {
      entries.push({ type: "heading", content: decodeEntities(tree.content) });
    }
    if (tree.items) {
      walkItems(tree.items, entries);
    }
  }
  return entries;
}

function walkItems(items, entries) {
  for (const item of items) {
    if (item.url && item.urlType === "internal") {
      entries.push({ type: "page", url: item.url });
    }
    if (item.items) {
      walkItems(item.items, entries);
    }
  }
}

/**
 * Antora extension that generates llms.txt, llms-full.txt, and per-page
 * markdown files following the llmstxt.org specification.
 *
 * Based on @cerbos/antora-llm-generator, extended with:
 * - Per-page .md file generation (linked from llms.txt)
 * - Navigation-ordered output (pages follow TOC order)
 * - Section headings from navigation tree
 * - page-llms-description attribute support
 * - page-llms-optional attribute for the Optional section
 * - Site-level subtitle and description config
 * - HTML entity decoding in titles
 * - ASCII normalization (no Unicode in output)
 * - Anchor link cleanup in markdown output
 */
module.exports.register = function (context, { config }) {
  const logger = context.getLogger("llms-txt-generator");
  const { playbook } = context.getVariables();
  const siteTitle = playbook.site?.title || "Documentation";
  const siteUrl = playbook.site?.url;

  const skipPaths = config.skippaths || [];

  const shouldSkipPath = (path) => {
    return skipPaths.some((pattern) => minimatch(path, pattern));
  };

  context.on("navigationBuilt", ({ contentCatalog }) => {
    logger.info("Assembling content for LLM text files.");

    const siteDescription = config.description;
    const siteSubtitle = config.subtitle;

    // H1 title, then blockquote, then descriptive text (per llmstxt.org spec)
    let indexContent = `# ${siteTitle}\n\n`;
    if (siteDescription) {
      indexContent += `> ${siteDescription}\n\n`;
    }
    if (siteSubtitle) {
      indexContent += `${siteSubtitle}\n\n`;
    }

    let fullContent = "";
    let optionalIndex = "";
    let optionalFull = "";

    // Build a lookup from output path to page object
    const allPages = contentCatalog.findBy({ family: "page" });
    const pageByOutPath = new Map();
    for (const page of allPages) {
      if (page.out) {
        pageByOutPath.set("/" + page.out.path, page);
      }
    }

    // Get navigation trees for ordered traversal
    const components = contentCatalog.getComponents();
    let navEntries = [];
    for (const component of components) {
      for (const version of component.versions) {
        if (version.navigation) {
          navEntries = navEntries.concat(collectNavOrder(version.navigation));
        }
      }
    }

    const processedPaths = new Set();
    const { siteCatalog } = context.getVariables();

    function processPage(page) {
      if (!page || !page.out) return;
      if (processedPaths.has(page.out.path)) return;

      if (shouldSkipPath(page.out.path)) {
        processedPaths.add(page.out.path);
        return;
      }

      if (page.asciidoc.attributes["page-llms-ignore"]) {
        processedPaths.add(page.out.path);
        return;
      }

      processedPaths.add(page.out.path);

      const isOptional = !!page.asciidoc.attributes["page-llms-optional"];
      const description = page.asciidoc.attributes["page-llms-description"];
      const title = decodeEntities(page.title);
      const mdPath = page.out.path.replace(/\.html$/, ".md");
      const linkUrl = `${siteUrl}/${mdPath}`;
      const linkLine = `- [${title}](${linkUrl})${description ? `: ${description}` : ""}\n`;

      if (isOptional) {
        optionalIndex += linkLine;
      } else {
        indexContent += linkLine;
      }

      if (page.asciidoc.attributes["page-llms-full-ignore"]) {
        return;
      }

      const plainText = cleanMarkdown(page.contents.toString());
      const pageMarkdown = `# ${title}\n\n${plainText}`;

      // Emit individual .md file
      siteCatalog.addFile({
        out: { path: mdPath },
        contents: Buffer.from(toAscii(pageMarkdown)),
      });

      const fullBlock = `\n\n${title}\n====================\n${plainText}`;

      if (isOptional) {
        optionalFull += fullBlock;
      } else {
        fullContent += fullBlock;
      }
    }

    // Process pages in navigation order
    for (const entry of navEntries) {
      if (entry.type === "heading") {
        indexContent += `\n## ${entry.content}\n\n`;
        fullContent += `\n\n## ${entry.content}\n`;
      } else if (entry.type === "page") {
        const page = pageByOutPath.get(entry.url);
        processPage(page);
      }
    }

    // Append any pages not in navigation
    for (const page of allPages) {
      if (page.out && !processedPaths.has(page.out.path)) {
        processPage(page);
      }
    }

    // Append Optional section if any pages are marked optional
    if (optionalIndex) {
      indexContent += `\n## Optional\n\n${optionalIndex}`;
      fullContent += `\n\n## Optional\n${optionalFull}`;
    }

    const safeIndex = toAscii(indexContent);
    const safeFull = toAscii(fullContent);

    for (const path of ["llms.txt", "llm.txt"]) {
      siteCatalog.addFile({
        out: { path },
        contents: Buffer.from(safeIndex),
      });
    }
    for (const path of ["llms-full.txt", "llm-full.txt"]) {
      siteCatalog.addFile({
        out: { path },
        contents: Buffer.from(safeFull),
      });
    }

    logger.info("llms.txt, llms-full.txt, and per-page .md files generated.");
  });
};
