// Packages
const fetch = require('node-fetch')
const retry = require('async-retry')
const convertStream = require('stream-to-string')
const ms = require('ms')
const yaml = require('js-yaml')

// Utilities
const checkPlatform = require('./platform')

module.exports = class Cache {
  constructor(config) {
    const { account, repository, token, url } = config
    this.config = config

    if (!account || !repository) {
      const error = new Error('Neither ACCOUNT, nor REPOSITORY are defined')
      error.code = 'missing_configuration_properties'
      throw error
    }

    if (token && !url) {
      const error = new Error(
        'Neither VERCEL_URL, nor URL are defined, which are mandatory for private repo mode'
      )
      error.code = 'missing_configuration_properties'
      throw error
    }

    this.latest = {}
    this.lastUpdate = null

    this.cacheReleaseList = this.cacheReleaseList.bind(this)
    this.refreshCache = this.refreshCache.bind(this)
    this.loadCache = this.loadCache.bind(this)
    this.isOutdated = this.isOutdated.bind(this)
  }

  async cacheReleaseList(url) {
    const { token } = this.config
    const headers = { Accept: 'application/vnd.github.preview' }

    if (token && typeof token === 'string' && token.length > 0) {
      headers.Authorization = `token ${token}`
    }

    const { status, body } = await retry(
      async () => {
        const response = await fetch(url, { headers })

        if (response.status !== 200) {
          throw new Error(
            `Tried to cache RELEASES, but failed fetching ${url}, status ${status}`
          )
        }

        return response
      },
      { retries: 3 }
    )

    let content = await convertStream(body)
    const matches = content.match(/[^ ]*\.nupkg/gim)

    if (matches.length === 0) {
      throw new Error(
        `Tried to cache RELEASES, but failed. RELEASES content doesn't contain nupkg`
      )
    }

    for (let i = 0; i < matches.length; i += 1) {
      const nuPKG = url.replace('RELEASES', matches[i])
      content = content.replace(matches[i], nuPKG)
    }
    return content
  }

  async refreshCache() {
    const { account, repository, pre, token } = this.config
    // Trim whitespace to prevent URL construction issues
    const cleanAccount = account ? account.trim() : account
    const cleanRepository = repository ? repository.trim() : repository
    const repo = cleanAccount + '/' + cleanRepository
    const url = `https://api.github.com/repos/${repo}/releases?per_page=100`
    const headers = { Accept: 'application/vnd.github.preview' }

    if (token && typeof token === 'string' && token.length > 0) {
      headers.Authorization = `token ${token}`
    }

    const response = await retry(
      async () => {
        const response = await fetch(url, { headers })

        if (response.status !== 200) {
          throw new Error(
            `GitHub API responded with ${response.status} for url ${url}`
          )
        }

        return response
      },
      { retries: 3 }
    )

    const data = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      return
    }

    const release = data.find(item => {
      const isPre = Boolean(pre) === Boolean(item.prerelease)
      return !item.draft && isPre
    })

    if (!release || !release.assets || !Array.isArray(release.assets)) {
      return
    }

    const { tag_name } = release

    if (this.latest.version === tag_name) {
      console.log('Cached version is the same as latest')
      this.lastUpdate = Date.now()
      return
    }

    console.log(`Caching version ${tag_name}...`)

    this.latest.version = tag_name
    this.latest.notes = release.body
    this.latest.pub_date = release.published_at

    // Clear list of download links
    this.latest.platforms = {}
    
    // Store YAML files for SHA512 extraction
    const yamlFiles = {}

    for (const asset of release.assets) {
      const { name, browser_download_url, url, content_type, size } = asset

      if (name === 'RELEASES') {
        try {
          if (!this.latest.files) {
            this.latest.files = {}
          }
          this.latest.files.RELEASES = await this.cacheReleaseList(
            browser_download_url
          )
        } catch (err) {
          console.error(err)
        }
        continue
      }
      
      // Cache YAML files for SHA512 extraction
      if (name.endsWith('.yml')) {
        try {
          const response = await fetch(browser_download_url)
          const yamlContent = await response.text()
          yamlFiles[name] = yamlContent
        } catch (err) {
          console.error(`Error fetching ${name}:`, err)
        }
        continue
      }

      const platform = checkPlatform(name)

      if (!platform) {
        continue
      }

      this.latest.platforms[platform] = {
        name,
        api_url: url,
        url: browser_download_url,
        content_type,
        size: Math.round(size / 1000000 * 10) / 10
      }
    }
    
    // Parse YAML files to extract SHA512 hashes and apply to platforms
    if (Object.keys(yamlFiles).length > 0) {
      if (!this.latest.files) {
        this.latest.files = {}
      }
      this.latest.files.yamlFiles = yamlFiles
      
      // Extract SHA512 from latest-mac.yml
      if (yamlFiles['latest-mac.yml']) {
        try {
          const macYaml = yaml.load(yamlFiles['latest-mac.yml'])
          if (macYaml && macYaml.files) {
            for (const file of macYaml.files) {
              // Match file to platform
              const fileName = file.url
              if (fileName) {
                for (const [platform, data] of Object.entries(this.latest.platforms)) {
                  if (data.name === fileName) {
                    data.sha512 = file.sha512
                    break
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error('Error parsing latest-mac.yml:', err)
        }
      }
      
      // Extract SHA512 from latest-linux.yml
      if (yamlFiles['latest-linux.yml']) {
        try {
          const linuxYaml = yaml.load(yamlFiles['latest-linux.yml'])
          if (linuxYaml && linuxYaml.files) {
            for (const file of linuxYaml.files) {
              const fileName = file.url
              if (fileName) {
                for (const [platform, data] of Object.entries(this.latest.platforms)) {
                  if (data.name === fileName) {
                    data.sha512 = file.sha512
                    data.blockMapSize = file.blockMapSize
                    break
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error('Error parsing latest-linux.yml:', err)
        }
      }
      
      // Extract SHA512 from latest.yml (Windows)
      if (yamlFiles['latest.yml']) {
        try {
          const winYaml = yaml.load(yamlFiles['latest.yml'])
          if (winYaml && winYaml.files) {
            for (const file of winYaml.files) {
              const fileName = file.url
              if (fileName) {
                for (const [platform, data] of Object.entries(this.latest.platforms)) {
                  if (data.name === fileName) {
                    data.sha512 = file.sha512
                    break
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error('Error parsing latest.yml:', err)
        }
      }
    }

    console.log(`Finished caching version ${tag_name}`)
    this.lastUpdate = Date.now()
  }

  isOutdated() {
    const { lastUpdate, config } = this
    const { interval = 15 } = config

    if (lastUpdate && Date.now() - lastUpdate > ms(`${interval}m`)) {
      return true
    }

    return false
  }

  // This is a method returning the cache
  // because the cache would otherwise be loaded
  // only once when the index file is parsed
  async loadCache() {
    const { latest, refreshCache, isOutdated, lastUpdate } = this

    if (!lastUpdate || isOutdated()) {
      await refreshCache()
    }

    return Object.assign({}, latest)
  }
}
