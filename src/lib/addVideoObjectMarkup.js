/**
 * Append special 'vimeo_t' time param to a URL
 *
 * @param {number} time Start time of video chapter
 * @return {string}
 */
function appendTimeQuery(time) {
    const { href, search, hash } = window.location;
    let newHref = '';
    const timeParam = `vimeo_t=${time}`;

    if (search.length) {
        const qs = `${search}&${timeParam}`;
        newHref = href.replace(search, qs);
    }
    else {
        newHref = hash.length ? href.replace(hash, `?${timeParam}${hash}`) : `${href}?${timeParam}${hash}`;
    }

    return newHref;
}

/**
 * Generate VideoObject schema markup for this video
 *
 * @param {object} data Object with video metadata
 * @return {array}
 */
function generateMicrodata(data) {
    const {
        description,
        duration,
        embedUrl,
        thumbnailUrl,
        title,
        uploadDate
    } = data;

    const microdata = {
        '@context': 'http://schema.org',
        '@type': 'VideoObject',
        'name': title,
        'duration': `PT${duration}S`,
        description,
        uploadDate,
        embedUrl,
        thumbnailUrl
    };

    return microdata;
}

/**
 * Map a list of video chapters to valid 'hasPart' schema
 *
 * @param {array} chapters An array of chapter data objects
 * @return {array}
 */
function processChapters(chapters) {
    const hasPart = chapters.map((chapter) => {
        const url = appendTimeQuery(chapter.startOffset);
        const chapterEnhanced = Object.assign(chapter, {
            '@type': 'Clip',
            'url': url
        });

        return chapterEnhanced;
    });

    return hasPart;
}

/**
 * Add VideoObject schema markup to page head for Google SEO.
 *
 * @param {Player} player An instance of the Player.
 * @return {void}
 */
export function addVideoObjectMarkup(player) {
    if (!player) {
        return;
    }

    player.get('videoObjectMetadata')
        .then((data) => {
            if (!data) {
                return;
            }

            const { chapters } = data;

            // An off-site page may have multiple embedded Vimeo videos. We can inject
            // VideoObject markup for each video. According to the Google SEO team, we
            // should include key moments (chapters) data for only one video in the page
            const scriptElem = document.querySelector("script[type='application/ld+json']");
            let existingMicrodataHasChapters;
            let existingMicrodata = [];

            if (scriptElem) {
                try {
                    const scriptContents = JSON.parse(scriptElem.textContent);
                    existingMicrodata = Array.isArray(scriptContents) ? scriptContents.slice() : new Array(scriptContents);
                    existingMicrodataHasChapters = existingMicrodata.some((item) => item.hasOwnProperty('hasPart'));
                }
                catch (error) {
                    console.warn(error);
                }
            }

            const microdata = generateMicrodata(data);
            if (chapters.length > 0 && !existingMicrodataHasChapters) {
                microdata.hasPart = processChapters(chapters);
            }

            if (scriptElem) {
                scriptElem.textContent = JSON.stringify(existingMicrodata.concat(microdata));
            }
            else {
                const structuredDataRawText = JSON.stringify([microdata]);
                const newScriptElem = document.createElement('script');
                newScriptElem.setAttribute('type', 'application/ld+json');
                newScriptElem.textContent = structuredDataRawText;
                document.head.appendChild(newScriptElem);
            }

            return;
        })
        .catch(() => {});
}
