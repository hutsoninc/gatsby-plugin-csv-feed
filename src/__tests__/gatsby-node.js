jest.mock('fs-extra')
const fs = require('fs-extra')
const path = require('path')
const { onPostBuild, onPreBootstrap } = require('../gatsby-node')

const noop = function () {}

describe('gatsby-plugin-csv-feed', () => {
  describe('onPreBootstrap', () => {
    const setup = async options => {
        const reporter = {
          panic: jest.fn(),
        }

        await onPreBootstrap({ reporter }, options)

        return {
          reporter,
          options,
        }
    }

    it('removes plugins', async () => {
      const { options } = await setup({
        plugins: [],
      })

      expect(options.plugins).toBeUndefined()
    })
    
    it('reports invalid query option', async () => {
      const { reporter } = await setup({
        query: 123,
        feeds: [{
          output: 'out.csv',
          serialize: noop,
          query: `query`,
        }],
      })

      expect(reporter.panic).toHaveBeenCalledTimes(1)
    })
    
    it('reports invalid parserOptions option', async () => {
      const { reporter } = await setup({
        parserOptions: 123,
        feeds: [{
          output: 'out.csv',
          serialize: noop,
          query: `query`,
        }],
      })

      expect(reporter.panic).toHaveBeenCalledTimes(1)
    })
    
    it('reports invalid parserOptions feed option', async () => {
      const { reporter } = await setup({
        feeds: [{
          output: 'out.csv',
          serialize: noop,
          query: `query`,
          parserOptions: 123,
        }],
      })

      expect(reporter.panic).toHaveBeenCalledTimes(1)
    })

    it('reports missing feeds option', async () => {
      const { reporter } = await setup()

      expect(reporter.panic).toHaveBeenCalledTimes(1)
    })

    it('reports invalid feeds option', async () => {
      const { reporter } = await setup({
        feeds: [],
      })

      expect(reporter.panic).toHaveBeenCalledTimes(1)
    })

    it('reports errors with missing feeds item options', async () => {
      const output = 'out.csv'
      const serialize = noop
      const query = `query`

      const { reporter } = await setup({
        feeds: [
          {
            serialize,
          },
          {
            output,
            query,
          },
          {
            serialize,
            query,
          },
        ],
      })

      expect(reporter.panic).toHaveBeenCalledTimes(1)
    })

    it('successfully validates feeds option', async () => {
      const { reporter } = await setup({
        feeds: [{
          output: 'out.csv',
          serialize: noop,
          query: `query`,
        }],
      })

      expect(reporter.panic).toHaveBeenCalledTimes(0)
    })

    it('successfully validates query option', async () => {
      const { reporter } = await setup({
        query: `query`,
        parserOptions: {},
        feeds: [{
          output: 'out.csv',
          serialize: noop,
          query: `query`,
          parserOptions: {},
        }],
      })

      expect(reporter.panic).toHaveBeenCalledTimes(0)
    })
  })

  describe('onPostBuild', () => {
    beforeEach(() => {
      fs.ensureDir = jest.fn().mockResolvedValue(true)
      fs.writeFile = jest.fn().mockResolvedValue(true)
      fs.mkdirp = jest.fn().mockResolvedValue()
    })

    it('creates CSV', async () => {
      const graphql = jest.fn().mockResolvedValue({
        data: {
          allMarkdownRemark: {
            edges: [
              {
                node: {
                  frontmatter: {
                    title: 'Some title',
                    description: 'Some description',
                  },
                },
              },
            ],
          },
        },
      })

      await onPostBuild({ graphql }, {
        feeds: [{
          query: `
            {
              allMarkdownRemark {
                edges {
                  node {
                    frontmatter {
                      title
                      description
                    }
                  }
                }
              }
            }
          `,
          serialize: ({ query: { allMarkdownRemark } }) => {
            return allMarkdownRemark.edges.map(edge => {
              return edge.node.frontmatter
            })
          },
          output: 'out.csv',
        }],
      })

      const [filePath, contents] = fs.writeFile.mock.calls[0]

      expect(filePath).toEqual(path.join('public', 'out.csv'))
      expect(contents).toMatchSnapshot()
    })

    it('creates multiple CSVs', async () => {
      const graphql = jest.fn().mockResolvedValue({
          data: {
              allMarkdownRemark: {
                  edges: [
                      {
                          node: {
                              frontmatter: {
                                  title: 'Some title',
                                  description: 'Some description',
                              },
                          },
                      },
                  ],
              },
              allProduct: {
                  edges: [
                      {
                          node: {
                              name: 'Product name',
                              sku: 'Product sku',
                              price: 10,
                          },
                      },
                  ],
              },
          },
      })

      await onPostBuild({ graphql }, {
        feeds: [
          {
            query: `
              {
                allMarkdownRemark {
                  edges {
                    node {
                      frontmatter {
                        title
                        description
                      }
                    }
                  }
                }
              }
            `,
            serialize: ({ query: { allMarkdownRemark } }) => {
              return allMarkdownRemark.edges.map(edge => {
                return edge.node.frontmatter
              })
            },
            output: 'out.csv',
          },
          {
            query: `
              {
                allProduct {
                  edges {
                    node {
                      name
                      sku
                      price
                    }
                  }
                }
              }
            `,
            serialize: ({ query: { allProduct } }) => {
              return allProduct.edges.map(edge => {
                return edge.node
              })
            },
            output: 'products.csv',
          },
        ],
      })

      expect(fs.writeFile).toHaveBeenCalledTimes(2)

      const call0 = fs.writeFile.mock.calls[0]
      const call1 = fs.writeFile.mock.calls[1]

      expect(call0[0]).toEqual(path.join('public', 'out.csv'))
      expect(call0[1]).toMatchSnapshot()

      expect(call1[0]).toEqual(path.join('public', 'products.csv'))
      expect(call1[1]).toMatchSnapshot()
    })

    it('does not mutate base query', async () => {
      const siteData = {
        data: {
          site: {
            siteMetadata: {
              title: 'Site title',
            },
          },
        },
      }

      const allMarkdownRemarkData = {
        data: {
          allMarkdownRemark: {
            edges: [
              {
                node: {
                  frontmatter: {
                    title: 'Some title',
                    description: 'Some description',
                  },
                },
              },
            ],
          },
        },
      }

      const graphql = jest.fn()
        .mockResolvedValueOnce(siteData)
        .mockResolvedValueOnce(allMarkdownRemarkData)

      await onPostBuild({ graphql }, {
        query: `
          {
            site {
              siteMetadata {
                title
              }
            }
          }
        `,
        feeds: [{
          query: `
            {
              allMarkdownRemark {
                edges {
                  node {
                    frontmatter {
                      title
                      description
                    }
                  }
                }
              }
            }
          `,
          serialize: ({ query: { site, allMarkdownRemark } }) => {
            return allMarkdownRemark.edges.map(edge => {
              return {
                ...edge.node.frontmatter,
                siteTitle: site.siteMetadata.title,
              }
            })
          },
          output: 'out.csv',
        }],
      })

      const [filePath, contents] = fs.writeFile.mock.calls[0]

      expect(filePath).toEqual(path.join('public', 'out.csv'))
      expect(contents).toMatch(/siteTitle/)
      expect(contents).toMatchSnapshot()
    })

    it('creates CSV using example from README', async () => {
      const siteData = {
        data: {
          site: {
            siteMetadata: {
              siteUrl: 'https://www.hutsoninc.com',
            },
          },
        },
      }

      const allMarkdownRemarkData = {
        data: {
          allMarkdownRemark: {
            edges: [
              {
                node: {
                  frontmatter: {
                    id: '1',
                    title: 'Title 1',
                    description: 'Description 1',
                    category: 'Category 1',
                    keywords: ['Keyword 1'],
                    price: 1,
                    image: '/image1.jpg'
                  },
                  fields: {
                    slug: '/products/1'
                  }
                },
              },
              {
                node: {
                  frontmatter: {
                    id: '2',
                    title: 'Title 2',
                    description: 'Description 2',
                    category: 'Category 2',
                    keywords: ['Keyword 2'],
                    price: 2,
                    image: '/image2.jpg'
                  },
                  fields: {
                    slug: '/products/2'
                  }
                },
              },
            ],
          },
        },
      }

      const graphql = jest.fn()
        .mockResolvedValueOnce(siteData)
        .mockResolvedValueOnce(allMarkdownRemarkData)

      await onPostBuild({ graphql }, {
        query: `
          {
            site {
              siteMetadata {
                siteUrl
              }
            }
          }
        `,
        feeds: [{
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
                'ID': node.id,
                'Item title': node.title,
                'Item description': node.description,
                'Image URL': `${site.siteMetadata.siteUrl}${node.image}`,
                'Price': `${Number(node.price).toLocaleString('en-US')} USD`,
                'Item Category': node.category,
                'Contextual keywords': node.keywords.join(';'),
                'Final URL': `${site.siteMetadata.siteUrl}${node.slug}`,
              };
            });
          },
          output: '/product-feed.csv',
        }],
      })

      const [filePath, contents] = fs.writeFile.mock.calls[0]

      expect(filePath).toEqual(path.join('public', '/product-feed.csv'))
      expect(contents).toMatchSnapshot()
    })
  })
})