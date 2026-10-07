const pairArea = document.querySelector("#pairArea");
const imgA = document.querySelector("#imgA");
const chooseA = document.querySelector("#chooseA");
const imgB = document.querySelector("#imgB");
const chooseB = document.querySelector("#chooseB");
const results = document.querySelector("#results");
const userChoice = document.querySelector("#userChoice");
const judgesChoice = document.querySelector("#judgesChoice");
const modelChoice = document.querySelector("#modelChoice");
const nextButton = document.querySelector("#nextButton");
const stats = document.querySelector("#stats");
const storageStatus = document.querySelector("#storageStatus");
const progress = document.querySelector("#progress");
const message = document.querySelector("#message");
const resetButton = document.querySelector("#resetButton");
const featureList = document.querySelector("#featureList");
const roundSummary = document.querySelector("#roundSummary");
const roundUserJudges = document.querySelector("#roundUserJudges");
const roundUserModel = document.querySelector("#roundUserModel");
const roundModelJudges = document.querySelector("#roundModelJudges");
const disagreementList = document.querySelector("#disagreementList");
const contribute = document.querySelector('#contribute');
const collectionAvailability = document.querySelector('#collectionAvailability');
const sessionCode = document.querySelector('#sessionCode');
const retrySave = document.querySelector('#retrySave');
const retryImages = document.querySelector('#retryImages');
const retryData = document.querySelector('#retryData');
const artworkDetails = document.querySelector('#artworkDetails');
const STORAGE_KEY = 'cac-art-lab-progress';
const SESSION_KEY = 'cac-art-lab-anonymous-session';
const FEATURE_LABELS = {
    O_symmetry_lr: "Left-right symmetry",
    O_symmetry_tb: "Top-bottom symmetry",
    O_balance_lr: "Left-right balance",
    O_balance_tb: "Top-bottom balance",
    O_centrality: "Visual centrality",
    O_rule_of_thirds: "Rule-of-thirds alignment",
    O_edge_orient_concentration: "Edge direction concentration",
    O_hue_dominant_share: "Dominant hue share",

    R_color_count: "Color count",
    R_hue_entropy: "Hue entropy",
    R_saturation_mean: "Mean saturation",
    R_brightness_std: "Brightness variation",
    R_edge_density: "Edge density",
    R_texture_roughness: "Texture roughness",
    R_local_entropy: "Local information",
    R_high_freq_ratio: "High-frequency detail",

    N_aspect_ratio: "Aspect ratio",
    N_log_pixels: "Log pixel count",
    N_bytes_per_pixel: "Bytes per pixel",
    N_sharpness: "Sharpness",
    N_brightness_mean: "Mean brightness",
    N_contrast_p95_p05: "Contrast range",
    N_dark_ratio: "Dark pixel share",
    N_bright_ratio: "Bright pixel share",
    N_grayscale_ratio: "Near-gray pixel share",
    N_mean_r: "Mean red channel",
    N_mean_g: "Mean green channel",
    N_mean_b: "Mean blue channel"
};


const GROUP_LABELS = {
    O: "Order",
    R: "Richness",
    N: "Unclassified"
};
let pairs = [];
let answers = [];
let currentIndex = 0;
let artworks = {};
let collectionConfig = null;
let sessionId = null;
let roundId = crypto.randomUUID();
let consent = false;
let events = [];
let synced = [];
let shownAt = null;
let displayedIndex = -1;
let sending = false;
let imageFailure = false;

function artworkInfo(file) {
    return artworks[file];
}

function renderArtworkDetails(pair) {
    artworkDetails.replaceChildren();
    for (const side of ['A', 'B']) {
        const info = artworkInfo(pair['img_' + side]);
        if (!info) continue;
        const p = document.createElement('p');
        p.append(`Painting ${side}: ${info.title} — ${info.artist || 'Artist unknown'}`);
        if (info.date) p.append(`, ${info.date}`);
        p.append('. ');
        const link = document.createElement('a');
        link.href = info.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'View The Met collection record';
        p.append(link);
        artworkDetails.append(p);
    }
}

