// --- 1. Photos (CSV読み込み ＋ ユーザー投稿機能 ＋ いいね ＋ モーダル) ---
let likedPhotos = JSON.parse(localStorage.getItem("natsumu_liked_photos")) || {};
let customPhotos = JSON.parse(localStorage.getItem("natsumu_custom_photos")) || [];

fetch("works.csv")
    .then(function(response) {
        return response.text();
    })
    .then(function(data) {
        var rows = data.trim().split("\n");
        if (rows.length < 2) return;
        var headers = rows[0].split(",").map(function(h) { return h.trim(); });

        var csvWorks = rows.slice(1).map(function(row) {
            var values = row.split(",").map(function(v) { return v.trim(); });
            var work = {};
            headers.forEach(function(header, index) {
                work[header] = values[index] || "";
            });
            return work;
        }).filter(function(work) {
            return work.image && work.title;
        });

        // CSVの作品とユーザーが投稿した作品を合体
        var works = customPhotos.concat(csvWorks);

        var grid = document.getElementById("works-grid");
        var categorySelect = document.getElementById("category");
        var sortSelect = document.getElementById("sort");

        var photoModal = document.getElementById("photo-modal");
        var modalImg = document.getElementById("modal-img");
        var modalTitle = document.getElementById("modal-title");
        var modalDesc = document.getElementById("modal-desc");
        var modalClose = document.getElementById("modal-close");

        // フォーム要素
        var uploadForm = document.getElementById("photo-upload-form");
        var uploadFile = document.getElementById("upload-file");
        var uploadTitle = document.getElementById("upload-title");
        var uploadCategory = document.getElementById("upload-category");
        var uploadDesc = document.getElementById("upload-desc");
        var uploadYear = document.getElementById("upload-year");

        function updateCategories() {
            // 既存のカテゴリ選択肢をいったんクリア（最初の2つ以外）
            while (categorySelect.options.length > 2) {
                categorySelect.remove(2);
            }
            var categories = [];
            works.forEach(function(work) {
                if (work.category && !categories.includes(work.category)) {
                    categories.push(work.category);
                }
            });
            categories.forEach(function(category) {
                var option = document.createElement("option");
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        }

        function displayWorks() {
            var selectedCategory = categorySelect.value;
            var sortType = sortSelect.value;
            var filteredWorks = works.slice();

            if (selectedCategory === "liked") {
                filteredWorks = filteredWorks.filter(function(work) {
                    return !!likedPhotos[work.image];
                });
            } else if (selectedCategory !== "all") {
                filteredWorks = filteredWorks.filter(function(work) {
                    return work.category === selectedCategory;
                });
            }

            if (sortType === "new") {
                filteredWorks.sort(function(a, b) {
                    return Number(b.year) - Number(a.year);
                });
            } else if (sortType === "old") {
                filteredWorks.sort(function(a, b) {
                    return Number(a.year) - Number(b.year);
                });
            } else if (sortType === "title") {
                filteredWorks.sort(function(a, b) {
                    return a.title.localeCompare(b.title, "ja");
                });
            }
            
            grid.innerHTML = "";

            if (filteredWorks.length === 0) {
                grid.innerHTML = '<p style="color:#666; font-size:14px;">該当する写真がありません。</p>';
                return;
            }

            filteredWorks.forEach(function(work) {
                var card = document.createElement("article");
                card.className = "work-card";
                var isLiked = !!likedPhotos[work.image];

                card.innerHTML =
                    '<img src="' + work.image + '" alt="' + work.title + '" onerror="this.src=\'https://placehold.co/600x450?text=Image+Error\';">' +
                    '<div class="work-info">' +
                        '<p class="work-category">' + work.category + '</p>' +
                        '<h4>' + work.title + '</h4>' +
                        '<p>' + work.description + '</p>' +
                        '<p class="work-year">' + work.year + '</p>' +
                    '</div>' +
                    '<button class="like-btn ' + (isLiked ? 'liked' : '') + '" title="いいね！">' +
                        (isLiked ? '♥ いいね済' : '♡ いいね') +
                    '</button>';

                var likeBtn = card.querySelector(".like-btn");
                likeBtn.addEventListener("click", function(e) {
                    e.stopPropagation();
                    if (likedPhotos[work.image]) {
                        delete likedPhotos[work.image];
                    } else {
                        likedPhotos[work.image] = true;
                    }
                    localStorage.setItem("natsumu_liked_photos", JSON.stringify(likedPhotos));
                    displayWorks();
                });

                card.addEventListener("click", function() {
                    modalImg.src = work.image;
                    modalTitle.textContent = work.title;
                    modalDesc.textContent = (work.description || "") + " (" + work.year + ")";
                    photoModal.classList.add("active");
                });

                grid.appendChild(card);
            });
        }

        updateCategories();
        displayWorks();

        categorySelect.addEventListener("change", displayWorks);
        sortSelect.addEventListener("change", displayWorks);

        // 写真投稿フォームの送信処理
        uploadForm.addEventListener("submit", function(e) {
            e.preventDefault();
            var file = uploadFile.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function(event) {
                var newPhoto = {
                    image: event.target.result,
                    category: uploadCategory.value.trim(),
                    title: uploadTitle.value.trim(),
                    description: uploadDesc.value.trim() || "投稿された写真",
                    year: uploadYear.value.trim() || "2026",
                    link: "#"
                };

                // 配列の先頭に追加してLocalStorageに保存
                customPhotos.unshift(newPhoto);
                works.unshift(newPhoto);
                localStorage.setItem("natsumu_custom_photos", JSON.stringify(customPhotos));

                // フォームをリセットして再描画
                uploadForm.reset();
                uploadYear.value = "2026";
                updateCategories();
                displayWorks();
                alert("新しい写真を投稿しました！");
            };
            reader.readAsDataURL(file);
        });

        modalClose.addEventListener("click", function() {
            photoModal.classList.remove("active");
        });
        photoModal.addEventListener("click", function(e) {
            if (e.target === photoModal) {
                photoModal.classList.remove("active");
            }
        });
    });
// --- 2. 天気予報API取得 & 釣りゲーム連動 ---
var latitude = 35.6895;
var longitude = 139.6917;

var weatherUrl =
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=" + latitude +
    "&longitude=" + longitude +
    "&current=temperature_2m,weather_code" +
    "&timezone=Asia%2FTokyo";

fetch(weatherUrl)
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        var weatherCode = data.current.weather_code;
        showWeather(weatherCode);
    });

