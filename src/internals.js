import Joi from 'joi'

exports.defaultOptions = {
  parserOptions: {}
}

const itemSchema = Joi.object({
  output: Joi.string().required(),
  query: Joi.string(),
  serialize: Joi.func().required(),
  parserOptions: Joi.object(),
}).required()

const optionsSchema = Joi.object().keys({
  feeds: Joi.array().items(itemSchema).required(),
  query: Joi.string(),
  parserOptions: Joi.object(),
})

exports.validateOptions = ({ reporter }, options = {}) => {
  delete options.plugins

  const result = optionsSchema.validate(options, {
    abortEarly: false,
    allowUnknown: false,
  })

  if (result.error) {
    const errors = result.error.details.map(detail => detail.message)
    reporter.panic(`Error with \`gatsby-plugin-csv-feed\` plugin options:\n${errors.join('\n')}`)
  }

  return null
}

exports.runQuery = (handler, query) => {
  return handler(query).then(res => {
    if (res.errors) {
      throw new Error(res.errors.join(', '))
    }

    return res.data
  })
}