function updateImageState() {
    const ready = imgA.complete && imgA.naturalWidth > 0 && imgB.complete && imgB.naturalWidth > 0;
    if ((imgA.complete && imgA.naturalWidth === 0) || (imgB.complete && imgB.naturalWidth === 0)) imageFailure = true;
    const answered = currentIndex < answers.length;
    if (ready && !answered && pairs.length && !shownAt) {
        shownAt = new Date().toISOString();
        saveProgress();
    }
    chooseA.disabled = answered || !ready;
    chooseB.disabled = answered || !ready;
    retryImages.hidden = !imageFailure;
    if (!answered && imageFailure) message.textContent = 'An image could not load. Retry loading it before choosing.';
    else if (!answered && !ready) message.textContent = 'Loading both paintings...';
    else if (!answered) message.textContent = 'Choose the painting you prefer to reveal the results.';
}

function setPairImages(pair, retry = false) {
    const suffix = retry ? '?retry=' + Date.now() : '';
    for (const side of ['A', 'B']) {
        const img = side === 'A' ? imgA : imgB;
        const source = 'img/' + pair['img_' + side] + suffix;
        img.alt = `Painting ${side}: ${artworkInfo(pair['img_' + side]).visualAlt}`;
        const current = img.getAttribute('src') || '';
        if (current !== source && (retry || !current.startsWith(source + '?retry='))) {
            imageFailure = false;
            img.src = source;
        }
    }
    updateImageState();
}