function showWeather(code) {
    var icon = document.getElementById("weather-icon");
    if (code === 0) {
        icon.textContent = "☀︎";
        document.body.className = "weather-sunny";
    } else if (code >= 1 && code <= 3) {
        icon.textContent = "☁︎";
        document.body.className = "weather-cloudy";
    } else if (code >= 51 && code <= 67) {
        icon.textContent = "☔︎";
        document.body.className = "weather-rainy";
    } else {
        icon.textContent = "☁︎";
        document.body.className = "weather-cloudy";
    }
    checkWeatherBonus();
}


// --- 3. 釣りミニゲームのロジック（全15種・魚種別挙動） ---
function getFishSVG(type, colorMain, colorSub) {
    if (type === "squid") {
        return `<svg width="64" height="40" viewBox="0 0 80 50">
            <path d="M25,15 L55,8 L72,25 L55,42 L25,35 Z" fill="${colorMain}" stroke="#111" stroke-width="2"/>
            <path d="M25,18 L5,14 M25,22 L3,21 M25,28 L3,29 M25,32 L5,36" stroke="${colorMain}" stroke-width="3" stroke-linecap="round"/>
            <circle cx="30" cy="21" r="2.5" fill="#111"/>
            <circle cx="30" cy="29" r="2.5" fill="#111"/>
        </svg>`;
    } else if (type === "flat") {
        return `<svg width="64" height="40" viewBox="0 0 80 50">
            <ellipse cx="42" cy="25" rx="28" ry="16" fill="${colorMain}" stroke="#111" stroke-width="2"/>
            <polygon points="14,25 3,15 3,35" fill="${colorSub}" stroke="#111" stroke-width="2"/>
            <circle cx="58" cy="21" r="2.2" fill="#111"/>
            <circle cx="56" cy="27" r="2.2" fill="#111"/>
            <circle cx="40" cy="20" r="1.5" fill="${colorSub}"/>
            <circle cx="32" cy="28" r="1.5" fill="${colorSub}"/>
        </svg>`;
    } else if (type === "tuna" || type === "salmon") {
        return `<svg width="70" height="42" viewBox="0 0 90 50">
            <path d="M18,25 Q45,5 82,25 Q45,45 18,25 Z" fill="${colorMain}" stroke="#111" stroke-width="2"/>
            <path d="M22,25 Q48,16 80,25 Q48,38 22,25 Z" fill="${colorSub}"/>
            <polygon points="18,25 4,10 10,25 4,40" fill="${colorMain}" stroke="#111" stroke-width="2"/>
            <polygon points="48,13 42,4 54,13" fill="${colorSub}" stroke="#111" stroke-width="1.5"/>
            <circle cx="70" cy="22" r="2.5" fill="#111"/>
        </svg>`;
    } else if (type === "oarfish" || type === "seahorse") {
        return type === "seahorse" ? 
        `<svg width="50" height="40" viewBox="0 0 60 50">
            <path d="M30,10 Q40,15 35,25 Q30,35 25,40 Q20,45 25,48 Q32,45 35,38" fill="none" stroke="${colorMain}" stroke-width="4" stroke-linecap="round"/>
            <circle cx="28" cy="12" r="6" fill="${colorMain}" stroke="#111" stroke-width="1.5"/>
            <circle cx="26" cy="11" r="1.5" fill="#111"/>
        </svg>` :
        `<svg width="74" height="42" viewBox="0 0 95 50">
            <path d="M8,28 Q28,12 48,26 T86,22 Q72,34 48,32 T8,28 Z" fill="${colorMain}" stroke="#111" stroke-width="2"/>
            <path d="M78,19 L84,6 L74,17 L76,7 L68,18" fill="none" stroke="${colorSub}" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="78" cy="23" r="2.5" fill="#111"/>
        </svg>`;
    } else {
        return `<svg width="64" height="40" viewBox="0 0 80 50">
            <path d="M18,25 Q45,8 72,25 Q45,42 18,25 Z" fill="${colorMain}" stroke="#111" stroke-width="2"/>
            <polygon points="18,25 5,13 8,25 5,37" fill="${colorSub}" stroke="#111" stroke-width="2"/>
            <polygon points="44,15 36,7 52,15" fill="${colorSub}" stroke="#111" stroke-width="1.5"/>
            <circle cx="60" cy="22" r="2.5" fill="#111"/>
        </svg>`;
    }
}

