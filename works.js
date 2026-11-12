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

        var works = customPhotos.concat(csvWorks);

        var grid = document.getElementById("works-grid");
        var categorySelect = document.getElementById("category");
        var sortSelect = document.getElementById("sort");

        var photoModal = document.getElementById("photo-modal");
        var modalImg = document.getElementById("modal-img");
        var modalTitle = document.getElementById("modal-title");
        var modalDesc = document.getElementById("modal-desc");
        var modalClose = document.getElementById("modal-close");

        var uploadForm = document.getElementById("photo-upload-form");
        var uploadFile = document.getElementById("upload-file");
        var uploadTitle = document.getElementById("upload-title");
        var uploadCategory = document.getElementById("upload-category");
        var uploadDesc = document.getElementById("upload-desc");
        var uploadYear = document.getElementById("upload-year");

        function updateCategories() {
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

                customPhotos.unshift(newPhoto);
                works.unshift(newPhoto);
                localStorage.setItem("natsumu_custom_photos", JSON.stringify(customPhotos));

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

// --- 3. 釣りミニゲーム・ショップ・経済システム ---
function getFishSVG(fishId) {
    if (fishId === "aji") {
        return `<svg width="72" height="42" viewBox="0 0 90 50"><path d="M15,25 Q45,2 80,25 Q45,48 15,25 Z" fill="#7ea8be" stroke="#111" stroke-width="2"/><path d="M15,25 L45,18 L80,25" fill="none" stroke="#46687a" stroke-width="1.5"/><polygon points="15,25 3,12 8,25 3,38" fill="#7ea8be" stroke="#111" stroke-width="2"/><polygon points="48,10 40,2 52,10" fill="#a8dadc" stroke="#111" stroke-width="1.5"/><circle cx="68" cy="22" r="2.5" fill="#111"/><circle cx="68" cy="22" r="1" fill="#fff"/></svg>`;
    } else if (fishId === "iwashi") {
        return `<svg width="72" height="42" viewBox="0 0 90 50"><path d="M10,26 Q45,10 82,26 Q45,40 10,26 Z" fill="#90e0ef" stroke="#111" stroke-width="2"/><path d="M20,24 Q50,15 78,24" stroke="#ffffff" stroke-width="2" fill="none"/><polygon points="10,26 2,16 6,26 2,36" fill="#90e0ef" stroke="#111" stroke-width="2"/><polygon points="50,13 45,5 55,13" fill="#0077b6" stroke="#111" stroke-width="1.5"/><circle cx="70" cy="23" r="2" fill="#111"/></svg>`;
    } else if (fishId === "saba") {
        return `<svg width="72" height="42" viewBox="0 0 90 50"><path d="M15,25 Q45,5 82,25 Q45,45 15,25 Z" fill="#3d5a80" stroke="#111" stroke-width="2"/><path d="M30,16 Q40,22 35,28 M45,14 Q55,20 50,26 M60,15 Q68,22 64,28" stroke="#111" stroke-width="1.5" fill="none"/><polygon points="15,25 4,11 10,25 4,39" fill="#293241" stroke="#111" stroke-width="2"/><polygon points="50,11 44,3 56,11" fill="#98c1d9" stroke="#111" stroke-width="1.5"/><circle cx="70" cy="22" r="2.5" fill="#111"/></svg>`;
    } else if (fishId === "kasago") {
        return `<svg width="72" height="42" viewBox="0 0 90 50"><path d="M20,20 C35,10 65,12 78,24 C70,36 40,38 20,30 Z" fill="#bc4749" stroke="#111" stroke-width="2"/><path d="M35,13 L42,4 L50,15" fill="#f28482" stroke="#111" stroke-width="1.5"/><path d="M70,24 L82,18 L80,32 Z" fill="#a73234" stroke="#111" stroke-width="1.5"/><circle cx="62" cy="20" r="3" fill="#ffe66d"/><circle cx="62" cy="20" r="1.5" fill="#111"/></svg>`;
    } else if (fishId === "kisu") {
        return `<svg width="72" height="42" viewBox="0 0 90 50"><path d="M12,25 Q48,12 82,25 Q48,38 12,25 Z" fill="#f8edeb" stroke="#111" stroke-width="2"/><polygon points="12,25 2,17 6,25 2,33" fill="#fcd5ce" stroke="#111" stroke-width="2"/><polygon points="52,14 48,6 58,14" fill="#e3d5ca" stroke="#111" stroke-width="1.5"/><circle cx="70" cy="23" r="2" fill="#111"/></svg>`;
    } else if (fishId === "kumanomi") {
        return `<svg width="72" height="42" viewBox="0 0 90 50"><path d="M22,16 C45,12 68,16 75,25 C68,34 45,38 22,34 C16,28 16,22 22,16 Z" fill="#ff7b00" stroke="#111" stroke-width="2"/><path d="M38,15 L35,35 M58,18 L55,32" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/><path d="M70,20 L82,15 L80,30 L70,25 Z" fill="#ff9f43" stroke="#111" stroke-width="1.5"/><circle cx="62" cy="22" r="2.2" fill="#111"/></svg>`;
    } else if (fishId === "tatsunootoshigo") {
        return `<svg width="52" height="44" viewBox="0 0 60 50"><path d="M30,8 Q42,12 36,24 Q30,34 24,40 Q18,46 24,48 Q32,45 38,36" fill="none" stroke="#52b788" stroke-width="5" stroke-linecap="round"/><circle cx="28" cy="11" r="7" fill="#52b788" stroke="#111" stroke-width="1.5"/><circle cx="26" cy="10" r="2" fill="#111"/><path d="M35,18 L44,14 L38,22" fill="#d8f3dc" stroke="#111" stroke-width="1.5"/></svg>`;
    } else if (fishId === "madai") {
        return `<svg width="76" height="44" viewBox="0 0 90 50"><path d="M15,25 Q45,2 80,25 Q45,48 15,25 Z" fill="#ff758f" stroke="#111" stroke-width="2"/><path d="M42,7 L38,2 L48,10 M52,7 L55,1 L58,10" fill="none" stroke="#ffb3c1" stroke-width="2"/><polygon points="15,25 2,8 8,25 2,42" fill="#ff758f" stroke="#111" stroke-width="2"/><circle cx="66" cy="21" r="3" fill="#ffe66d"/><circle cx="66" cy="21" r="1.5" fill="#111"/></svg>`;
    } else if (fishId === "hirame") {
        return `<svg width="76" height="44" viewBox="0 0 90 50"><ellipse cx="45" cy="25" rx="32" ry="18" fill="#b08968" stroke="#111" stroke-width="2"/><polygon points="13,25 2,12 2,38" fill="#ddb892" stroke="#111" stroke-width="2"/><circle cx="60" cy="20" r="2.5" fill="#111"/><circle cx="60" cy="26" r="2.5" fill="#111"/><path d="M35,18 Q45,14 55,22" stroke="#7f5539" stroke-width="1.5" fill="none"/></svg>`;
    } else if (fishId === "aoriika") {
        return `<svg width="72" height="44" viewBox="0 0 80 50"><path d="M22,14 L58,8 L72,25 L58,42 L22,36 Z" fill="#f4a261" stroke="#111" stroke-width="2"/><path d="M22,14 Q32,25 22,36" fill="#e76f51" stroke="#111" stroke-width="2"/><path d="M22,20 L6,12 M22,25 L3,24 M22,30 L6,38" stroke="#f4a261" stroke-width="3" stroke-linecap="round"/><circle cx="58" cy="21" r="2.5" fill="#111"/><circle cx="58" cy="29" r="2.5" fill="#111"/></svg>`;
    } else if (fishId === "katsuo") {
        return `<svg width="76" height="44" viewBox="0 0 90 50"><path d="M15,25 Q45,4 82,25 Q45,46 15,25 Z" fill="#2b2d42" stroke="#111" stroke-width="2"/><path d="M30,18 L65,28 M35,22 L70,33 M40,26 L74,38" stroke="#8d99ae" stroke-width="2.5" fill="none"/><polygon points="15,25 3,9 9,25 3,41" fill="#2b2d42" stroke="#111" stroke-width="2"/><polygon points="50,11 44,2 56,11" fill="#8d99ae" stroke="#111" stroke-width="1.5"/><circle cx="72" cy="22" r="2.5" fill="#111"/></svg>`;
    } else if (fishId === "kanpachi") {
        return `<svg width="76" height="44" viewBox="0 0 90 50"><path d="M15,25 Q45,4 82,25 Q45,46 15,25 Z" fill="#e9c46a" stroke="#111" stroke-width="2"/><path d="M60,16 L72,22" stroke="#d4a373" stroke-width="3"/><polygon points="15,25 3,9 9,25 3,41" fill="#f4a261" stroke="#111" stroke-width="2"/><polygon points="52,10 45,2 56,10" fill="#e9c46a" stroke="#111" stroke-width="1.5"/><circle cx="70" cy="22" r="2.5" fill="#111"/></svg>`;
    } else if (fishId === "golden_salmon") {
        return `<svg width="76" height="44" viewBox="0 0 90 50"><path d="M15,25 Q45,4 82,25 Q45,46 15,25 Z" fill="#ffd700" stroke="#b45309" stroke-width="2.5"/><path d="M35,16 Q45,24 38,32 M52,14 Q62,22 55,32" stroke="#ff4500" stroke-width="2" fill="none"/><polygon points="15,25 3,9 9,25 3,41" fill="#ff8c00" stroke="#b45309" stroke-width="2"/><polygon points="50,11 43,2 57,11" fill="#ff4500" stroke="#b45309" stroke-width="1.5"/><circle cx="70" cy="22" r="3" fill="#ffffff"/><circle cx="70" cy="22" r="1.5" fill="#000"/></svg>`;
    } else if (fishId === "kuromaguro") {
        return `<svg width="76" height="44" viewBox="0 0 90 50"><path d="M12,25 Q45,2 84,25 Q45,48 12,25 Z" fill="#1d3557" stroke="#0b1329" stroke-width="2.5"/><polygon points="12,25 1,5 7,25 1,45" fill="#111827" stroke="#0b1329" stroke-width="2"/><polygon points="46,8 39,1 51,9" fill="#457b9d" stroke="#0b1329" stroke-width="1.5"/><polygon points="55,8 49,1 60,9" fill="#457b9d" stroke="#0b1329" stroke-width="1.5"/><circle cx="74" cy="22" r="2.5" fill="#38bdf8"/></svg>`;
    } else if (fishId === "ryugu") {
        return `<svg width="78" height="44" viewBox="0 0 95 50"><path d="M6,26 Q28,12 50,25 T90,24 Q75,36 50,34 T6,26 Z" fill="#e2e8f0" stroke="#475569" stroke-width="2"/><path d="M74,17 L86,3 L72,15 L78,5 L66,16" fill="none" stroke="#e63946" stroke-width="3" stroke-linecap="round"/><path d="M12,26 L6,18 M20,25 L16,16 M28,24 L24,15" stroke="#e63946" stroke-width="2.5" stroke-linecap="round"/><circle cx="80" cy="22" r="2.5" fill="#ef4444"/></svg>`;
    } else if (fishId === "megalodon") {
        return `<svg width="80" height="46" viewBox="0 0 95 50"><path d="M10,26 C30,6 65,8 86,22 C75,40 35,42 10,26 Z" fill="#111827" stroke="#030712" stroke-width="2.5"/><path d="M42,6 L35,-3 L50,8" fill="#1f2937" stroke="#030712" stroke-width="2"/><path d="M68,26 L82,38 L72,32 Z" fill="#1f2937" stroke="#030712" stroke-width="2"/><path d="M12,28 L18,34 M16,28 L22,34 M20,28 L26,34" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><polygon points="10,26 0,10 6,26 0,42" fill="#111827" stroke="#030712" stroke-width="2"/><circle cx="76" cy="18" r="3" fill="#ef4444"/><circle cx="76" cy="18" r="1" fill="#fff"/></svg>`;
    } else {
        return `<svg width="64" height="40" viewBox="0 0 80 50"><path d="M18,25 Q45,8 72,25 Q45,42 18,25 Z" fill="#7ea8be" stroke="#111" stroke-width="2"/><polygon points="18,25 5,13 8,25 5,37" fill="#a8dadc" stroke="#111" stroke-width="2"/><circle cx="60" cy="22" r="2.5" fill="#111"/></svg>`;
    }
}

// 魚データ（全16種）
const FISH_LIST = [
    { id: "aji", name: "マアジ", rarity: 1, price: 100, zoneWidth: 28, speed: 1.1, erratic: false, desc: "防波堤の定番。まずはここから。" },
    { id: "iwashi", name: "マイワシ", rarity: 1, price: 80, zoneWidth: 26, speed: 1.2, erratic: false, desc: "群れで泳ぐ銀色の小魚。" },
    { id: "saba", name: "マサバ", rarity: 1, price: 150, zoneWidth: 24, speed: 1.35, erratic: false, desc: "引きが強く釣りごたえがある。" },
    { id: "kasago", name: "カサゴ", rarity: 1, price: 140, zoneWidth: 24, speed: 1.3, erratic: false, desc: "岩陰に潜む根魚の代表格。" },
    { id: "kisu", name: "シロギス", rarity: 1, price: 160, zoneWidth: 22, speed: 1.45, erratic: false, desc: "砂浜の女王と呼ばれる美しい魚。" },
    { id: "kumanomi", name: "クマノミ", rarity: 1, price: 200, zoneWidth: 25, speed: 1.25, erratic: false, desc: "南国の海からやってきた鮮やかなオレンジの小魚。" },
    { id: "tatsunootoshigo", name: "タツノオトシゴ", rarity: 1, price: 250, zoneWidth: 27, speed: 1.0, erratic: false, desc: "ゆったりと漂う、ユニークな姿の小型魚。" },

    { id: "madai", name: "マダイ", rarity: 2, price: 600, zoneWidth: 14, speed: 2.1, erratic: false, desc: "魚の王様。力強い引きに注意！" },
    { id: "hirame", name: "ヒラメ", rarity: 2, price: 750, zoneWidth: 13, speed: 2.3, erratic: false, desc: "海底に潜む高級フラットフィッシュ。" },
    { id: "aoriika", name: "アオリイカ", rarity: 2, price: 700, zoneWidth: 12, speed: 2.5, erratic: false, desc: "イカの王様。独特のジェット噴射。" },
    { id: "katsuo", name: "カツオ", rarity: 2, price: 800, zoneWidth: 12.5, speed: 2.4, erratic: false, desc: "勢いよく泳ぐ、一本釣りの名優。" },
    { id: "kanpachi", name: "カンパチ", rarity: 2, price: 950, zoneWidth: 11, speed: 2.6, erratic: false, desc: "力強い引きを誇る大型回遊魚。" },

    { id: "golden_salmon", name: "黄金のサーモン", rarity: 3, price: 2500, zoneWidth: 7.0, speed: 3.2, erratic: true, desc: "【激ムズ】全身が黄金色に輝く、超低確率の幻のサケ！" },
    { id: "kuromaguro", name: "クロマグロ", rarity: 3, price: 3000, zoneWidth: 6.0, speed: 3.5, erratic: true, desc: "【激ムズ】海の黒いダイヤ。超高速＆緩急をつけて暴れる！" },
    { id: "ryugu", name: "リュウグウノツカイ", rarity: 3, price: 4000, zoneWidth: 5.0, speed: 3.9, erratic: true, desc: "【激ムズ】深海の神秘。極小ゾーンと変則スピードを制せ！" },

    { id: "megalodon", name: "古代巨鮫メガロドン", rarity: 4, price: 10000, zoneWidth: 5.0, speed: 3.8, erratic: true, desc: "【星4超伝説】ウキ大の波動に引き寄せられた古代の海王！" }
];

const RODS = [
    { id: "none", name: "ノーマル竿", speedFactor: 1.0, price: 0 },
    { id: "rod_s", name: "しなり竿・小", speedFactor: 0.95, price: 1000, desc: "魚のスピードが少しだけ遅くなる (5%減)" },
    { id: "rod_m", name: "しなり竿・中", speedFactor: 0.90, price: 3500, desc: "魚のスピードが少し遅くなる (10%減)" },
    { id: "rod_l", name: "しなり竿・大", speedFactor: 0.85, price: 8000, desc: "魚のスピードがやや遅くなる (15%減)" }
];

const FLOATS = [
    { id: "none", name: "ノーマルウキ", rarityBonus: 0, price: 0 },
    { id: "float_s", name: "名人のウキ・小", rarityBonus: 1, price: 1500, desc: "レア度2以上の魚が釣りやすくなる" },
    { id: "float_m", name: "名人のウキ・中", rarityBonus: 2, price: 5000, desc: "レア度3の出現率がアップする" },
    { id: "float_l", name: "伝説のウキ・大", rarityBonus: 3, price: 12000, desc: "星4の魚（約5%）やレア魚が続出する最強のウキ！" }
];

let playerMoney = Number(localStorage.getItem("natsumu_money")) || 0;
let ownedRods = JSON.parse(localStorage.getItem("natsumu_owned_rods")) || ["none"];
let equippedRod = localStorage.getItem("natsumu_equipped_rod") || "none";
let ownedFloats = JSON.parse(localStorage.getItem("natsumu_owned_floats")) || ["none"];
let equippedFloat = localStorage.getItem("natsumu_equipped_float") || "none";
let caughtData = JSON.parse(localStorage.getItem("natsumu_fishing_dex")) || {};

let fishInventory = JSON.parse(localStorage.getItem("natsumu_fish_inventory")) || {};
FISH_LIST.forEach(fish => {
    if (caughtData[fish.id] && (!fishInventory[fish.id] || fishInventory[fish.id] === 0)) {
        fishInventory[fish.id] = caughtData[fish.id];
    }
});
localStorage.setItem("natsumu_fish_inventory", JSON.stringify(fishInventory));

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

const playerMoneyEl = document.getElementById("player-money");
const equippedRodNameEl = document.getElementById("equipped-rod-name");
const equippedFloatNameEl = document.getElementById("equipped-float-name");

const rodShopList = document.getElementById("rod-shop-list");
const floatShopList = document.getElementById("float-shop-list");
const sellItemList = document.getElementById("sell-item-list");

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

// コンプリート祝福モーダル
const completeModal = document.createElement("div");
completeModal.className = "complete-modal";
completeModal.id = "complete-modal";
completeModal.innerHTML = `
    <div class="complete-card">
        <div class="complete-trophy">🏆</div>
        <h2>祝・図鑑コンプリート！</h2>
        <p>おめでとうございます！全16種類のすべての魚を釣り上げ、伝説の漁師となりました！</p>
        <button id="close-complete-btn" class="game-btn">最高の気分だ！</button>
    </div>
`;
document.body.appendChild(completeModal);

const closeCompleteBtn = document.getElementById("close-complete-btn");
closeCompleteBtn.addEventListener("click", () => {
    completeModal.classList.remove("active");
});

// いつでもお祝いを見られるボタン
const showCompleteBtn = document.getElementById("show-complete-btn");
if (showCompleteBtn) {
    showCompleteBtn.addEventListener("click", () => {
        completeModal.classList.add("active");
    });
}

updateWalletUI();
renderShop();
renderSellList();
renderDex();

document.querySelectorAll(".shop-tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        document.querySelectorAll(".shop-tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".shop-pane").forEach(p => p.classList.remove("active"));
        e.target.classList.add("active");
        const tabName = e.target.getAttribute("data-tab");
        document.getElementById("tab-" + tabName).classList.add("active");
    });
});