function preferredSide(q) {
    if (q > 0.5) return 'A';
    if (q < 0.5) return 'B';
    return 'Tie';
}
function preferenceText(q, description) {
    const side = preferredSide(q);
    const support = side === 'B' ? 1 - q : q;
    return `${side} (${description}: ${(support * 100).toFixed(2)}%)`;
}
function reveal() {
    const pair = pairs[currentIndex];
    userChoice.textContent = answers[currentIndex];
    judgesChoice.textContent = preferenceText(pair.q_A, 'weighted support');
    modelChoice.textContent = preferenceText(pair.model_q_A, 'predicted probability');
    renderArtworkDetails(pair);
    for (const side of ['A', 'B']) {
        const img = side === 'A' ? imgA : imgB;
        const info = artworkInfo(pair['img_' + side]);
        if (info) img.alt = `Painting ${side}: ${info.title}. ${info.visualAlt}`;
    }
    renderFeatures(pair);
    results.hidden = false;

}
function agreementText(field) {
    let matches = 0;
    let comparisons = 0;

    for (let i = 0; i < answers.length; i += 1) {
        const side = preferredSide(pairs[i][field]);
        if (side === 'Tie') continue;
        comparisons += 1;
        if (answers[i] === side) matches += 1;
    }

    if (comparisons === 0) return 'No comparisons yet';
    return `${matches}/${comparisons} (${(matches / comparisons * 100).toFixed(1)}%)`;
}
function renderStats() {
    stats.textContent = `Answered: ${answers.length}/${pairs.length}`
        + ` | AI judges agreement: ${agreementText('q_A')}`
        + ` | Feature model agreement: ${agreementText('model_q_A')}`;
}
function saveProgress() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            currentIndex,
            answers,
            pairIds: pairs.map(pair => pair.pair_id),
            datasetVersion: collectionConfig.datasetVersion,
            sessionId,
            roundId,
            consent,
            events,
            synced,
            shownAt,
            displayedIndex
        }));
        storageStatus.textContent = 'Progress saved in this browser.';
        return true;
    } catch (error) {
        storageStatus.textContent = 'Browser progress could not be saved. Refreshing may lose this round.';
        console.warn('Could not save progress:', error);
        return false;
    }
}
function restoreProgress() {
    try {
        const savedText = localStorage.getItem(STORAGE_KEY);
        if (savedText === null) {
            storageStatus.textContent = 'Your choices will be saved in this browser.';
            return;
        }

        const saved = JSON.parse(savedText);
        if (!saved || !Array.isArray(saved.answers)
            || !saved.answers.every(side => side === 'A' || side === 'B')
            || saved.answers.length > pairs.length
            || !Number.isInteger(saved.currentIndex)
            || saved.currentIndex < 0 || saved.currentIndex > pairs.length
            || !(saved.currentIndex === saved.answers.length
                || saved.currentIndex === saved.answers.length - 1)
            || !Array.isArray(saved.pairIds)
            || saved.pairIds.length !== pairs.length
            || !saved.pairIds.every((id, i) => id === pairs[i].pair_id)) {
            throw new Error('Saved progress does not match this round.');
        }

        answers = saved.answers;
        currentIndex = saved.currentIndex;
        if (saved.datasetVersion === collectionConfig.datasetVersion
            && typeof saved.roundId === 'string' && Array.isArray(saved.events)
            && Array.isArray(saved.synced) && saved.events.length === answers.length
            && saved.synced.length === answers.length
            && saved.synced.every(value => typeof value === 'boolean')
            && saved.sessionId === sessionId) {
            roundId = saved.roundId;
            consent = saved.consent === true;
            events = saved.events;
            synced = saved.synced;
            // An unanswered pair is timed from the current page display after refresh.
            shownAt = null;
            displayedIndex = -1;
        } else if (answers.length) {
            // Existing browser-only rounds stay local; historical choices are not uploaded.
            consent = false;
            events = answers.map(() => null);
            synced = answers.map(() => true);
        }
        storageStatus.textContent = consent && !collectionConfig.endpoint
            ? 'Online saving is unavailable. Your pending choice is kept here; retry when service returns.'
            : 'Saved progress restored.';
    } catch (error) {
        answers = [];
        currentIndex = 0;
        consent = false;
        events = [];
        synced = [];
        storageStatus.textContent = 'Saved progress could not be restored. Choose a painting to start again, or use Restart round.';
        console.warn('Could not restore progress:', error);
    }
}
function render() {
    const finished = currentIndex === pairs.length;
    roundSummary.hidden = !finished;
    renderStats();
    contribute.checked = consent;
    contribute.disabled = answers.length > 0 || !collectionConfig?.endpoint || !sessionId;
    resetButton.disabled = sending || (consent && synced.some(value => !value));
    sessionCode.hidden = !collectionConfig?.endpoint || !sessionId;
    if (!sessionCode.hidden) sessionCode.textContent = `Anonymous browser ID for owner-assisted test: ${sessionId}`;

    pairArea.hidden = finished;
    results.hidden = true;
    nextButton.hidden = finished;
    retrySave.hidden = true;
    retryImages.hidden = true;

    if (finished) {
        progress.textContent = 'Round complete';
        message.textContent = 'You have compared every pair. Review your final statistics or restart the round.';
        renderSummary();
        return;
    }

    const pair = pairs[currentIndex];
    const answered = currentIndex < answers.length;

    if (displayedIndex !== currentIndex) {
        shownAt = null;
        displayedIndex = currentIndex;
    }
    setPairImages(pair);
    progress.textContent = `Pair ${currentIndex + 1} of ${pairs.length}`;

    const savedOnline = !consent || synced[currentIndex] === true;
    message.textContent = answered
        ? (savedOnline ? 'Choice recorded. Continue to the next pair.'
            : 'Choice is pending online saving. Retry if it does not complete.')
        : 'Choose a painting to reveal the results.';

    chooseA.disabled = answered;
    chooseB.disabled = answered;
    nextButton.disabled = !answered || !savedOnline;
    retrySave.hidden = !answered || savedOnline;
    retrySave.disabled = sending;

    nextButton.textContent = currentIndex === pairs.length - 1
        ? 'Finish round' : 'Next pair';

    if (answered && savedOnline) reveal();
    updateImageState();
}
async function loadPairs() {
    try {
        retryData.hidden = true;
        const responses = await Promise.all(['./app_data.json', './artworks.json', './collection_config.json']
            .map(path => fetch(path, { cache: 'no-store' })));
        if (responses.some(response => !response.ok)) throw new Error('A required data file could not load');
        [pairs, artworks, collectionConfig] = await Promise.all(responses.map(response => response.json()));
        if (!Array.isArray(pairs) || pairs.length === 0) {
            throw new Error('No painting pairs were loaded.');
        }
        if (!collectionConfig || typeof collectionConfig.datasetVersion !== 'string'
            || !pairs.every(pair => artworkInfo(pair.img_A)?.visualAlt && artworkInfo(pair.img_B)?.visualAlt))
            throw new Error('Artwork metadata or collection version is incomplete');
        try {
            sessionId = localStorage.getItem(SESSION_KEY);
            if (!sessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
                sessionId = crypto.randomUUID();
                localStorage.setItem(SESSION_KEY, sessionId);
            }
        } catch {
            sessionId = null;
        }
        if (collectionConfig.endpoint && !/^https:\/\//.test(collectionConfig.endpoint)
            && !/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(collectionConfig.endpoint))
            throw new Error('Invalid collection endpoint');
        collectionAvailability.textContent = collectionConfig.endpoint && sessionId
            ? 'Online contribution is configured. Check the box before your first answer to opt in; saving is confirmed after each choice.'
            : 'Online contribution is currently unavailable. You can still play with browser-only progress.';
        restoreProgress();
        resetButton.disabled = false;
        render();
        if (consent && currentIndex < answers.length && !synced[currentIndex] && collectionConfig.endpoint)
            sendPendingChoice();
    } catch (error) {
        pairs = [];
        roundSummary.hidden = true;
        pairArea.hidden = true;
        results.hidden = true;
        chooseA.disabled = true;
        chooseB.disabled = true;
        nextButton.disabled = true;
        resetButton.disabled = true;
        retryData.hidden = false;
        progress.textContent = 'Paintings unavailable';
        message.textContent = 'Could not load paintings or artwork information. Retry loading the data.';
        console.error('Could not load paintings:', error);
    }
}
async function sendPendingChoice() {
    const index = currentIndex;
    const event = events[index];
    const activeRound = roundId;
    if (!event || synced[index] || sending || !collectionConfig.endpoint) return;
    sending = true;
    render();
    try {
        const response = await fetch(collectionConfig.endpoint.replace(/\/$/, '') + '/choices', {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event)
        });
        const body = await response.json();
        if (!response.ok || body.ok !== true || body.id !== event.id) throw new Error(body.error || 'Save failed');
        if (roundId !== activeRound || events[index]?.id !== event.id) return;
        synced[index] = true;
        saveProgress();
        storageStatus.textContent = body.duplicate ? 'Choice was already safely saved online.' : 'Choice saved online.';
    } catch (error) {
        storageStatus.textContent = 'Online save failed. Your choice is kept in this browser. Use Retry saving choice.';
        console.warn('Online choice save failed:', error);
    } finally {
        sending = false;
        render();
    }
}
function choose(side) {
    if (pairs.length === 0 || currentIndex >= pairs.length) return;
    if (currentIndex < answers.length) return;
    if (!imgA.complete || !imgA.naturalWidth || !imgB.complete || !imgB.naturalWidth || !shownAt) return;

    answers.push(side);
    const pair = pairs[currentIndex];
    const chosenAt = new Date().toISOString();
    const elapsedMs = Math.max(0, Date.parse(chosenAt) - Date.parse(shownAt));
    events.push(consent ? {
        id: crypto.randomUUID(), sessionId, roundId,
        datasetVersion: collectionConfig.datasetVersion, pairId: pair.pair_id,
        position: currentIndex + 1, aArtworkId: pair.img_A.replace('.jpg', ''),
        bArtworkId: pair.img_B.replace('.jpg', ''), choice: side,
        layout: window.matchMedia('(max-width: 767.98px)').matches ? 'stacked' : 'side-by-side',
        shownAt, chosenAt, elapsedMs
    } : null);
    synced.push(!consent);
    if (!saveProgress() && consent) {
        answers.pop(); events.pop(); synced.pop();
        storageStatus.textContent = 'Browser storage is required for safe online retries. Free space or use browser-only mode.';
        return;
    }
    render();
    if (consent) sendPendingChoice();
}

