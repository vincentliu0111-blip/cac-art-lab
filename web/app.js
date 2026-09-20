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
const storageStatus = document.querySelector("#StorageStatuts");

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
function render() {
    const finished = currentIndex === pairs.length;

    pairArea.hidden = finished;
    results.hidden = true;
    nextButton.hidden = finished;

    if (finished) {
        // progress.textContent = 'Round complete';
        // message.textContent = 'You have compared every pair. Thank you!';
        return;
    }

    const pair = pairs[currentIndex];
    const answered = currentIndex < answers.length;

    imgA.src = 'img/' + pair.img_A;
    imgB.src = 'img/' + pair.img_B;
    // progress.textContent = `Pair ${currentIndex + 1} of ${pairs.length}`;

    // message.textContent = answered
    // ? 'Choice saved for this round.'
    // : 'Choose a painting to reveal the results.';

    chooseA.disabled = answered;
    chooseB.disabled = answered;
    nextButton.disabled = !answered;

    nextButton.textContent = currentIndex === pairs.length - 1
        ? 'Finish round' : 'Next pair';

    if (answered) reveal();
}
async function loadPairs() {
    const response = await fetch("./app_data.json");
    if (!response.ok) {
        throw new Error(`HTTP${response.status}`);
    }
    pairs = await response.json();
    render();
}
function choose(side) {
    if (pairs.length === 0 || currentIndex >= pairs.length) return;
    if (currentIndex < answers.length) return;

    answers.push(side);
    render();
}

function nextPair() {
    if (currentIndex >= answers.length) return;

    currentIndex += 1;
    render();
}
chooseA.addEventListener("click", () => choose("A"));
chooseB.addEventListener("click", () => choose("B"));
nextButton.addEventListener("click", nextPair);
loadPairs();