function updateWalletUI() {
    if (playerMoneyEl) playerMoneyEl.textContent = playerMoney.toLocaleString() + " 🪙";
    const rodObj = RODS.find(r => r.id === equippedRod) || RODS[0];
    const floatObj = FLOATS.find(f => f.id === equippedFloat) || FLOATS[0];
    if (equippedRodNameEl) equippedRodNameEl.textContent = rodObj.name;
    if (equippedFloatNameEl) equippedFloatNameEl.textContent = floatObj.name;
    localStorage.setItem("natsumu_money", playerMoney);
    localStorage.setItem("natsumu_equipped_rod", equippedRod);
    localStorage.setItem("natsumu_equipped_float", equippedFloat);
}

function renderShop() {
    if (rodShopList) {
        rodShopList.innerHTML = "";
        RODS.forEach(rod => {
            const isOwned = ownedRods.includes(rod.id);
            const isEquipped = (equippedRod === rod.id);
            const row = document.createElement("div");
            row.className = "shop-item-row";
            row.innerHTML = `
                <div class="shop-item-info">
                    <strong>${rod.name}</strong>
                    <span>${rod.desc} / 価格: ${rod.price.toLocaleString()} 🪙</span>
                </div>
                <div>
                    ${isEquipped ? '<button class="shop-btn" disabled>装備中</button>' :
                      isOwned ? `<button class="shop-btn" onclick="equipRod('${rod.id}')">装備する</button>` :
                      `<button class="shop-btn" onclick="buyRod('${rod.id}', ${rod.price})">購入する</button>`}
                </div>
            `;
            rodShopList.appendChild(row);
        });
    }

    if (floatShopList) {
        floatShopList.innerHTML = "";
        FLOATS.forEach(fl => {
            const isOwned = ownedFloats.includes(fl.id);
            const isEquipped = (equippedFloat === fl.id);
            const row = document.createElement("div");
            row.className = "shop-item-row";
            row.innerHTML = `
                <div class="shop-item-info">
                    <strong>${fl.name}</strong>
                    <span>${fl.desc} / 価格: ${fl.price.toLocaleString()} 🪙</span>
                </div>
                <div>
                    ${isEquipped ? '<button class="shop-btn" disabled>装備中</button>' :
                      isOwned ? `<button class="shop-btn" onclick="equipFloat('${fl.id}')">装備する</button>` :
                      `<button class="shop-btn" onclick="buyFloat('${fl.id}', ${fl.price})">購入する</button>`}
                </div>
            `;
            floatShopList.appendChild(row);
        });
    }
}

