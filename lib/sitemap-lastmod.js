'use strict'

/**
 * Antora extension: add <lastmod> to sitemap entries from each page's
 * :page-date-modified: attribute, so search and answer engines can see
 * which pages have been refreshed.
 */
module.exports.register = function () {
  const logger = this.getLogger('sitemap-lastmod')

  this.on('beforePublish', ({ playbook, siteCatalog, contentCatalog }) => {
    const siteUrl = (playbook.site.url || '').replace(/\/$/, '')
    const dates = new Map()
    for (const page of contentCatalog.getPages((p) => p.out)) {
      const modified = page.asciidoc?.attributes?.['page-date-modified']
      if (modified) dates.set(siteUrl + page.pub.url, modified)
    }
    let added = 0
    for (const file of siteCatalog.getFiles()) {
      if (!/^sitemap(-[^/]+)?\.xml$/.test(file.out?.path || '')) continue
      const xml = file.contents.toString().replace(/<loc>([^<]+)<\/loc>(?!\s*<lastmod>)/g, (match, loc) => {
        const date = dates.get(loc)
        if (!date) return match
        added++
        return `${match}\n<lastmod>${date}</lastmod>`
      })
      file.contents = Buffer.from(xml)
    }
    logger.info(`Added lastmod to ${added} sitemap entries.`)
  })
}