const FISH_LIST = [
    { id: "aji", name: "マアジ", rarity: 1, svg: getFishSVG("normal", "#7ea8be", "#a8dadc"), zoneWidth: 28, speed: 1.1, erratic: false, desc: "防波堤の定番。まずはここから。" },
    { id: "iwashi", name: "マイワシ", rarity: 1, svg: getFishSVG("normal", "#90e0ef", "#caf0f8"), zoneWidth: 26, speed: 1.2, erratic: false, desc: "群れで泳ぐ銀色の小魚。" },
    { id: "saba", name: "マサバ", rarity: 1, svg: getFishSVG("normal", "#3d5a80", "#98c1d9"), zoneWidth: 24, speed: 1.35, erratic: false, desc: "引きが強く釣りごたえがある。" },
    { id: "kasago", name: "カサゴ", rarity: 1, svg: getFishSVG("normal", "#bc4749", "#f28482"), zoneWidth: 24, speed: 1.3, erratic: false, desc: "岩陰に潜む根魚の代表格。" },
    { id: "kisu", name: "シロギス", rarity: 1, svg: getFishSVG("normal", "#f8edeb", "#fcd5ce"), zoneWidth: 22, speed: 1.45, erratic: false, desc: "砂浜の女王と呼ばれる美しい魚。" },
    { id: "kumanomi", name: "クマノミ", rarity: 1, svg: getFishSVG("normal", "#ff7b00", "#ffffff"), zoneWidth: 25, speed: 1.25, erratic: false, desc: "南国の海からやってきた鮮やかなオレンジの小魚。" },
    { id: "tatsunootoshigo", name: "タツノオトシゴ", rarity: 1, svg: getFishSVG("seahorse", "#52b788", "#d8f3dc"), zoneWidth: 27, speed: 1.0, erratic: false, desc: "ゆったりと漂う、ユニークな姿の小型魚。" },

    { id: "madai", name: "マダイ", rarity: 2, svg: getFishSVG("normal", "#ff758f", "#ffb3c1"), zoneWidth: 14, speed: 2.1, erratic: false, desc: "魚の王様。力強い引きに注意！" },
    { id: "hirame", name: "ヒラメ", rarity: 2, svg: getFishSVG("flat", "#b08968", "#ddb892"), zoneWidth: 13, speed: 2.3, erratic: false, desc: "海底に潜む高級フラットフィッシュ。" },
    { id: "aoriika", name: "アオリイカ", rarity: 2, svg: getFishSVG("squid", "#f4a261", "#e76f51"), zoneWidth: 12, speed: 2.5, erratic: false, desc: "イカの王様。独特のジェット噴射。" },
    { id: "katsuo", name: "カツオ", rarity: 2, svg: getFishSVG("tuna", "#2b2d42", "#8d99ae"), zoneWidth: 12.5, speed: 2.4, erratic: false, desc: "勢いよく泳ぐ、一本釣りの名優。" },
    { id: "kanpachi", name: "カンパチ", rarity: 2, svg: getFishSVG("normal", "#e9c46a", "#f4a261"), zoneWidth: 11, speed: 2.6, erratic: false, desc: "力強い引きを誇る大型回遊魚。" },

    { id: "golden_salmon", name: "黄金のサーモン", rarity: 3, svg: getFishSVG("salmon", "#ffd700", "#ff4500"), zoneWidth: 7.0, speed: 3.2, erratic: true, desc: "【激ムズ】全身が黄金色に輝く、超低確率の幻のサケ！" },
    { id: "kuromaguro", name: "クロマグロ", rarity: 3, svg: getFishSVG("tuna", "#1d3557", "#457b9d"), zoneWidth: 6.0, speed: 3.5, erratic: true, desc: "【激ムズ】海の黒いダイヤ。超高速＆緩急をつけて暴れる！" },
    { id: "ryugu", name: "リュウグウノツカイ", rarity: 3, svg: getFishSVG("oarfish", "#e2e8f0", "#e63946"), zoneWidth: 5.0, speed: 3.9, erratic: true, desc: "【激ムズ】深海の神秘。極小ゾーンと変則スピードを制せ！" }
];

