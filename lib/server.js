const hazel = require('./index')

const {
  INTERVAL: interval,
  ACCOUNT: account,
  REPOSITORY: repository,
  PRE: pre,
  TOKEN: token,
  URL: PRIVATE_BASE_URL,
  VERCEL_URL
} = process.env

const url = VERCEL_URL || PRIVATE_BASE_URL

// Trim whitespace from all environment variables to prevent issues
module.exports = hazel({
  interval: interval ? interval.trim() : undefined,
  account: account ? account.trim() : undefined,
  repository: repository ? repository.trim() : undefined,
  pre: pre ? pre.trim() : undefined,
  token: token ? token.trim() : undefined,
  url: url ? url.trim() : undefined
})
