/**
 * Polestar is a tiny Markdown site authoring and blogging tool in
 * JavaScript---GitHub flavored and fully client-side.
 *
 * @author  L. D. Nordstrom <d@mrnordstrom.com>
 * @version 0.1.1
 * @license MPL 2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Global Polestar constructor.
 *
 * @class
 * @param {Object} userPreferences User defined preferences
 */
function Polestar(userPreferences) {
  'use strict'

  /* *********
   * Private *
   ********* */

  /** Self reference for closures */
  var self = this

  /**
   * @property {Object} preferences Polestar preferences
   * @property {String} preferences.branch Git branch
   * @property {Boolean} preferences.cache Enable sessionStorage cache
   * @property {String} preferences.into CSS selector for container
   * @property {Boolean} preferences.loadAll Load all articles at once
   * @property {Array} preferences.plugins Plugins to run
   * @property {String} preferences.repo GitHub repository
   */
  var preferences = applyPreferencesToDefaults(userPreferences, {
    branch: 'master',
    cache: true,
    into: '',
    loadAll: false,
    plugins: [],
    repo: ''
  })

  /** Holds element into which articles are rendered */
  var container

  /** Holds repository contents as returned from GitHub */
  var repositoryContents = []

  /** Holds ETag for repository contents, for last modified check */
  var repositoryETag =
    window.sessionStorage ? sessionStorage.getItem('etag') : false

  /** Holds objects of loaded articles: { id, element, content } */
  var articles = []

  /** Holds objects of partials: { id, at, element, content } */
  var partials = []

  /** Cached page height for onscroll calculation */
  var pageHeight

  /** Cached viewport height for onscroll calculation */
  var viewportHeight

  /** Autoload until this target article ID has been reached */
  var locationHashTarget

  /** Location hashbang debug parameters: abc.com#!key=value&... */
  var urlParameters = requestParameters()

  /**
   * Performs any initialization that needs to run once DOM is loaded,
   * fetching articles and partials, setting up event listeners, etc.
   *
   * @method
   * @private
   */
  function initialize() {
    container =
      document.querySelector(preferences.into) || document.body

    if (preferences.plugins instanceof Array) {
      preferences.plugins.forEach(self.use)
    }

    self.emit('initialize')
    self.on('error', function (error) {
      if (urlParameters.debug) {
        console.error('<Polestar> ' + error.message)
      }
    })

    if (!preferences.cache || !loadPartialsFromCache()) {
      loadPartials()
    }

    if (preferences.repo) {
      loadRepositoryContents()

      window.onscroll = function (event) {
        var scrollTop = window.pageYOffset ||
          (document.documentElement ||
           document.body.parentNode ||
           document.body).scrollTop

        /* If scroll reaches bottom of page */
        if (scrollTop === pageHeight - viewportHeight) {
          loadNextArticle()
        }
      }
    }
  }

  /**
   * Overrides a set of default preferences with user defined values.
   * Allows user to add preferences that are not in defaults.
   *
   * @method
   * @private
   * @param {Object} userPreferences User defined preferences
   * @param {Object} defaults Default preferences to override
   * @return {Object} Defaults overriden by user preferences
   */
  function applyPreferencesToDefaults(userPreferences, defaults) {
    var option

    for (option in userPreferences) {
      if (userPreferences.hasOwnProperty(option)) {
        defaults[option] = userPreferences[option]
      }
    }

    return defaults
  }

  /**
   * Parses URL parameters into key-value pairs stored in
   * `this.urlParameters`. These are passed via a "location
   * hashbang": a location hash starting with an exclamation point.
   * As opposed to query strings, they're never sent to the server.
   *
   * @method
   * @private
   * @example
   * `example.com#!user=me&auth => { user: 'me', auth: true }`
   */
  function requestParameters() {
    var index = location.hash.indexOf('!')
    var parameters = []
    var parameter
    var parts

    if (index !== -1) {
      parts = decodeURI(location.hash.substr(index + 1)).split('&')
      index = parts.length

      while (index--) {
        parameter = parts[index]

        if (parameter.indexOf('=') === -1) {
            parameters[parameter.trim()] = true
        } else {
            parameter = parameter.split('=')
            parameters[parameter[0].trim()] = parameter[1].trim()
        }
      }
    }

    return parameters
  }

  /**
   * Makes sure the article ID specified in location hash refers to an
   * actual article, so they all won't be loaded unnecessarily. If it
   * finds the ID, it stores it in `this.locationHashTarget`.
   *
   * @method
   * @private
   */
  function setLocationHashTarget() {
    var target
    var file
    var id
    var i
    var l

    if (location.hash) {
      target = location.hash.substr(1, location.hash.length - 1)

      for (i = 0, l = repositoryContents.length; i < l; i += 1) {
        file = repositoryContents[i].name
        id = file.substr(0, file.lastIndexOf('.')) || file

        if (target === id) {
          locationHashTarget = target
          break
        }
      }
    }
  }

  /**
   * Updates cached page and viewport height used in onscroll
   * calculations. Should run whenever content is added to the page.
   *
   * @method
   * @private
   */
  function updateScrollValues() {
    viewportHeight = document.documentElement.clientHeight
    pageHeight = Math.max(
      document.documentElement.clientHeight,
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    )
  }

  /**
   * Sets the basic authentication headers for the GitHub API on an
   * XMLHttpRequest object if credentials have been specified.
   *
   * @method
   * @private
   * @param {XMLHttpRequest} XMLHttpRequest object to set headers on
   */
  function setGitHubAuthenticationHeadersOnXHR(xhr) {
    if (urlParameters.hasOwnProperty('username') &&
        urlParameters.hasOwnProperty('password')) {
      var username = urlParameters.username
      var password = urlParameters.password

      xhr.setRequestHeader(
        'Authorization',
        'Basic ' + btoa(username + ':' + password)
      )
    }
  }

  /**
   * Loads contents from the GitHub repository specified by the "repo"
   * preference (or from cache, if cached content is still valid), and
   * then calls `Polestar#loadNextArticle()` to load articles.
   *
   * @method
   * @private
   */
  function loadRepositoryContents() {
    var parts = preferences.repo.split('/')
    var url = 'https://api.github.com/repos/'
    var options

    try {
      url += parts.slice(0, 2).join('/') + '/contents'
      url += parts.length > 2 ? '/' + parts.slice(2).join('/') : ''
      url += '?ref=' + preferences.branch
      options = { url: url }
    } catch (error) {
      error.message = 'Could not parse GitHub preferences.'
      self.emit('error', error)
      throw error
    }

    if (preferences.cache && repositoryETag) {
      options.headers = { 'If-None-Match': repositoryETag }
    }

    self.request(options, function (response) {
      try {
        if (response.status === 304) {
          /* Receieved a "Not Modified" response */
          loadArticlesFromCache()
        } else if (response.status === 200) {
          repositoryETag = response.headers['ETag']
          repositoryContents = JSON.parse(response.body)
            .filter(function (article) {
              return article.type === "file"
            }).reverse()

          setLocationHashTarget()
          loadNextArticle()
        } else {
          throw new Error('Could not load GitHub repository contents.')
        }
      } catch (error) {
        self.emit('error', error)
      }
    })
  }

  /**
   * Loads one article from its GitHub URL, and continues loading more
   * articles sequentially and synchronously if the "loadAll"
   * preference is `true`. It looks at how many articles are loaded
   * and fetches the next one in line in `repositoryContents`. When
   * done, it refreshes location hash to jump to the right location.
   *
   * @method
   * @private
   */
  function loadNextArticle() {
    if (articles.length < repositoryContents.length) {
      var done
      var matchesTarget
      var article = {}
      var nextIndex = articles.length
      var url = repositoryContents[nextIndex].url
      var file = repositoryContents[nextIndex].name
      var id = file.substr(0, file.lastIndexOf('.')) || file
      var options = {
        url: url,
        headers: { 'Accept': 'application/vnd.github.v3.raw' }
      }

      self.request(options, function (response) {
        article.meta = self.parseJsonFrontMatter(response.body)
        article.source = self.removeJsonFrontMatter(response.body)
        article.id = id
        article.url = url

        self.parseMarkdown(response.body, function (content) {
          done = nextIndex + 1 >= repositoryContents.length
          matchesTarget = id === locationHashTarget

          article.content = content

          /* Conditional prevents double rendering of same article */
          if (!articles[nextIndex]) {
            self.emit('articleParsed', { article: article })
            renderArticle(article)
            self.emit('articleRendered', { article: article })

            articles[nextIndex] = article
          }

          /* Go to location hash if done loading without specific
             location hash target, or specific target is reached */
          if ((done && !locationHashTarget) || matchesTarget) {
            refreshLocationHash()
          }

          /* Load next if we're loading all or target isn't reached */
          if (!done && (preferences.loadAll || !matchesTarget)) {
            loadNextArticle()
          }

          cache()
        })
      })
    }
  }

  /**
   * Outputs article to the page by appending it to the container,
   * and updates the stored page height for onscroll calculation.
   *
   * @method
   * @private
   * @param {Object} article Object literal article representation
   */
  function renderArticle(article) {
    var element = document.createElement('article')
    var div = document.createElement('div')

    div.innerHTML = article.content
    element.appendChild(div)
    element.setAttribute('id', article.id)
    article.element = element

    container.appendChild(element)

    updateScrollValues()
  }

  /**
   * Loads content for partials. Partials are added in markup using a
   * `data-at` attribute pointing to the local markdown file
   * containing the content.
   *
   * @private
   * @method
   */
  function loadPartials() {
    var elements = document.querySelectorAll('*[data-at]')

    Array.prototype.forEach.call(elements, function (element) {
      var at = element.getAttribute('data-at')
      var id = element.getAttribute('id') || at
      var partial = {
        element: element,
        at: at,
        id: id,
        url: at + '.md'
      }

      self.request({ url: partial.url }, function (response) {
        partial.meta = self.parseJsonFrontMatter(response.body)
        partial.source = self.removeJsonFrontMatter(response.body)

        self.parseMarkdown(partial.source, function (content) {
          partial.content = content
          partial.source = response.body

          self.emit('partialParsed', { partial: partial })
          partial.element.innerHTML = partial.content
          self.emit('partialRendered', { partial: partial })

          partials.push(partial)

          cache()
        })
      })
    })
  }

  /**
   * Loads and renders articles from sessionStorage cache.
   *
   * @private
   * @method
   */
  function loadArticlesFromCache() {
    if (window.sessionStorage) {
      cachedArticles = JSON.parse(
        sessionStorage.getItem('articles')
      ) || []

      cachedArticles.forEach(function (article) {
        var emitData = { polestar: self, article: article }

        emit('articleParsed', emitData)
        renderArticle(article)
        emit('articleRendered', emitData)

        articles.push(article)
      })
    }
  }

  /**
   * Loads and renders partials from sessionStorage cache.
   *
   * @private
   * @method
   */
  function loadPartialsFromCache() {
    var containerCount = document.querySelector('*[data-at]').length

    if (containerCount && window.sessionStorage) {
      partials = JSON.parse(
        sessionStorage.getItem('partials')
      ) || []

      partials.forEach(function (partial) {
        partial.element =
          document.querySelector('*[data-at="' + partial.at + '"]')

        if (partial.element) {
          var emitData = { polestar: self, partial: partial }

          emit('articleParsed', emitData)
          element.innerHTML = partial.content
          emit('articleRendered', emitData)

          partials.push(partial)
        }
      })
    }

    return partials.length === containerCount
  }

  /**
   * Caches current ETag, repository contents, articles, and partials
   * in `window.sessionStorage` to avoid further requests and GitHub's
   * rate limit. **Turn this off using the "cache" preference.**
   *
   * @private
   * @method
   */
  function cache() {
    if (preferences.cache && window.sessionStorage) {
      sessionStorage.setItem('etag', repositoryETag)
      sessionStorage.setItem('meta', JSON.stringify(
        repositoryContents
      ))

      sessionStorage.setItem('articles', JSON.stringify(
        articles.map(function (article) {
          article.element = false
          return article
        })
      ))

      sessionStorage.setItem('partials', JSON.stringify(
        partials.map(function (partial) {
          partial.element = false
          return partial
        })
      ))
    }
  }

  /**
   * Makes the window jump to the currently set location hash.
   *
   * @private
   * @method
   */
  function refreshLocationHash() {
    location.hash = location.hash
  }

  /* ************
   * Public API *
   ************ */

  /**
   * Subscribe method for events.
   *
   * @method
   * @public
   */
  this.on = function on(topic, func) {
    if (!this.topics) this.topics = {}
    if (!(topic instanceof Array)) topic = [topic]

    topic.forEach(function (t) {
      this[t] ? this[t].push(func) : this[t] = [func]
    }.bind(this.topics))
  }

  /**
   * Publish method for events.
   *
   * @method
   * @public
   */
  this.emit = function emit(topic, data) {
    if (!this.topics) return
    (this.topics[topic] || []).forEach(function (fn) { fn(data) })
  }

  /**
   * Unsubscribe method for events.
   *
   * @method
   * @public
   */
  this.off = function off(topic, func) {
    (this.topics[topic] || []).some(function (fn, index, array) {
      if (fn === func) return array.splice(index, 1)
    })
  }

  /**
   * Returns the container HTML element for this instance.
   *
   * @method
   * @public
   * @return {HTMLElement} Container element
   */
  this.getContainer = function getContainer() {
    return container
  }

  /**
   * Returns the preferences object for this instance.
   *
   * @method
   * @public
   * @return {Object} Preferences object
   */
  this.getPreferences = function getPreferences() {
    return preferences
  }

  /**
   * Sends an XMLHTTPRequest to a given URL (specified in `options`
   * parameter along with request headers), and returns an object
   * representing the response to a callback function. This response
   * object contains only selected details we need; currently `body`
   * and `headers` (the only header we need is the `ETag`.
   *
   * @method
   * @public
   * @param {Object} options Object (`url` and `headers` properties)
   * @param {Function} callback Callback function to pass response
   */
  this.request = function request(options, callback) {
    var xhr = new XMLHttpRequest()

    xhr.open('GET', options.url, true)

    if (options.hasOwnProperty('headers')) {
      for (var header in options.headers) {
        xhr.setRequestHeader(header, options.headers[header])
      }
    }

    if (options.url.match(/^https:\/\/api.github.com/)) {
      setGitHubAuthenticationHeadersOnXHR(xhr)
    }

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        callback({
          body: xhr.responseText,
          headers: { 'ETag': xhr.getResponseHeader('ETag') },
          status: xhr.status
        })
      }
    }

    xhr.send(null)
  }

  /**
   * Parses Markdown using a POST request to the GitHub API, and
   * returns the resulting HTML to a callback function.
   *
   * @method
   * @public
   * @param {String} source Markdown source to parse
   * @param {Function} callback Callback function to pass HTML
   */
  this.parseMarkdown = function parseMarkdown(source, callback) {
    var xhr = new XMLHttpRequest()

    xhr.open('POST', 'https://api.github.com/markdown/raw', true)
    xhr.setRequestHeader('Content-Type', 'text/x-markdown')

    setGitHubAuthenticationHeadersOnXHR(xhr)

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          callback(xhr.responseText)
        } else {
          displayError(messages.gitHubError)
          callback(false)
        }
      }
    }

    xhr.send(source)
  }

  /**
   * Parses any JSON Front Matter (JSFM) located at the beginning of a
   * string, and returns the resulting object (or false, if
   * parsing failed or there was no JSFM to parse).
   *
   * @method
   * @public
   * @params {String} source String to parse front matter from
   * @return {Object|Boolean} Object if JSFM exists, otherwise false
   */
  this.parseJsonFrontMatter = function parseJSFM(source) {
    var expression = /^(\[\{[\s\S]*?\}\])/g
    var matches = expression.exec(source)
    var json = matches ? JSON.parse(matches[0]) : false
    var result = json ? json[0] : false

    return result
  }

  /**
   * Removes any JSON Front Matter from the source of a article or
   * partial, and returns the result.
   *
   * @method
   * @public
   * @params {String} source String to remove front matter from
   * @return {String} String without front matter
   */
  this.removeJsonFrontMatter = function removeJSFM(source) {
    var expression = /^\[\{[\s\S]*?\}\]/g
    var result = source.replace(expression, '').trim()

    return result
  }

  /**
   * Runs a plugin method with this instance as only parameter.
   *
   * @method
   * @public
   */
  this.use = function use(func) {
    func(self)
  }

  /* ****************
   * Initialization *
   **************** */

  /* Confirm browser requirements and initialize */
  if (Array.prototype.filter && Array.prototype.some &&
      Array.prototype.forEach && document.querySelector) {
    if (document.readyState === 'complete') {
      initialize()
    } else {
      document.addEventListener('DOMContentLoaded', initialize, false)
    }

    document.documentElement.className ?
      document.documentElement.className += ' polestarted' :
      document.documentElement.className += 'polestarted'
  }
}