window.buyRod = function(id, price) {
    if (playerMoney < price) {
        alert("コインが足りません！");
        return;
    }
    playerMoney -= price;
    ownedRods.push(id);
    equippedRod = id;
    localStorage.setItem("natsumu_owned_rods", JSON.stringify(ownedRods));
    updateWalletUI();
    renderShop();
    alert("「" + RODS.find(r => r.id === id).name + "」を購入＆装備しました！");
};

window.equipRod = function(id) {
    equippedRod = id;
    updateWalletUI();
    renderShop();
};

window.buyFloat = function(id, price) {
    if (playerMoney < price) {
        alert("コインが足りません！");
        return;
    }
    playerMoney -= price;
    ownedFloats.push(id);
    equippedFloat = id;
    localStorage.setItem("natsumu_owned_floats", JSON.stringify(ownedFloats));
    updateWalletUI();
    renderShop();
    alert("「" + FLOATS.find(f => f.id === id).name + "」を購入＆装備しました！");
};

window.equipFloat = function(id) {
    equippedFloat = id;
    updateWalletUI();
    renderShop();
};

function renderSellList() {
    if (!sellItemList) return;
    sellItemList.innerHTML = "";
    let hasStock = false;

    FISH_LIST.forEach(fish => {
        const count = fishInventory[fish.id] || 0;
        if (count > 0) {
            hasStock = true;
            const row = document.createElement("div");
            row.className = "sell-item-row";
            const stars = "★".repeat(fish.rarity);
            row.innerHTML = `
                <div class="shop-item-info">
                    <strong>${stars} ${fish.name} (所持: ${count}匹)</strong>
                    <span>売値: 1匹 ${fish.price.toLocaleString()} 🪙</span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="shop-btn" onclick="sellFish('${fish.id}', 1)">1匹売る</button>
                    <button class="shop-btn" onclick="sellFish('${fish.id}', ${count})">全部売る</button>
                </div>
            `;
            sellItemList.appendChild(row);
        }
    });

    if (!hasStock) {
        sellItemList.innerHTML = '<p style="color:#666; font-size:12px; text-align:center; padding:15px;">売却できる魚がいません。釣りをしてみよう！</p>';
    }
}