function nextPair() {
    if (currentIndex >= answers.length) return;
    if (consent && !synced[currentIndex]) return;

    currentIndex += 1;
    saveProgress();
    render();
}
function resetRound() {
    if (pairs.length === 0) return;
    if (sending || (consent && synced.some(value => !value))) {
        storageStatus.textContent = 'Finish saving the pending choice before restarting this round.';
        return;
    }
    answers = [];
    currentIndex = 0;
    roundId = crypto.randomUUID();
    consent = false;
    events = [];
    synced = [];
    shownAt = null;
    displayedIndex = -1;
    featureList.replaceChildren();
    disagreementList.replaceChildren();
    roundUserJudges.textContent = "";
    roundUserModel.textContent = "";
    roundModelJudges.textContent = "";
    try {
        localStorage.removeItem(STORAGE_KEY);
        storageStatus.textContent = 'New round started. Previously received online choices remain saved.';
    } catch (error) {
        storageStatus.textContent = 'Round restarted, but old saved progress could not be removed. Refreshing may restore it.';
        console.warn('Could not remove saved progress:', error);
    }
    render();
}
function signed(value) {
    if (value > 0) {
        return "+" + value.toFixed(3);
    } else {
        return value.toFixed(3);
    }
}
function featureText(feature) {
    const label = FEATURE_LABELS[feature.name] || feature.name;
    let comparison = 'A and B have the same value';
    if (feature.delta > 0) comparison = 'A has a higher value';
    if (feature.delta < 0) comparison = 'B has a higher value';
    return `${label}: ${comparison}. ` +
        `A - B: ${signed(feature.delta)}; ` +
        `scaled A - B: ${signed(feature.scaled_delta)}.`;
}