let gameState = "idle";
let currentFish = null;
let biteTimeout = null;
let animFrameId = null;
let cursorPos = 0;
let cursorDir = 1;
let zoneStart = 40;
let zoneWidth = 20;
let frameCounter = 0;
let isRainyBonus = false;
let fishMotionType = "normal";

let caughtData = JSON.parse(localStorage.getItem("natsumu_fishing_dex")) || {};

const fishingBoard = document.getElementById("fishing-board");
const castBtn = document.getElementById("cast-btn");
const hookBtn = document.getElementById("hook-btn");
const statusText = document.getElementById("fishing-status");
const bobber = document.getElementById("bobber");
const fishingLine = document.getElementById("fishing-line");
const waterRipples = document.getElementById("water-ripples");
const hitAlert = document.getElementById("hit-alert");
const timingContainer = document.getElementById("timing-container");
const targetZoneEl = document.getElementById("target-zone");
const cursorEl = document.getElementById("cursor");
const dexGrid = document.getElementById("fish-dex-grid");
const dexCountEl = document.getElementById("dex-count");
const resetDexBtn = document.getElementById("reset-dex-btn");

const weatherStatusCard = document.getElementById("weather-status-card");
const weatherBadgeIcon = document.getElementById("weather-badge-icon");
const weatherTitle = document.getElementById("weather-title");
const weatherBonusText = document.getElementById("weather-bonus-text");
const fishingPond = document.getElementById("fishing-pond");
const rainLayer = document.getElementById("rain-layer");
const skyDecor = document.getElementById("sky-decor");

const catchModal = document.getElementById("catch-modal");
const catchCard = document.getElementById("catch-card");
const catchBadge = document.getElementById("catch-badge");
const catchRarity = document.getElementById("catch-rarity");
const catchIllust = document.getElementById("catch-illust");
const catchName = document.getElementById("catch-name");
const catchDesc = document.getElementById("catch-desc");
const closeModalBtn = document.getElementById("close-modal-btn");

renderDex();

function createRainEffect() {
    if (!rainLayer) return;
    rainLayer.innerHTML = "";
    for (let i = 0; i < 35; i++) {
        const drop = document.createElement("div");
        drop.className = "raindrop";
        drop.style.left = Math.random() * 100 + "%";
        drop.style.animationDuration = (0.5 + Math.random() * 0.4) + "s";
        drop.style.animationDelay = Math.random() * 1 + "s";
        rainLayer.appendChild(drop);
    }
}

