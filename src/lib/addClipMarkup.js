/**
 * Add clip-related markup to page head for Google SEO.
 *
 * @param {player} Player An instance of the Player.
 * @return {void}
 */
// TODO: NEED TO DETERMINE WHERE THIS METHOD SHOULD BE DEFINED, IF NOT HERE
export function addClipMarkup(player) {
    if (!player) {
        return;
    }

    // Any off-site page may have multiple embedded Vimeo videos. We can inject
    // VideoObject markup for each video. According to the Google SEO team, we
    // should include 'chapters' data for only one video in the page
    const scriptElem = document.querySelector("script[type='application/ld+json']");
    let existingMicrodataHasChapters;
    let existingMicrodata = [];

    if (scriptElem) {
        const temp = JSON.parse(scriptElem.textContent);
        existingMicrodata = Array.isArray(temp) ? temp.slice() : new Array(temp);
        existingMicrodataHasChapters = existingMicrodata.some((item) => item.hasOwnProperty('hasPart'));
    }

    player.getVideoObjectMetadata()
        .then((data) => {
            if (!data) {
                return;
            }

            // For key moments rich results, Google requires clips to be at least 30 seconds long
            const MIN_DURATION = 30;
            const defaultThumbnail = 'https://i.vimeocdn.com/portrait/default';
            const {
                author,
                chapters,
                description: clipDescription,
                duration: clipDurationSec,
                embedUrl,
                thumbsBaseUrl,
                title: name,
                uploadDate
            } = data;
            const duration = `PT${clipDurationSec}S`;
            const thumbnailUrl = thumbsBaseUrl ? `${thumbsBaseUrl}_640` : defaultThumbnail;
            const description = (clipDescription.trim().length) ? clipDescription : `This is "${title}" by ${author} on Vimeo, the home for high quality videos and the people who love them.`;
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

            if (chapters.length > 0 && clipDurationSec > MIN_DURATION && !existingMicrodataHasChapters) {
                const chaptersList = chapters.map((chapter, i) => {
                    const endOffset = i < chapters.length - 1 ? chapters[i + 1].startTime : clipDurationSec;
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
                scriptElem.textContent = JSON.stringify([...existingMicrodata, microdata]);
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
        .catch((error) => {
            console.error(error.message);
        });
}