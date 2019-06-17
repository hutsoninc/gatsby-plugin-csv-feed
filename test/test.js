jest.mock('fs-extra');
const fs = require('fs-extra');
const path = require('path');
const { onPreBootstrap } = require('../src/gatsby-node');
const { onPostBuild } = require('../src/gatsby-node');

const noop = function () { };

describe('gatsby-plugin-csv-feed', () => {

    describe('onPreBootstrap', () => {

        const setup = async options => {
            const reporter = {
                panic: jest.fn(),
            };

            await onPreBootstrap({ reporter }, options);

            return {
                reporter,
                options,
            };
        };

        it('imports', () => {
            expect(onPreBootstrap).toBeDefined();
            expect(typeof onPreBootstrap).toEqual('function');
        });

        it('removes plugins', async () => {
            const { options } = await setup({
                plugins: [],
            });

            expect(options.plugins).toBeUndefined();
        });
        
        it('reports invalid query option', async () => {
            const { reporter } = await setup({
                query: 123,
                feeds: [{
                    output: 'out.csv',
                    serialize: noop,
                    query: `query`
                }],
            });

            expect(reporter.panic).toHaveBeenCalledTimes(1);
        });

        it('reports missing feeds option', async () => {
            const { reporter } = await setup();

            expect(reporter.panic).toHaveBeenCalledTimes(1);
        });

        it('reports invalid feeds option', async () => {
            const { reporter } = await setup({
                feeds: [],
            });

            expect(reporter.panic).toHaveBeenCalledTimes(1);
        });

        it('reports errors with missing feeds item options', async () => {
            const output = 'out.csv';
            const serialize = noop;
            const query = `query`;

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
            });

            expect(reporter.panic).toHaveBeenCalledTimes(1);
        });

        it('successfully validates feeds option', async () => {
            const { reporter } = await setup({
                feeds: [{
                    output: 'out.csv',
                    serialize: noop,
                    query: `query`
                }],
            });

            expect(reporter.panic).toHaveBeenCalledTimes(0);
        });

        it('successfully validates query option', async () => {
            const { reporter } = await setup({
                query: `query`,
                feeds: [{
                    output: 'out.csv',
                    serialize: noop,
                    query: `query`
                }],
            });

            expect(reporter.panic).toHaveBeenCalledTimes(0);
        });

    });

    describe('onPostBuild', () => {

        beforeEach(() => {
            fs.exists = jest.fn().mockResolvedValue(true);
            fs.writeFile = jest.fn().mockResolvedValue(true);
            fs.mkdirp = jest.fn().mockResolvedValue();
        });

        it('imports', () => {
            expect(onPostBuild).toBeDefined();
            expect(typeof onPostBuild).toEqual('function');
        });

        it(`creates CSV`, async () => {
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
            });

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
                            return edge.node.frontmatter;
                        });
                    },
                    output: 'out.csv',
                }],
            });

            const [filePath, contents] = fs.writeFile.mock.calls[0];

            expect(filePath).toEqual(path.join(`public`, `out.csv`));
            expect(contents).toMatchSnapshot();
        });

        it(`creates multiple CSVs`, async () => {
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
            });

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
                                return edge.node.frontmatter;
                            });
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
                                return edge.node;
                            });
                        },
                        output: 'products.csv',
                    },
                ],
            });

            expect(fs.writeFile).toHaveBeenCalledTimes(2);

            const call0 = fs.writeFile.mock.calls[0];
            const call1 = fs.writeFile.mock.calls[1];

            expect(call0[0]).toEqual(path.join(`public`, `out.csv`));
            expect(call0[1]).toMatchSnapshot();

            expect(call1[0]).toEqual(path.join(`public`, `products.csv`));
            expect(call1[1]).toMatchSnapshot();
        });

        it(`does not mutate base query`, async () => {
            const siteData = {
                data: {
                    site: {
                        siteMetadata: {
                            title: 'Site title',
                        },
                    },
                },
            };

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
            };

            const graphql = jest.fn()
                .mockResolvedValueOnce(siteData)
                .mockResolvedValueOnce(allMarkdownRemarkData);

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
                            return Object.assign({}, edge.node.frontmatter, {
                                siteTitle: site.siteMetadata.title,
                            });
                        });
                    },
                    output: 'out.csv',
                }],
            });

            const [filePath, contents] = fs.writeFile.mock.calls[0];

            expect(filePath).toEqual(path.join(`public`, `out.csv`));
            expect(contents).toMatch(/siteTitle/);
            expect(contents).toMatchSnapshot();
        });

    });

});