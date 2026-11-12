
// DECLARING STUFF

const searchInput = document.getElementById("enemy-search");
const suggestions = document.getElementById("suggestions");
const guessButton = document.getElementById("guess-button");
const guessResults = document.getElementById("guess-results");
const louieHintButton = document.getElementById("louie-hint");
const silhouetteHintButton = document.getElementById("silhouette-hint");
const louieNoteDisplay = document.getElementById("louie-note-display");
const silhouetteDisplay = document.getElementById("silhouette-display");
const guessCounter = document.getElementById("guess-counter");
const shareButton = document.getElementById("share-button");
const helpButton = document.getElementById("help-button");
const helpDialog = document.getElementById("help-dialog");
const closeHelpButton = document.getElementById("close-help");
const guessedEnemies = new Set();

let targetEnemy = null;
let selectedEnemy = null;
let gameOver = false;
let louieHintRevealed = false;
let silhouetteHintRevealed = false;
let highlightedSuggestion = -1;
let countdownInterval = null;
let weightValues = [];
let enemies = [];

const attackNames = {
    "A": "Passive",
    "B": "Eats",
    "C": "Freezes",
    "D": "Blows",
    "E": "Splashes",
    "F": "Crushes",
    "G": "Posions",
    "H": "Shocks",
    "I": "Burns",
    "J": "Shoots",
    "K": "Bubbles",
    "L": "Confuses",
    "M": "Panics",
    "N": "Buries",
    "O": "Glooms",
    "P": "Stabs",
    "Q": "Drowns",
    "R": "Launches Projectiles",
    "S": "Spawns Enemies",
    "T": "Traps",
    "U": "Explodes",
    "V": "Knocks Back",
    "W": "Revives Enemies",
    "X": "Withers",
    "Y": "Kills..?",
};

const movementNames = {
    "N": "Ground",
    "G": "Underground",
    "W": "Water Surface",
    "U": "Underwater",
    "A": "Air",
    "M": "Mud",
};

// FUNCTIONS

function translateAttributes(codes, lookupTable) {
    return codes.map(code => lookupTable[code] ?? code).join(", ");
}

function getTodayKey() { // The one that gets today's enemy
    return new Date().toISOString().slice(0, 10);
    // return "2026-12-11"; // for testing only
}

function updateGuessCounter() { // The one that updates the guess counter (and like, the stuff associated with it)
    const count = guessedEnemies.size;

    let message = `Guesses: ${count}`;

    if (count < 3) {
        message += ` | Louie's hint in ${3 - count}`;
    } else if (count < 6) {
        message += ` | Silhouette hint in ${6 - count}`;
    } else {
        message += " | All hints unlocked";
    }

    guessCounter.textContent = message;
}

function updateCountdown() { // The one that updates the countdown for the next day
    const now = new Date();

    const nextMidnight = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1
    );

    const remaining = Math.max(0, nextMidnight - now.getTime());

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    const format = value => String(value).padStart(2, "0");

    document.getElementById("countdown").textContent =
        `${format(hours)}:${format(minutes)}:${format(seconds)}`;

    if (remaining === 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        document.getElementById("countdown").textContent =
            "New enemy available!";
    }
}

function showNextEnemyTimer() { // The one that makes the timer visible after game end
    document.getElementById("next-enemy-timer").hidden = false;

    updateCountdown();

    if (countdownInterval === null) {
        countdownInterval = setInterval(updateCountdown, 1000);
    }
}

