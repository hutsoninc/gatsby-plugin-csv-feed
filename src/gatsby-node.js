import fs from 'fs-extra'
import path from 'path'
import { Parser } from 'json2csv'
import { defaultOptions, runQuery, validateOptions } from './internals'

exports.onPreBootstrap = validateOptions

exports.onPostBuild = async ({ graphql }, pluginOptions) => {
  const options = {
    ...defaultOptions,
    ...pluginOptions,
  }

  // Run base query
  const baseQuery = options.query ? await runQuery(graphql, options.query) : {}

  // Run queries
  const feedPromises = Object.keys(options.feeds).map(async feed => {
    const { query, ...rest } = options.feeds[feed]

    const data = query ? await runQuery(graphql, query) : {}

    return {
      query: { ...baseQuery, ...data },
      ...rest,
    }
  })

  const feeds = await Promise.all(feedPromises)

  // Serialize data
  await Promise.all(
    feeds.map(async feed => {
      const {
        serialize,
        query,
        output,
        parserOptions = {},
      } = feed

      const feedData = serialize({ query })

      // Get headers
      const fields = feedData.reduce((acc, item) => {
        Object.keys(item).forEach(header => {
          if (!(header in acc)) {
            acc.push(header)
          }
        })
        return acc
      }, [])

      // Create csv
      const parser = new Parser({
        fields,
        ...options.parserOptions,
        ...parserOptions
      })

      const csvData = parser.parse(feedData)

      // Write to file
      const outputPath = path.join('public', output)
      const outputDir = path.dirname(outputPath)

      await fs.ensureDir(outputDir)

      return await fs.writeFile(outputPath, csvData)
    })
  )

  return null
}