window.sellFish = function(fishId, amount) {
    const stock = fishInventory[fishId] || 0;
    const sellCount = Math.min(amount, stock);
    if (sellCount <= 0) return;

    const fishObj = FISH_LIST.find(f => f.id === fishId);
    const earn = fishObj.price * sellCount;

    fishInventory[fishId] -= sellCount;
    if (fishInventory[fishId] <= 0) {
        delete fishInventory[fishId];
    }
    playerMoney += earn;

    localStorage.setItem("natsumu_fish_inventory", JSON.stringify(fishInventory));
    updateWalletUI();
    renderSellList();
    alert(`${fishObj.name} を ${sellCount}匹売却し、${earn.toLocaleString()} 🪙 を獲得しました！`);
};

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
        weatherBonusText.textContent = "雨の恵みで魚の警戒心が薄れ、レア度アップ中！";
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
        weatherBonusText.textContent = "曇天によるローライト効果で、魚たちの活性が上がっています。";
        if (weatherStatusCard) weatherStatusCard.style.background = "#f4f5f7";
        if (fishingPond) fishingPond.className = "fishing-pond bg-cloudy";
        if (skyDecor) skyDecor.textContent = "☁️";
    }
}

function pickRandomFish() {
    const rand = Math.random() * 100;
    let selectedRarity = 1;

    const hasFloatL = (equippedFloat === "float_l");
    const hasFloat = (equippedFloat !== "none");

    if (hasFloatL && rand < 5.0) {
        selectedRarity = 4;
    } else {
        let r3Chance = 10;
        let r2Chance = 30;

        if (equippedFloat === "float_s") { r2Chance = 45; r3Chance = 15; }
        else if (equippedFloat === "float_m") { r2Chance = 40; r3Chance = 25; }
        else if (equippedFloat === "float_l") { r2Chance = 35; r3Chance = 35; }

        if (isRainyBonus) {
            r3Chance += 8;
            r2Chance += 15;
        }

        const rand2 = Math.random() * 100;
        if (rand2 < r3Chance && hasFloat) {
            selectedRarity = 3;
        } else if (rand2 < (r3Chance + r2Chance)) {
            selectedRarity = 2;
        } else {
            selectedRarity = 1;
        }
    }

    const candidates = FISH_LIST.filter(f => f.rarity === selectedRarity);
    if (candidates.length === 0) {
        return FISH_LIST.filter(f => f.rarity === 1)[0];
    }
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
    } else if (currentFish.rarity >= 2) {
        fishMotionType = "heavy";
    } else {
        fishMotionType = "normal";
    }

    animateCursor();
}