function checkWeatherBonus() {
    if (document.body.classList.contains("weather-rainy")) {
        isRainyBonus = true;
        weatherBadgeIcon.textContent = "☔";
        weatherTitle.textContent = "現在の天気：雨（レア魚ラッシュ発動中！）";
        weatherBonusText.textContent = "雨の恵みで魚の警戒心が薄れ、レア度2・3の出現率が大幅アップ中！";
        if (weatherStatusCard) weatherStatusCard.style.background = "#eaf2f8";
        if (fishingPond) fishingPond.className = "fishing-pond bg-rainy";
        if (skyDecor) skyDecor.textContent = "🌧️";
        createRainEffect();
    } else if (document.body.classList.contains("weather-sunny")) {
        isRainyBonus = false;
        weatherBadgeIcon.textContent = "☀️";
        weatherTitle.textContent = "現在の天気：晴れ（通常コンディション）";
        weatherBonusText.textContent = "絶好の釣り日和！標準の確率でさまざまな魚が登場します。";
        if (weatherStatusCard) weatherStatusCard.style.background = "#fcf8f2";
        if (fishingPond) fishingPond.className = "fishing-pond bg-sunny";
        if (skyDecor) skyDecor.textContent = "☀️";
    } else {
        isRainyBonus = false;
        weatherBadgeIcon.textContent = "☁️";
        weatherTitle.textContent = "現在の天気：曇り（まずまずのコンディション）";
        weatherBonusText.textContent = "曇天によるローライト効果で、魚たちの活性が程よく上がっています。";
        if (weatherStatusCard) weatherStatusCard.style.background = "#f4f5f7";
        if (fishingPond) fishingPond.className = "fishing-pond bg-cloudy";
        if (skyDecor) skyDecor.textContent = "☁️";
    }
}

function pickRandomFish() {
    const rand = Math.random() * 100;
    let selectedRarity = 1;

    if (isRainyBonus) {
        if (rand < 18) selectedRarity = 3;
        else if (rand < 55) selectedRarity = 2;
        else selectedRarity = 1;
    } else {
        if (rand < 10) selectedRarity = 3;
        else if (rand < 40) selectedRarity = 2;
        else selectedRarity = 1;
    }

    const candidates = FISH_LIST.filter(f => f.rarity === selectedRarity);
    return candidates[Math.floor(Math.random() * candidates.length)];
}

function triggerCast() {
    if (gameState !== "idle") return;
    catchModal.classList.remove("active");

    gameState = "waiting";
    castBtn.disabled = true;
    hookBtn.disabled = false;
    hitAlert.classList.remove("active");
    timingContainer.classList.remove("active");

    bobber.className = "bobber-wrapper casted";
    waterRipples.classList.add("active");
    if (fishingLine) {
        fishingLine.setAttribute("d", "M 60,0 Q 180,95 300,90");
        fishingLine.setAttribute("opacity", "1");
    }
    statusText.textContent = "ウキを見守っています...（アタリが来るまで待とう）";

    const waitTime = 1200 + Math.random() * 2300;
    biteTimeout = setTimeout(() => {
        startBitePhase();
    }, waitTime);
}

if (castBtn) {
    castBtn.addEventListener("click", triggerCast);
}

function startBitePhase() {
    gameState = "biting";
    currentFish = pickRandomFish();

    bobber.className = "bobber-wrapper biting";
    hitAlert.classList.add("active");
    timingContainer.classList.add("active");
    if (fishingLine) {
        fishingLine.setAttribute("d", "M 60,0 L 300,105");
    }

    fishingBoard.classList.remove("shake");
    void fishingBoard.offsetWidth;
    fishingBoard.classList.add("shake");

    const stars = "★".repeat(currentFish.rarity);
    statusText.textContent = `ヒット！！【レア度 ${stars}】タイミングよく「釣り上げる！」を押せ！`;

    zoneWidth = currentFish.zoneWidth;
    zoneStart = 10 + Math.random() * (80 - zoneWidth);

    targetZoneEl.style.left = zoneStart + "%";
    targetZoneEl.style.width = zoneWidth + "%";
    targetZoneEl.className = "target-zone rare-" + currentFish.rarity;

    cursorPos = 0;
    cursorDir = 1;
    frameCounter = 0;

    if (currentFish.id === "aoriika") {
        fishMotionType = "fuwa-fuwa";
    } else if (currentFish.erratic) {
        fishMotionType = "erratic";
    } else if (currentFish.rarity === 2) {
        fishMotionType = "heavy";
    } else {
        fishMotionType = "normal";
    }

    animateCursor();
}

