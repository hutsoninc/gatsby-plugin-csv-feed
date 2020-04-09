import fs from 'fs-extra'
import path from 'path';
import { Parser } from 'json2csv';
import { defaultOptions, runQuery, validateOptions } from './internals';

const publicPath = `./public`;

export const onPreBootstrap = validateOptions;

export async function onPostBuild({ graphql }, pluginOptions) {
    // Combine options
    const options = {
        ...defaultOptions,
        ...pluginOptions,
    }

    // Run base query
    let baseQuery;
    if (options.query) {
        baseQuery = await runQuery(graphql, options.query);
    }

    // Run queries
    const feedPromises = Object.keys(options.feeds).map(async feed => {
        const { query, ...rest } = options.feeds[feed];

        let data;
        if(query) {
            data = await runQuery(graphql, query)
        }

        return {
            query: Object.assign({}, baseQuery, data),
            ...rest,
        };
    });

    const feeds = await Promise.all(feedPromises);

    // Serialize data
    const filePromises = feeds.map(async feed => {
        const {
            serialize,
            query,
            output,
            parserOptions = {},
        } = feed;

        const fields = [];

        const feedData = serialize({ query });

        // Get headers
        feedData.forEach(item => {
            Object.keys(item).forEach(header => {
                const headerMatch = fields.find(val => val === header);
                if (!headerMatch) {
                    fields.push(header);
                }
            });
        });

        // Create csv
        const parser = new Parser({
            fields,
            ...options.parserOptions,
            ...parserOptions
        });

        const csvData = parser.parse(feedData);

        // Write to file
        const outputPath = path.join(publicPath, output);
        const outputDir = path.dirname(outputPath);

        if (!(await fs.exists(outputDir))) {
            await fs.mkdirp(outputDir);
        }

        return await fs.writeFile(outputPath, csvData);
    });

    // Write to files
    await Promise.all(filePromises);
}