function animateCursor() {
    if (gameState !== "biting") return;

    frameCounter++;

    const rodObj = RODS.find(r => r.id === equippedRod) || RODS[0];
    let currentSpeed = currentFish.speed * rodObj.speedFactor;

    if (fishMotionType === "fuwa-fuwa") {
        const waveEffect = Math.sin(frameCounter * 0.15) * 1.2;
        currentSpeed = Math.max(0.3, currentSpeed + waveEffect * rodObj.speedFactor);
    } 
    else if (fishMotionType === "erratic") {
        const erraticWave = Math.sin(frameCounter * 0.2) * 2.2;
        currentSpeed = currentSpeed + erraticWave * rodObj.speedFactor;
    }
    else if (fishMotionType === "heavy") {
        currentSpeed = currentSpeed * (1 + Math.sin(frameCounter * 0.05) * 0.3);
    }

    cursorPos += Math.max(0.2, currentSpeed) * cursorDir;

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

        const hitMin = zoneStart;
        const hitMax = zoneStart + zoneWidth;

        if (cursorPos >= hitMin && cursorPos <= hitMax) {
            const isNew = !caughtData[currentFish.id];
            caughtData[currentFish.id] = (caughtData[currentFish.id] || 0) + 1;
            fishInventory[currentFish.id] = (fishInventory[currentFish.id] || 0) + 1;

            localStorage.setItem("natsumu_fishing_dex", JSON.stringify(caughtData));
            localStorage.setItem("natsumu_fish_inventory", JSON.stringify(fishInventory));
            renderDex();
            renderSellList();

            showCatchModal(currentFish, isNew);
            const stars = "★".repeat(currentFish.rarity);
            finishTurn(`🎉 大成功！【${stars} ${currentFish.name}】を釣り上げた！（売却倉庫に追加）`);

            checkCompletion();
        } else {
            finishTurn("💨 惜しい！タイミングが合わず糸を切られてしまった...");
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
        if (completeModal.classList.contains("active")) {
            e.preventDefault();
            completeModal.classList.remove("active");
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
    catchIllust.innerHTML = getFishSVG(fish.id);
    catchName.textContent = fish.name;
    catchDesc.textContent = fish.desc + ` (売値: ${fish.price.toLocaleString()}🪙)`;

    catchBadge.textContent = isNew ? "NEW DISCOVERY!" : `通算 ${caughtData[fish.id]}匹目`;
    catchCard.className = "catch-card rare-glow-" + fish.rarity;
    catchModal.classList.add("active");
}

if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        catchModal.classList.remove("active");
    });
}