function animateCursor() {
    if (gameState !== "biting") return;

    frameCounter++;
    let currentSpeed = currentFish.speed;

    if (fishMotionType === "fuwa-fuwa") {
        const waveEffect = Math.sin(frameCounter * 0.15) * 1.2;
        currentSpeed = Math.max(0.4, currentFish.speed + waveEffect);
    } 
    else if (fishMotionType === "erratic") {
        const erraticWave = Math.sin(frameCounter * 0.2) * 2.2;
        currentSpeed = currentFish.speed + erraticWave;
    }
    else if (fishMotionType === "heavy") {
        currentSpeed = currentFish.speed * (1 + Math.sin(frameCounter * 0.05) * 0.3);
    }

    cursorPos += currentSpeed * cursorDir;

    if (cursorPos >= 100) {
        cursorPos = 100;
        cursorDir = -1;
    } else if (cursorPos <= 0) {
        cursorPos = 0;
        cursorDir = 1;
    }

    cursorEl.style.left = cursorPos + "%";
    animFrameId = requestAnimationFrame(animateCursor);
}

function triggerHook() {
    if (gameState === "waiting") {
        clearTimeout(biteTimeout);
        finishTurn("早すぎた！魚が驚いて逃げてしまった...");
        return;
    }

    if (gameState === "biting") {
        cancelAnimationFrame(animFrameId);

        const hitMin = zoneStart - 1.5;
        const hitMax = zoneStart + zoneWidth + 1.5;

        if (cursorPos >= hitMin && cursorPos <= hitMax) {
            const isNew = !caughtData[currentFish.id];
            caughtData[currentFish.id] = (caughtData[currentFish.id] || 0) + 1;
            localStorage.setItem("natsumu_fishing_dex", JSON.stringify(caughtData));
            renderDex();

            showCatchModal(currentFish, isNew);
            const stars = "★".repeat(currentFish.rarity);
            finishTurn(`🎉 大成功！【${stars} ${currentFish.name}】を釣り上げた！`);
        } else {
            finishTurn(`💨 惜しい！タイミングが合わず糸を切られた...（正体は「${currentFish.name}」だった！）`);
        }
    }
}

if (hookBtn) {
    hookBtn.addEventListener("click", triggerHook);
}

document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        if (catchModal.classList.contains("active")) {
            e.preventDefault();
            catchModal.classList.remove("active");
            return;
        }
        if (gameState === "idle" && !castBtn.disabled) {
            e.preventDefault();
            triggerCast();
        } else if ((gameState === "waiting" || gameState === "biting") && !hookBtn.disabled) {
            e.preventDefault();
            triggerHook();
        }
    }
});

function showCatchModal(fish, isNew) {
    const stars = "★".repeat(fish.rarity);
    catchRarity.textContent = stars;
    catchRarity.className = "catch-rarity rarity-" + fish.rarity;
    catchIllust.innerHTML = fish.svg;
    catchName.textContent = fish.name;
    catchDesc.textContent = fish.desc;

    catchBadge.textContent = isNew ? "NEW DISCOVERY!" : `通算 ${caughtData[fish.id]}匹目`;
    catchCard.className = "catch-card rare-glow-" + fish.rarity;
    catchModal.classList.add("active");
}

if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        catchModal.classList.remove("active");
    });
}

function finishTurn(message) {
    gameState = "idle";
    castBtn.disabled = false;
    hookBtn.disabled = true;
    bobber.className = "bobber-wrapper";
    waterRipples.classList.remove("active");
    hitAlert.classList.remove("active");
    if (fishingLine) fishingLine.setAttribute("opacity", "0");
    statusText.textContent = message;
}

function renderDex() {
    if (!dexGrid) return;
    dexGrid.innerHTML = "";
    let unlockedCount = 0;

    FISH_LIST.forEach(fish => {
        const count = caughtData[fish.id] || 0;
        const isUnlocked = count > 0;
        if (isUnlocked) unlockedCount++;

        const card = document.createElement("div");
        card.className = "fish-card" + (isUnlocked ? "" : " locked");

        const stars = "★".repeat(fish.rarity);
        card.innerHTML = `
            <div class="fish-rarity rarity-${fish.rarity}">${stars}</div>
            <div class="fish-svg-box">${fish.svg}</div>
            <div class="fish-name">${isUnlocked ? fish.name : "？？？"}</div>
            <div class="fish-count">${isUnlocked ? `釣った数: ${count}匹` : fish.desc}</div>
        `;
        dexGrid.appendChild(card);
    });

    if (dexCountEl) dexCountEl.textContent = unlockedCount;
}

if (resetDexBtn) {
    resetDexBtn.addEventListener("click", () => {
        if (confirm("釣果図鑑の記録をすべてリセットしますか？")) {
            caughtData = {};
            localStorage.removeItem("natsumu_fishing_dex");
            renderDex();
            statusText.textContent = "図鑑データをリセットしました。";
        }
    });
}