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
const STORAGE_KEY = 'cac-art-lab-progress';

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
    renderStats();

    pairArea.hidden = finished;
    results.hidden = true;
    nextButton.hidden = finished;

    if (finished) {
        progress.textContent = 'Round complete';
        message.textContent = 'You have compared every pair. Review your final statistics or restart the round.';
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
        if (!Array.isArray(pairs) || pairs.length === 0) {
            throw new Error('No painting pairs were loaded.');
        }
        restoreProgress();
        resetButton.disabled = false;
        render();
    } catch (error) {
        pairs = [];
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
    try {
        localStorage.removeItem(STORAGE_KEY);
        storageStatus.textContent = 'Round restarted. No saved answers.';
    } catch (error) {
        storageStatus.textContent = 'Round restarted, but old saved progress could not be removed. Refreshing may restore it.';
        console.warn('Could not remove saved progress:', error);
    }
    render();
}
chooseA.addEventListener("click", () => choose("A"));
chooseB.addEventListener("click", () => choose("B"));
nextButton.addEventListener("click", nextPair);
resetButton.addEventListener("click", resetRound);
loadPairs();
