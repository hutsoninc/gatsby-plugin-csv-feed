# gatsby-plugin-csv-feed

[![Build Status](https://travis-ci.com/hutsoninc/gatsby-plugin-csv-feed.svg?branch=master)](https://travis-ci.com/hutsoninc/gatsby-plugin-csv-feed) [![Current npm package version](https://img.shields.io/npm/v/gatsby-plugin-csv-feed.svg)](https://www.npmjs.com/package/gatsby-plugin-csv-feed) 

Gatsby plugin for creating CSV data feeds. Can be used for creating dynamic Google Data Feeds, Facebook Catalog Feeds, Page Feeds, and feeds for other integrations. Uses [`json2csv`](https://github.com/zemirco/json2csv) to generate CSVs.

## Installing

`npm install --save gatsby-plugin-csv-feed`

## Usage

Here's an example of how to create a [Custom Google Data Feed](https://support.google.com/google-ads/answer/6053288):

```js
// In your gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: "gatsby-plugin-csv-feed",
      options: {
        // Query to pass to all feed serializers (optional)
        query: `
          {
            site {
              siteMetadata {
                siteUrl
              }
            }
          }
        `,
        // Options to pass to `json2csv` parser for all feeds (optional)
        parserOptions: {},
        // Feeds
        feeds: [
          {
            query: `
              {
                allMarkdownRemark {
                  edges {
                    node {
                      frontmatter {
                        id
                        title
                        description
                        category
                        keywords
                        price
                        image
                      }
                      fields {
                        slug
                      }
                    }
                  }
                }
              }
            `,
            serialize: ({ query: { site, allMarkdownRemark } }) => {
              return allMarkdownRemark.edges.map(edge => {
                const node = Object.assign({}, edge.node.frontmatter, edge.node.fields);
                return {
                  "ID": node.id,
                  "Item title": node.title,
                  "Item description": node.description,
                  "Image URL": `${site.siteMetadata.siteUrl}${node.image}`,
                  "Price": `${Number(node.price).toLocaleString('en-us')} USD`,
                  "Item Category": node.category,
                  "Contextual keywords": node.keywords.join(';'),
                  "Final URL": `${site.siteMetadata.siteUrl}${node.slug}`,
                };
              });
            },
            output: "/product-feed.csv",
            // Options to pass to `json2csv` parser for this feed (optional)
            parserOptions: {},
          },
        ],
      },
    },
  ]
}
```

### Passing parser options to `json2csv`

Additional options may be passed to `json2csv` via the `parserOptions` field. Pass `parserOptions` to all feeds by adding it to the plugin options object or to an individual feed by adding it to the feed object. Feed `parserOptions` take precedence over plugin `parserOptions`.

To see a list of available options, [view the `JavaScript Module` section of the `json2csv` package](https://github.com/zemirco/json2csv#javascript-module).

## License

MIT © [Hutson Inc](https://www.hutsoninc.com)