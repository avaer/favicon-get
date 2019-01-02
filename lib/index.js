'use strict'

const { URL, parse: urlParse } = require('url')
// const getdom = require('./getdom')
const rank = require('./rank')
// const iconByFile = require('./origin/file')
// const iconByHtml = require('./origin/html')
// const iconByManifest = require('./origin/manifest')
// const iconByDeep = require('./origin/deep')

const iconByFile = (() => {
  // const request = require('../request')
  const {URL, parse:urlParse} = require('url')
  // const fileType = require('file-type')

  return async (document, querySelectorAll) => {
      // let icons = []
      return new Promise(async (resolve, reject)=>{
          resolve([{
            src:new URL((/^https?:/.test(document.baseURI) ? '/' : '') + 'favicon.ico', document.baseURI).href,
              sizes:'',
              type:'image/x-icon',
              // origin:'/favicon.ico'
          }]);
      })
  };
})();
const iconByHtml = (() => {
  const {URL, parse:urlParse} = require('url')
  // const cheerio = require('cheerio')
  const selectors = [
      "link[rel='icon'][href]",
      // "link[rel='icon' i][href]",
      "link[rel='shortcut icon' i][href]",
      "link[rel='apple-touch-icon' i][href]",
      "link[rel='apple-touch-icon-precomposed' i][href]",
      "link[rel='apple-touch-startup-image' i][href]",
      "link[rel='mask-icon' i][href]",
      "link[rel='fluid-icon' i][href]",
      "meta[name='msapplication-TileImage' i][content]",
      "meta[name='twitter:image' i][content]",
      "meta[property='og:image' i][content]"
  ]

  return async (document, querySelectorAll) => {
      return new Promise((resolve, reject)=>{
        const icons = []

        for (let i = 0; i < selectors.length; i++) {
          const selector = selectors[i];
          const els = querySelectorAll(document, selector);

          for (let j = 0; j < els.length; j++) {
            const el = els[j];
            let src;
            if(el.tagName == 'LINK'){
                src = el.attributes.href && el.attributes.href.value;
            }else{
                src = el.attributes.content && el.attributes.content.value;
            }
            if(src && src !== '#'){
                icons.push({
                    src:new URL(src, document.baseURI).href,
                    sizes: '',
                    type: el.attributes.type ? el.attributes.type.value : '',
                    // origin:cheerio.html(el)
                })
            }
          }
        }
        resolve(icons)
      })
  };
})();
const iconByManifest = (() => {
  // const request = require('../request')
  const {URL, parse:urlParse} = require('url')

  return async (document, querySelectorAll) => {
      return new Promise(async (resolve, reject)=>{
          const matches = querySelectorAll(document, 'link[rel="manifest" i]');
          if (matches.length > 0) {
            const match = matches[0];
            const href = match.attribs.href;

            if(href) {
              const url = new URL(href, document.baseURI).href;

              fetch(url)
                .then(res => {
                  if (res.ok) {
                    return res.json();
                  } else {
                    return Promise.reject(new Error(`invalid status code: ${res.status}`));
                  }
                })
                .then(icons => icons.map( 
                  ({src = '', sizes = '', type = ''})=>({src:new URL(src, url).href, sizes, type, /*origin:url*/})
                ))
                .then(resolve, reject);
            } else {
              resolve([]);
            }
          } else {
            resolve([])
          }
      })
  };
})();

module.exports = async (url, getdom, fetch, querySelectorAll) => {
    // let icons = []

    // if (!url) return reject({})
    // if (!urlParse(url).protocol) url = `http://${url}`
    /* let $ = */
    const document = await getdom(url);
    const tagIcon = await iconByHtml(document, querySelectorAll);
    const manifestIcon = await iconByManifest(document, querySelectorAll);
    const fileIcon = await iconByFile(document, querySelectorAll);

    const icons = fileIcon.concat(tagIcon, manifestIcon);
    for (let i in icons) {
      icons[i].rank = rank(icons[i]);
    }
    return icons.sort((a, b) => (b.rank - a.rank));
    /* return {
        url: $.url,
        baseUrl: $.baseUrl,
        // originUrl: url,
        icons
    }; */
};