function seededRandom(seed) { // The RNG one
    return function() {
        seed |= 0;
        seed = (seed + 0x6D2B79F5) | 0;

        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function updateHints() { // The one that makes the hints usable
    const guessCount = guessedEnemies.size;

    louieHintButton.disabled = guessCount < 3;
    silhouetteHintButton.disabled = guessCount < 6;
    updateGuessCounter();
}

function revealLouieHint() { // The Louie one
    if (louieHintButton.disabled || louieHintRevealed) return;

    louieHintRevealed = true;

    louieHintButton.classList.add("used");
    louieHintButton.textContent = "Louie's... Help? (Revealed)";

    
    const container = document.createElement("div");
    container.classList.add("louie-hint-content");

    const image = document.createElement("img");
    image.src = "./images/Louie.png";
    image.alt = "Louie";
    image.classList.add("louie-image");

    const note = document.createElement("p");
    note.classList.add("louie-speech");
    note.textContent = targetEnemy.louieNote || "No note available.";

    container.appendChild(image);
    container.appendChild(note);

    louieNoteDisplay.appendChild(container);


    saveProgress();
}

function revealSilhouetteHint() { // The silhouette one
    if (silhouetteHintButton.disabled || silhouetteHintRevealed) return;

    silhouetteHintRevealed = true;

    silhouetteHintButton.classList.add("used");
    silhouetteHintButton.textContent = "Silhouette (Revealed)";

    const image = document.createElement("img");
    image.src = `./images/${targetEnemy.id}.png`;
    image.alt = "Mystery enemy silhouette";
    image.classList.add("enemy-silhouette");

    silhouetteDisplay.appendChild(image);

    saveProgress();
}

function shuffleEnemies(enemies, seed) { // The one that makes it so we're not repeating enemies
    const shuffled = [...enemies];
    const random = seededRandom(seed);

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));

        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

function getDailyEnemy(enemies) { // The one that gets the daily enemy
    const startDate = Date.UTC(2026, 10, 9);
    const today = Date.parse(getTodayKey());

    const daysSinceStart = Math.floor(
        (today - startDate) / 86400000
    );

    const cycleNumber = Math.floor(daysSinceStart / enemies.length);

    const dayInCycle =
        ((daysSinceStart % enemies.length) + enemies.length) % enemies.length;

    const seed = 123456 + cycleNumber;

    const shuffledEnemies = shuffleEnemies(enemies, seed);

    return shuffledEnemies[dayInCycle];
}

async function loadEnemies() { // The one that gets the enemy list and stuff

    const response = await fetch("./data/enemies.json");

    if (!response.ok) {
        throw new Error("Could not load enemy database.");
    }

    enemies = await response.json();

    weightValues = [...new Set(
        enemies.map(enemy => enemy.weight)
    )].sort((a, b) => a - b);
    targetEnemy = getDailyEnemy(enemies);
    //targetEnemy = enemies.find(enemy => enemy.id === 107); // for testing only

    loadProgress();

    console.log(`Loaded ${enemies.length} enemies!`);
    console.log(enemies[0]);
}

function compareExact(guessedValue, targetValue) { // The one that checks if you're right
    if (guessedValue === targetValue) {
        return "correct";
    }

    return "incorrect";
}

function compareSets(guessedValues, targetValues) { // The one that compares the attributes
    const guessedSet = new Set(guessedValues);
    const targetSet = new Set(targetValues);

    const exactMatch =
        guessedSet.size === targetSet.size &&
        [...guessedSet].every(value => targetSet.has(value));

    if (exactMatch) {
        return "correct";
    }

    const partialMatch =
        [...guessedSet].some(value => targetSet.has(value));

    if (partialMatch) {
        return "partial";
    }

    return "incorrect";
}

function compareWeight(guessedWeight, targetWeight) { // The other one that compares the attributes
    const guessedIndex = weightValues.indexOf(guessedWeight);
    const targetIndex = weightValues.indexOf(targetWeight);

    const difference = Math.abs(guessedIndex - targetIndex);

    if (difference === 0) {
        return "correct";
    }

    if (difference <= 2) {
        return "partial";
    }

    return "incorrect";
}

function compareHealth(guessedHealth, targetHealth) { // The yet another one that compares the attributes
    if (guessedHealth === targetHealth) {
        return "correct";
    }

    const difference = Math.abs(guessedHealth - targetHealth);
    const percentageThreshold = targetHealth * 0.50;

    if (difference <= 100 || difference <= percentageThreshold) {
        return "partial";
    }

    return "incorrect";
}

function getDirection(guessedValue, targetValue) { // The one that compares health and weight with arrows
    if (guessedValue < targetValue) {
        return "↑";
    }

    if (guessedValue > targetValue) {
        return "↓";
    }

    return "";
}

function submitGuess() { // The one that... Submits the guess!

    if (gameOver) {
        return;
    }

    if (targetEnemy === null) {
        alert("Enemy database is still loading.");
        return;
    }

    if (selectedEnemy === null) {
        alert("Please select an enemy from the list.");
        return;
    }

    if (guessedEnemies.has(selectedEnemy.id)) {
        alert("You've already guessed this enemy!");
        return;
    }

    guessedEnemies.add(selectedEnemy.id);

    displayGuess(selectedEnemy);

    updateHints();

    if (selectedEnemy.id === targetEnemy.id) {
        handleVictory();
        showNextEnemyTimer();
    }

    saveProgress();

    selectedEnemy = null;
    searchInput.value = "";
    suggestions.innerHTML = "";
    searchInput.focus();
}

function displayGuess(enemy) { // The one that shows the guesses
    const row = document.createElement("tr");

    const attributes = [
        {
            value: enemy.name,
            result: compareExact(enemy.id, targetEnemy.id)
        },
        {
            value: enemy.family,
            result: compareExact(enemy.family, targetEnemy.family)
        },
        {
            value: enemy.appearances.join(", "),
            result: compareSets(enemy.appearances, targetEnemy.appearances)
        },
        {
            value: `${enemy.weight === 0 ? "N/A" : enemy.weight} ${getDirection(enemy.weight, targetEnemy.weight)}`,
            result: compareWeight(enemy.weight, targetEnemy.weight)
        },
        {
            value: `${enemy.health} ${getDirection(enemy.health, targetEnemy.health)}`,
            result: compareHealth(enemy.health, targetEnemy.health)
        },
        {
            value: translateAttributes(enemy.attacks, attackNames),
            result: compareSets(enemy.attacks, targetEnemy.attacks)
        },
        {
            value: translateAttributes(enemy.habitat, movementNames),
            result: compareSets(enemy.habitat, targetEnemy.habitat)
        }
    ];

    attributes.forEach((attribute, index) => {
        const cell = document.createElement("td");

        cell.classList.add(index === 0 ? "neutral" : attribute.result);

        if (index === 0) {
            const container = document.createElement("div");
            container.classList.add("enemy-cell");

            const image = document.createElement("img");
            image.src = `./images/${enemy.id}.png`;
            image.alt = enemy.name;
            image.classList.add("enemy-image");

            const name = document.createElement("span");
            name.textContent = enemy.name;

            container.appendChild(image);
            container.appendChild(name);

            cell.appendChild(container);
        } else {
            cell.textContent = attribute.value;
        }

        row.appendChild(cell);
    });


    guessResults.prepend(row);
}

function getPuzzleNumber() { // The one that I probably overengineered
    const startDate = Date.UTC(2026, 10, 9);
    const today = Date.parse(getTodayKey());

    return Math.floor((today - startDate) / 86400000) + 1;
}

function getShareRow(enemy) { // The one that gets what's in the ctrl C for sharing
    return [
        resultEmoji(compareExact(enemy.family, targetEnemy.family)),
        resultEmoji(compareSets(enemy.appearances, targetEnemy.appearances)),
        resultEmoji(compareWeight(enemy.weight, targetEnemy.weight)),
        resultEmoji(compareHealth(enemy.health, targetEnemy.health)),
        resultEmoji(compareSets(enemy.attacks, targetEnemy.attacks)),
        resultEmoji(compareSets(enemy.habitat, targetEnemy.habitat))
    ].join("");
}

function resultEmoji(result) { // The emoji one (for sharing)
    const emojis = {
        correct: "🟩",
        partial: "🟨",
        incorrect: "🟥"
    };

    return emojis[result];
}

async function shareResults() { // The one that gets the ctrl C for sharing
    if (!gameOver || !targetEnemy) return;

    const guesses = [...guessedEnemies]
        .map(id => enemies.find(enemy => enemy.id === id))
        .filter(Boolean);

    const guessCount = guesses.length;

    const hintsUsed =
        Number(louieHintRevealed) +
        Number(silhouetteHintRevealed);

    const rows = guesses.reverse().map(enemy => getShareRow(enemy));

    const result = [
        `Pikmindle #${getPuzzleNumber()} — ${guessCount} ${guessCount === 1 ? "guess" : "guesses"}, ${hintsUsed} ${hintsUsed === 1 ? "hint" : "hints"}`,,
        ...rows,
        "",
        "https://pikmindle.com/"
    ].join("\n");

    try {
        await navigator.clipboard.writeText(result);
        shareButton.textContent = "Copied!";
    } catch (error) {
        console.error("Could not copy results:", error);
        shareButton.textContent = "Copy failed";
    }
}

function handleVictory() { // The one that happens when you win
    gameOver = true;
    shareButton.hidden = false;

    const victoryMessage = document.getElementById("victory-message");
    const guessCount = guessedEnemies.size;

    victoryMessage.textContent =
        `Congratulations! You found ${targetEnemy.name} in ${guessCount} ${guessCount === 1 ? "guess" : "guesses"}!`;

    searchInput.disabled = true;
    guessButton.disabled = true;
    suggestions.innerHTML = "";
}

function saveProgress() { // The one that keeps the stuff memorized
    const progress = {
        date: getTodayKey(),
        guesses: [...guessedEnemies],
        gameOver: gameOver,
        louieHintRevealed: louieHintRevealed,
        silhouetteHintRevealed: silhouetteHintRevealed
    };

    localStorage.setItem("pikmindle-progress", JSON.stringify(progress));
}

function loadProgress() { // The one that remembers
    const savedData = localStorage.getItem("pikmindle-progress");

    if (!savedData) {
        return;
    }

    const progress = JSON.parse(savedData);

    if (progress.date !== getTodayKey()) {
        localStorage.removeItem("pikmindle-progress");
        return;
    }

    progress.guesses.forEach(id => {
        const enemy = enemies.find(enemy => enemy.id === id);

        if (enemy) {
            guessedEnemies.add(enemy.id);
            displayGuess(enemy);
        }
    });

    if (progress.gameOver) {
        handleVictory();
        showNextEnemyTimer();
    }

    updateHints();

    if (progress.louieHintRevealed) {
        revealLouieHint();
    }

    if (progress.silhouetteHintRevealed) {
        revealSilhouetteHint();
    }
}

// EVENT LISTENERS

guessButton.addEventListener("click", submitGuess);

louieHintButton.addEventListener("click", revealLouieHint);

silhouetteHintButton.addEventListener("click", revealSilhouetteHint);

shareButton.addEventListener("click", shareResults);

helpButton.addEventListener("click", () => {
    helpDialog.showModal();
});

closeHelpButton.addEventListener("click", () => {
    helpDialog.close();
});

searchInput.addEventListener("keydown", function(event) {
    const options = [...suggestions.querySelectorAll(".suggestion")];

    if (event.key === "ArrowDown") {
        if (options.length === 0) return;

        event.preventDefault();

        highlightedSuggestion =
            (highlightedSuggestion + 1) % options.length;

    } else if (event.key === "ArrowUp") {
        if (options.length === 0) return;

        event.preventDefault();

        highlightedSuggestion =
            (highlightedSuggestion - 1 + options.length) % options.length;

    } else if (event.key === "Enter") {
        event.preventDefault();

        if (highlightedSuggestion >= 0 && options.length > 0) {
            options[highlightedSuggestion].click();
        } else {
            submitGuess();
        }

        return;
    } else {
        return;
    }

    options.forEach((option, index) => {
        option.classList.toggle(
            "highlighted",
            index === highlightedSuggestion
        );
    });

    options[highlightedSuggestion].scrollIntoView({
        block: "nearest"
    });
});

searchInput.addEventListener("input", function () { 
    const searchText = searchInput.value.toLowerCase().trim();
    highlightedSuggestion = -1;

    suggestions.innerHTML = "";

    if (searchText === "") {
        return;
    }
    
    const matches = enemies
        .filter(enemy =>
            enemy.name.toLowerCase().includes(searchText) &&
            !guessedEnemies.has(enemy.id)
        )
        
        .sort((a, b) => {
            function getMatchPriority(name) {
                name = name.toLowerCase();

                if (name.startsWith(searchText)) {
                    return 0;
                }

                const words = name.split(/\s+/);

                if (words.some(word => word.startsWith(searchText))) {
                    return 1;
                }

                return 2;
            }

            const priorityA = getMatchPriority(a.name);
            const priorityB = getMatchPriority(b.name);

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            return a.name.localeCompare(b.name);
        });

    matches.forEach(enemy => {
        const option = document.createElement("div");
        option.classList.add("suggestion");

        const image = document.createElement("img");
        image.src = `./images/${enemy.id}.png`;
        image.alt = enemy.name;
        image.classList.add("suggestion-image");

        const name = document.createElement("span");
        name.textContent = enemy.name;

        option.appendChild(image);
        option.appendChild(name);

        
        option.addEventListener("click", function () {
            selectedEnemy = enemy;
            searchInput.value = enemy.name;
            suggestions.innerHTML = "";
        });


        suggestions.appendChild(option);
    });
});

loadEnemies().catch(console.error);