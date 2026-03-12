'use strict'

module.exports.register = function (registry) {
  registry.postprocessor(function () {
    this.process(function (doc, output) {
      if (doc.getBackend() !== 'html5') return output
      if (!output.includes('<div id="footnotes">')) return output
      return output.replace(
        '<div id="footnotes">\n<hr>',
        '<h2 class="footnotes-title">References</h2>\n<div id="footnotes">'
      )
    })
  })
}