function renderFeatures(pair) {
    featureList.replaceChildren();
    for (const feature of pair.top_features) {
        const li = document.createElement('li');
        li.className = 'feature-' + feature.group;
        li.textContent = `[${GROUP_LABELS[feature.group]}] ` + featureText(feature);
        featureList.append(li);

    }
}
function modelJudgeText() {
    let matches = 0;
    let total = 0;
    for (const pair of pairs) {
        const judge = preferredSide(pair.q_A);
        const model = preferredSide(pair.model_q_A);
        if (judge === 'Tie' || model === 'Tie') continue;
        total += 1;
        if (judge === model) matches += 1;
    }
    if (total === 0) {
        return "No comparisons yet";
    }

    return `${matches}/${total} `
        + `(${(100 * matches / total).toFixed(1)}%)`;
}
function getDisagreements() {
    const items = [];
    for (let i = 0; i < answers.length; i += 1) {
        const pair = pairs[i];
        const judge = preferredSide(pair.q_A);
        if (judge === 'Tie' || answers[i] === judge) continue;
        const score = answers[i] === 'A' ? 1 - pair.q_A : pair.q_A;
        items.push({ pair, user: answers[i], index: i, score });
    }
    items.sort((a, b) => b.score - a.score || a.index - b.index);
    return items.slice(0, 3);

}
function appendReview(item) {
    const article = document.createElement("article");
    article.className = "review-item";

    const heading = document.createElement("h3");
    heading.textContent = `Pair ${item.index + 1}`;

    const detail = document.createElement("p");
    detail.textContent =
        `You: ${item.user}. AI judges: `
        + preferenceText(item.pair.q_A, "weighted support");

    const images = document.createElement("div");
    images.className = "review-pair";

    for (const side of ["A", "B"]) {
        const figure = document.createElement("figure");

        const caption = document.createElement("figcaption");
        const info = artworkInfo(item.pair['img_' + side]);
        caption.textContent = info ? `Painting ${side}: ${info.title}` : `Painting ${side}`;

        const img = document.createElement("img");
        img.src = "img/" + item.pair["img_" + side];
        img.alt = info ? `Painting ${side}: ${info.title}. ${info.visualAlt}`
            : `Painting ${side} from pair ${item.index + 1}`;

        figure.append(caption, img);
        images.append(figure);
    }

    article.append(heading, detail, images);
    disagreementList.append(article);
}
function renderSummary() {
    roundUserJudges.textContent = agreementText("q_A");
    roundUserModel.textContent = agreementText("model_q_A");
    roundModelJudges.textContent = modelJudgeText();

    disagreementList.replaceChildren();

    const items = getDisagreements();

    if (items.length === 0) {
        const p = document.createElement("p");
        p.textContent =
            "No disagreements with the AI judges in this round.";

        disagreementList.append(p);
        return;
    }

    for (const item of items) {
        appendReview(item);
    }
}
chooseA.addEventListener("click", () => choose("A"));
chooseB.addEventListener("click", () => choose("B"));
nextButton.addEventListener("click", nextPair);
resetButton.addEventListener("click", resetRound);
retrySave.addEventListener('click', sendPendingChoice);
retryData.addEventListener('click', loadPairs);
retryImages.addEventListener('click', () => {
    if (pairs[currentIndex]) setPairImages(pairs[currentIndex], true);
});
contribute.addEventListener('change', () => {
    if (answers.length) return;
    consent = contribute.checked;
    saveProgress();
    render();
});
for (const img of [imgA, imgB]) {
    img.addEventListener('load', updateImageState);
    img.addEventListener('error', () => { imageFailure = true; updateImageState(); });
}
loadPairs();
