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
            url
        });

        return chapterEnhanced;
    });

    return hasPart;
}

/**
 * Check page for existing VideoObject schema that includes
 * chapters
 *
 * @return {boolean}
 */
function checkExistingChaptersMicrodata() {
    const ldJsonScriptElems = document.querySelectorAll("script[type='application/ld+json']");

    if (ldJsonScriptElems.length) {
        for (let i = 0; i < ldJsonScriptElems.length; i++) {
            try {
                const scriptContents = JSON.parse(ldJsonScriptElems[i].textContent);
                if (Array.isArray(scriptContents)) {
                    if (scriptContents.some((item) => item.hasOwnProperty('hasPart'))) {
                        return true;
                    }
                }
                else if (scriptContents.hasOwnProperty('hasPart')) {
                    return true;
                }
            }
            catch (error) {
                console.warn(error);
            }
        }
    }

    return false;
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
            const microdata = generateMicrodata(data);

            // A page may contain multiple embedded Vimeo videos. VideoObject
            // SEO markup can be injected into the page for each video. But for
            // video chapters to display as rich search results in Google, we
            // should only inject chapters data for one of the videos.
            const noChaptersInExistingPageMetadata = !checkExistingChaptersMicrodata();
            if (chapters.length && noChaptersInExistingPageMetadata) {
                microdata.hasPart = processChapters(chapters);
            }

            const structuredDataRawText = JSON.stringify([microdata]);
            const scriptElem = document.createElement('script');
            scriptElem.setAttribute('type', 'application/ld+json');
            scriptElem.textContent = structuredDataRawText;
            document.head.appendChild(scriptElem);

            return;
        })
        .catch(() => { });
}
