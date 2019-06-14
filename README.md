# gatsby-plugin-csv-feed

[![Current npm package version](https://img.shields.io/npm/v/gatsby-plugin-csv-feed.svg)](https://www.npmjs.com/package/gatsby-plugin-csv-feed) 

Gatsby plugin for creating CSV data feeds. Can be used for creating dynamic Google Data Feeds and feeds for other integrations that don't support RSS.

## Installing

`npm install --save gatsby-plugin-csv-feed`

## Usage

Here's an example of how to create a [Custom Google Data Feed](https://support.google.com/google-ads/answer/6053288).

```js
// In your gatsby-config.js
module.exports = {
  plugins: [
    {
      resolve: "gatsby-plugin-csv-feed",
      options: {
            feeds: [
                {
                    query: `
                        {
                            site {
                                siteMetadata {
                                    siteUrl
                                }
                            }
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
                                "Tracking template": `${site.siteMetadata.siteUrl}${node.slug}?utm_source=Google&utm_medium=Dynamic%20Remarketing%20Ad`,
                            };
                        });
                    },
                    output: "/product-feed.csv",
                },
            ],
        },
    },
  ]
}
```

## License

MIT © [Hutson Inc](https://www.hutsoninc.com)