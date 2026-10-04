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
const STORAGE_KEY = 'cac-art-lab-progress';
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
            pairIds: pairs.map(pair => pair.pair_id)
        }));
        storageStatus.textContent = 'Progress saved in this browser.';
    } catch (error) {
        storageStatus.textContent = 'Progress could not be saved. You can continue, but refreshing may lose this round.';
        console.warn('Could not save progress:', error);
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
        storageStatus.textContent = 'Saved progress restored.';
    } catch (error) {
        answers = [];
        currentIndex = 0;
        storageStatus.textContent = 'Saved progress could not be restored. Choose a painting to start again, or use Restart round.';
        console.warn('Could not restore progress:', error);
    }
}
function render() {
    const finished = currentIndex === pairs.length;
    roundSummary.hidden = !finished;
    renderStats();

    pairArea.hidden = finished;
    results.hidden = true;
    nextButton.hidden = finished;

    if (finished) {
        progress.textContent = 'Round complete';
        message.textContent = 'You have compared every pair. Review your final statistics or restart the round.';
        renderSummary();
        return;
    }

    const pair = pairs[currentIndex];
    const answered = currentIndex < answers.length;

    imgA.src = 'img/' + pair.img_A;
    imgB.src = 'img/' + pair.img_B;
    progress.textContent = `Pair ${currentIndex + 1} of ${pairs.length}`;

    message.textContent = answered
        ? 'Choice recorded. Continue to the next pair.'
        : 'Choose a painting to reveal the results.';

    chooseA.disabled = answered;
    chooseB.disabled = answered;
    nextButton.disabled = !answered;

    nextButton.textContent = currentIndex === pairs.length - 1
        ? 'Finish round' : 'Next pair';

    if (answered) reveal();
}
async function loadPairs() {
    try {
        const response = await fetch("./app_data.json");
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        pairs = await response.json();
        // pairs.length = 5
        if (!Array.isArray(pairs) || pairs.length === 0) {
            throw new Error('No painting pairs were loaded.');
        }
        restoreProgress();
        resetButton.disabled = false;
        render();
    } catch (error) {
        pairs = [];
        roundSummary.hidden = true;
        pairArea.hidden = true;
        results.hidden = true;
        chooseA.disabled = true;
        chooseB.disabled = true;
        nextButton.disabled = true;
        resetButton.disabled = true;
        progress.textContent = 'Paintings unavailable';
        message.textContent = 'Could not load paintings. Check the preview address and refresh to try again.';
        console.error('Could not load paintings:', error);
    }
}
function choose(side) {
    if (pairs.length === 0 || currentIndex >= pairs.length) return;
    if (currentIndex < answers.length) return;

    answers.push(side);
    saveProgress();
    render();
}

function nextPair() {
    if (currentIndex >= answers.length) return;

    currentIndex += 1;
    saveProgress();
    render();
}
function resetRound() {
    if (pairs.length === 0) return;
    answers = [];
    currentIndex = 0;
    featureList.replaceChildren();
    disagreementList.replaceChildren();
    roundUserJudges.textContent = "";
    roundUserModel.textContent = "";
    roundModelJudges.textContent = "";
    try {
        localStorage.removeItem(STORAGE_KEY);
        storageStatus.textContent = 'Round restarted. No saved answers.';
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
        caption.textContent = "Painting " + side;

        const img = document.createElement("img");
        img.src = "img/" + item.pair["img_" + side];
        img.alt =
            "Painting " + side + " from pair " + (item.index + 1);

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
loadPairs();

