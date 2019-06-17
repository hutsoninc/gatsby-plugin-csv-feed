import Joi from 'joi';

export function validateOptions({ reporter }, options = {}) {
    delete options.plugins;

    const result = optionsSchema.validate(options, {
        abortEarly: false,
        allowUnknown: false,
    });

    if (result.error) {
        const errors = [];

        result.error.details.forEach(detail => {
            errors.push(detail.message);
        });

        reporter.panic(`Error with gatsby-plugin-csv-feed plugin options:\n${errors.join('\n')}`);
    }
}

const itemSchema = Joi.object({
    output: Joi.string().required(),
    query: Joi.string().required(),
    serialize: Joi.func().required(),
}).required();

const optionsSchema = Joi.object().keys({
    feeds: Joi.array().items(itemSchema).required(),
    query: Joi.string(),
});

export function runQuery(handler, query) {
    return handler(query).then(res => {
        if (res.errors) {
            throw new Error(res.errors.join(', '));
        }

        return res.data;
    });
}
