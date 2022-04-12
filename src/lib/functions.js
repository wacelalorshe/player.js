/**
 * @module lib/functions
 */

/**
 * Check to see this is a node environment.
 * @type {Boolean}
 */
/* global global */
export const isNode = typeof global !== 'undefined' &&
  ({}).toString.call(global) === '[object global]';

/**
 * Get the name of the method for a given getter or setter.
 *
 * @param {string} prop The name of the property.
 * @param {string} type Either “get” or “set”.
 * @return {string}
 */
export function getMethodName(prop, type) {
    if (prop.indexOf(type.toLowerCase()) === 0) {
        return prop;
    }

    return `${type.toLowerCase()}${prop.substr(0, 1).toUpperCase()}${prop.substr(1)}`;
}

/**
 * Check to see if the object is a DOM Element.
 *
 * @param {*} element The object to check.
 * @return {boolean}
 */
export function isDomElement(element) {
    return Boolean(
        element && element.nodeType === 1 && 'nodeName' in element &&
        element.ownerDocument && element.ownerDocument.defaultView
    );
}

/**
 * Check to see whether the value is a number.
 *
 * @see http://dl.dropboxusercontent.com/u/35146/js/tests/isNumber.html
 * @param {*} value The value to check.
 * @param {boolean} integer Check if the value is an integer.
 * @return {boolean}
 */
export function isInteger(value) {
    // eslint-disable-next-line eqeqeq
    return !isNaN(parseFloat(value)) && isFinite(value) && Math.floor(value) == value;
}

/**
 * Check to see if the URL is a Vimeo url.
 *
 * @param {string} url The url string.
 * @return {boolean}
 */
export function isVimeoUrl(url) {
    return (/^(https?:)?\/\/((player|www)\.)?vimeo\.com(?=$|\/)/).test(url);
}

/**
 * Get the Vimeo URL from an element.
 * The element must have either a data-vimeo-id or data-vimeo-url attribute.
 *
 * @param {object} oEmbedParameters The oEmbed parameters.
 * @return {string}
 */
export function getVimeoUrl(oEmbedParameters = {}) {
    const id = oEmbedParameters.id;
    const url = oEmbedParameters.url;
    const idOrUrl = id || url;

    if (!idOrUrl) {
        throw new Error('An id or url must be passed, either in an options object or as a data-vimeo-id or data-vimeo-url attribute.');
    }

    if (isInteger(idOrUrl)) {
        return `https://vimeo.com/${idOrUrl}`;
    }

    if (isVimeoUrl(idOrUrl)) {
        return idOrUrl.replace('http:', 'https:');
    }

    if (id) {
        throw new TypeError(`“${id}” is not a valid video id.`);
    }

    throw new TypeError(`“${idOrUrl}” is not a vimeo.com url.`);
}

// TODO: NEED TO DETERMINE WHERE addClipMarkup SHOULD BE DEFINED, IF NOT HERE
export function addClipMarkup(player) {
    if (!player) {
       return;
    }

    // Any off-site page may have multiple embedded Vimeo videos. We
    // can inject VideoObject markup for each video. According to the
    // Google SEO team, we should include 'chapters' data for only
    // one of the videos

    const scriptElem = document.querySelector("script[type='application/ld+json']");
    let existingMicrodataHasChapters;
    let existingMicrodata = [];

    if (scriptElem) {
        const temp = JSON.parse(scriptElem.textContent);
        existingMicrodata = Array.isArray(temp) ? temp.slice() : new Array(temp);
        existingMicrodataHasChapters = existingMicrodata.some(item => item.hasOwnProperty('hasPart'));
    }

    player.getVideoObjectMetadata()
        .then((data) => {        
            if (!data) {
                return;
            }

            const defaultThumbnail = 'https://i.vimeocdn.com/portrait/default';
            const MIN_DURATION = 30;
            const {
                author,
                chapters,
                description: clipDescription,
                duration,
                embedUrl,
                thumbsBaseUrl,
                title,
                uploadDate
            } = data;
            const durationIso8601 = `PT${duration}S`;
            const thumbnailUrl = thumbsBaseUrl ? `${thumbsBaseUrl}_640` : defaultThumbnail;
            const description = (clipDescription.trim().length)
                ? clipDescription
                : `This is "${title}" by ${author} on Vimeo, the home for high quality videos and the people who love them.`;

            const microdata = {
                '@context': 'http://schema.org',
                '@type': 'VideoObject',
                name: title,
                duration: durationIso8601,
                description,
                uploadDate: uploadDate,
                embedUrl: embedUrl,
                thumbnailUrl,
            }
            
            // Clips must be at least 30 seconds long to leverage Key Moments moments rich results
            if (chapters.length > 0 && duration > MIN_DURATION && !existingMicrodataHasChapters) {
                const chaptersList = chapters.map((ch, i) => {
                    const endOffset = i < chapters.length - 1 ? chapters[i + 1].startTime : duration;
                    return {
                        name: ch.title,
                        startOffset: ch.startTime,
                        endOffset
                    };
                });

                const { href } = window.location;
                const hasPart = chaptersList.map((chapter) => {
                    const url = new URL(href);
                    url.searchParams.append('vimeo_t', chapter.startOffset);
                    return {
                        ...chapter,
                        '@type': 'Clip',
                        url: url.href
                    };
                });

                microdata.hasPart = hasPart;
            }

            if (scriptElem) {
                scriptElem.textContent = JSON.stringify([...existingMicrodata, microdata]);
            } else {
                const structuredDataRawText = JSON.stringify([microdata]);
                const newScriptElem = document.createElement('script');
                newScriptElem.setAttribute('type', 'application/ld+json');
                newScriptElem.textContent = structuredDataRawText;
                document.head.appendChild(newScriptElem);
            }

            return;
        })
        .catch((error) => {
            console.error(error.message);
        });
};
