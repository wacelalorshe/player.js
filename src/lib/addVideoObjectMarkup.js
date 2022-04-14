/**
 * Add video-related markup to page head for Google SEO.
 *
 * @param {player} Player An instance of the Player.
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

            // Any off-site page may have multiple embedded Vimeo videos. We can inject
            // VideoObject markup for each video. According to the Google SEO team, we
            // should include key moments (chapters) data for only one video in the page
            const scriptElem = document.querySelector("script[type='application/ld+json']");
            let existingMicrodataHasChapters;
            let existingMicrodata = [];

            if (scriptElem) {
                try {
                    const data = JSON.parse(scriptElem.textContent);
                    existingMicrodata = Array.isArray(data) ? data.slice() : new Array(data);
                    existingMicrodataHasChapters = existingMicrodata.some((item) => item.hasOwnProperty('hasPart'));
                }
                catch (error) {
                    console.warn(error);
                }
            }

            // For key moments rich results, Google requires videos to be at least 30 seconds long
            const MIN_DURATION = 30;
            const {
                chapters,
                description,
                duration: videoDurationSec,
                embedUrl,
                thumbnailUrl,
                title: name,
                uploadDate
            } = data;
            const duration = `PT${videoDurationSec}S`;
            const microdata = {
                '@context': 'http://schema.org',
                '@type': 'VideoObject',
                name,
                duration,
                description,
                uploadDate,
                embedUrl,
                thumbnailUrl
            };

            if (chapters.length > 0 && videoDurationSec > MIN_DURATION && !existingMicrodataHasChapters) {
                const chaptersList = chapters.map((chapter, i) => {
                    const endOffset = i < chapters.length - 1 ? chapters[i + 1].startTime : videoDurationSec;
                    return {
                        name: chapter.title,
                        startOffset: chapter.startTime,
                        endOffset
                    };
                });

                const { href } = window.location;
                const hasPart = chaptersList.map((chapter) => {
                    const url = new URL(href);
                    url.searchParams.append('vimeo_t', chapter.startOffset);
                    const chapterEnhanced = Object.assign(chapter, {
                        '@type': 'Clip',
                        'url': url.href
                    });

                    return chapterEnhanced;
                });

                microdata.hasPart = hasPart;
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