function checkCompletion() {
    let unlockedCount = 0;
    FISH_LIST.forEach(fish => {
        if (caughtData[fish.id] > 0) unlockedCount++;
    });

    if (unlockedCount >= FISH_LIST.length) {
        // コンプリートボタンを表示する
        if (showCompleteBtn) {
            showCompleteBtn.style.display = "inline-block";
        }
        setTimeout(() => {
            completeModal.classList.add("active");
        }, 600);
    } else {
        if (showCompleteBtn) {
            showCompleteBtn.style.display = "none";
        }
    }
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
            <div class="fish-svg-box">${getFishSVG(fish.id)}</div>
            <div class="fish-name">${isUnlocked ? fish.name : "？？？"}</div>
            <div class="fish-count">${isUnlocked ? `釣った数: ${count}匹` : fish.desc}</div>
        `;
        dexGrid.appendChild(card);
    });

    if (dexCountEl) dexCountEl.textContent = unlockedCount;

    // 図鑑描画時にコンプリート状態を毎回チェックしてボタンの表示を同期
    checkCompletion();
}

if (resetDexBtn) {
    resetDexBtn.addEventListener("click", () => {
        if (confirm("釣果図鑑の記録をすべてリセットしますか？")) {
            caughtData = {};
            fishInventory = {};
            playerMoney = 0;
            localStorage.removeItem("natsumu_fishing_dex");
            localStorage.removeItem("natsumu_fish_inventory");
            localStorage.removeItem("natsumu_money");
            if (showCompleteBtn) showCompleteBtn.style.display = "none";
            updateWalletUI();
            renderShop();
            renderSellList();
            renderDex();
            statusText.textContent = "図鑑および経済データをリセットしました。";
        }
    });
}