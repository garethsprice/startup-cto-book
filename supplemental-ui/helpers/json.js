'use strict'

// Render a value as a JSON string literal for JSON-LD. AsciiDoc header
// attributes arrive with special characters already escaped, so decode
// those first. Use with triple braces: {{{json page.attributes.description}}}
module.exports = (value) => {
  const s = value == null ? '' : String(value)
  const decoded = s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8212;/g, '—')
    .replace(/&#8211;/g, '–')
    .replace(/&amp;/g, '&')
  return JSON.stringify(decoded).replace(/</g, '\\u003c')
}
