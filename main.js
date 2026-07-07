const API_URL_KLIKY = "https://kliky.remingway.cz/api/kliky";
let allUsers = [];
let allUsersData = [];

let MyName = window.location.pathname.split('/')[1].toLowerCase();
MyName = "remi";

if (MyName) {
    localStorage.setItem('savedUser', MyName);
} else {
    MyName = localStorage.getItem('savedUser');
}
if (!MyName) {
    console.error("Uživatel nebyl identifikován!");
}


let currentCount = 15;
let duelValue = 20;
let selectedOpponent = "";

let activeIndex = 0;
let totalUsersCount = 0;
let isThrottled = false;

let lastLoadedData = "";

// === OVLÁDÁNÍ HLAVNÍHO TLAČÍTKA ===

const track = document.getElementById('numbers-track');
let currentVal = parseInt(localStorage.getItem('val2')) || 15;
let isDragging = false;
let wasDragging = false;
let startX, startVal;
const itemWidth = 40; // Odpovídá flex: 0 0 40px v CSS

// Inicializace čísel
function initSelector() {
    track.innerHTML = '';
    for (let i = 1; i <= 100; i++) {
        const div = document.createElement('div');
        div.className = 'number';
        div.textContent = i;
        track.appendChild(div);
    }
    updateSelectorPos(currentVal, true);
}

function updateSelectorPos(val, immediate = false) {
    currentVal = Math.max(1, Math.min(100, val));
    // Matematika pro vycentrování
    const offset = -(((currentVal - 1) * itemWidth) - (120/2 - itemWidth/2));
    
    track.style.transition = immediate ? 'none' : 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)';
    track.style.transform = `translateX(${offset}px)`;
    
    document.querySelectorAll('.number').forEach((n, i) => {
        n.className = i === Math.round(currentVal)-1 ? 'number active' : 'number';
    });
}

// Eventy pro pohyb
// Pomocná funkce pro získání X souřadnice
const getClientX = (e) => (e.touches ? e.touches[0].clientX : e.clientX);

// Funkce pro logiku pohybu
const startDrag = (e) => { isDragging = true; wasDragging = false; startX = getClientX(e); startVal = currentVal; };

const moveDrag = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const diff = (getClientX(e) - startX) / itemWidth;
    if (Math.abs(getClientX(e) - startX) > 5) wasDragging = true;
    currentVal = Math.max(1, Math.min(100, startVal - diff));
    updateSelectorPos(currentVal, true);
};

const endDrag = () => {
    if (isDragging) {
        isDragging = false;
        updateSelectorPos(Math.round(currentVal));
        // Synchronizace s inputem v nastavení
        const input2 = document.getElementById('btn2');
        //if (input2) input2.value = Math.round(currentVal);
        //localStorage.setItem('val2', Math.round(currentVal));
    }
};

// Registrace eventů pro DOTYK
track.addEventListener('touchstart', startDrag, {passive: false});
window.addEventListener('touchmove', moveDrag, {passive: false});
window.addEventListener('touchend', endDrag);

// Registrace eventů pro MYŠ
track.addEventListener('mousedown', startDrag);
window.addEventListener('mousemove', moveDrag);
window.addEventListener('mouseup', endDrag);
// Prevence výběru textu při tažení myší
track.addEventListener('dragstart', (e) => e.preventDefault());

// Kliknutí (odeslání)
track.addEventListener('click', () => {
    if (!wasDragging) SendPushups(Math.round(currentVal));
});

// Spuštění
initSelector();

// === NAČÍTÁNÍ A AKTUALIZACE DAT ===

function loadData() {
    //document.getElementById("LoadovaciOkno").style.display = "flex";
    
    fetch(API_URL_KLIKY)
        .then(res => res.json())
        .then(data => {
            // 1. Kontrola existence uživatele přímo v datech
            const userExists = data.users.some(u => u.name.toLowerCase() === MyName);

            if (!userExists) {
                // Pokud uživatel neexistuje, zobrazíme chybu a skončíme
                document.getElementById("error-screen").style.display = "flex";
                document.getElementById("LoadovaciOkno").style.display = "none";
                return; // Tímto zastavíme vykonávání zbytku funkce
            }


            allUsersData = data.users;
            const newDataString = JSON.stringify(data.users);
            if (newDataString === lastLoadedData) return;
            lastLoadedData = newDataString;

            allUsers = data.users.map(u => u.name);
            updateView(data.users);
            zpracujStatistiky(data.users);
            aktualizujStavUI();
        })
        .catch(err => {
            console.error("Chyba při načítání dat: ", err);
            document.getElementById("LoadovaciOkno").style.display = "none";
        });
}
setInterval(() => {
    loadData();
}, 2000);

function updateView(users) {
    console.log(users);
    const filteredUsers = users.filter(user => user.name === MyName || user.aktivni === true);
    const mainUser = users.find(u => u.name === MyName);

    if (!mainUser) {
        document.getElementById("LoadovaciOkno").style.display = "none";
        return;
    }

    // 2. Seřazení
    filteredUsers.sort((a, b) => {
    // 1. Priorita: Today (sestupně)
    if (b.today !== a.today) {
        return b.today - a.today;
    }

    // 2. Priorita: Yesterday (sestupně)
    if (b.yesterday !== a.yesterday) {
        return b.yesterday - a.yesterday;
    }

    // 3. Priorita: Month (sestupně)
    if (b.month !== a.month) {
        return b.month - a.month;
    }

    // 4. Priorita: PreMonth (sestupně)
    if (b.premonth !== a.premonth) {
        return b.premonth - a.premonth;
    }

    // 5. Priorita: Pokud je vše stejné, tvé jméno (MyName) jde vždy nahoru
    if (a.name === MyName) return -1;
    if (b.name === MyName) return 1;

    return 0;
});

    totalUsersCount = filteredUsers.length;
    const listContainer = document.getElementById("leaderboard-list");
    listContainer.innerHTML = "";

    const templateUser = document.getElementById("board-template-user");
    const templateMain = document.getElementById("board-template-main");

    filteredUsers.forEach((user, index) => {
        let klon;
        if (user.name === MyName) {
            klon = templateMain.cloneNode(true);
            klon.removeAttribute("id");
            
            klon.querySelector("#NameMain").textContent = user.name.charAt(0).toUpperCase() + user.name.slice(1).toLowerCase();
            klon.querySelector("#TodayMain").textContent = user.today;
            klon.querySelector("#YesterdayMain").textContent = user.yesterday;
            klon.querySelector("#MonthMain").textContent = user.month;
            klon.querySelector("#PreMonthMain").textContent = user.premonth;
            
            const streakElem = document.querySelector("#StreakMain");
            if (streakElem) {
                streakElem.textContent = Math.abs(user.streak);
                if (user.streak < 0) streakElem.style.color = "#884444";
                else
                {   
                    streakElem.style.color = "white";
                    launchStreakFireworks(user.streak);
                }
            }
            const debtElem = klon.querySelector("#DebtMain");
            if (debtElem) debtElem.textContent = user.debt === 0 ? "🥳" : user.debt;

            activeIndex = index;
        } else {
            klon = templateUser.cloneNode(true);
            klon.removeAttribute("id");

            klon.querySelector(".tpl-name").textContent = user.name.charAt(0).toUpperCase() + user.name.slice(1).toLowerCase();
            klon.querySelector(".tpl-today").textContent = user.today;
            klon.querySelector(".tpl-yesterday").textContent = user.yesterday;
            klon.querySelector(".tpl-month").textContent = user.month;
            klon.querySelector(".tpl-premonth").textContent = user.premonth;
            klon.querySelector(".tpl-debt").textContent = user.debt;

            klon.style.backgroundColor = user.today > mainUser.today ? "#00700022" : "#33333322";
        }
        
        klon.classList.add("leaderboard-row-item");
        listContainer.appendChild(klon);
    });

    document.getElementById("LoadovaciOkno").style.display = "none";
    scrollToIndex(activeIndex, true);
}

function scrollToIndex(index, instant = false) {
    if (index < 0 || index >= totalUsersCount) return;
    activeIndex = index;

    const list = document.getElementById("leaderboard-list");
    const items = document.querySelectorAll(".leaderboard-row-item");
    
    if (items.length > 0 && list) {
        const stepHeight = 76 + 12; 
        const offset = -(activeIndex * stepHeight);

        if (instant) {
            list.style.transition = "none";
            list.style.transform = `translateY(${offset}px)`;
            list.offsetHeight; 
            list.style.transition = "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)";
        } else {
            list.style.transform = `translateY(${offset}px)`;
        }
    }
}

// Navázání eventů na vycentrovaný wrapper
const scrollWrapper = document.getElementById("leaderboard-scroll-wrapper");
scrollWrapper.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (isThrottled) return;

    isThrottled = true;
    if (e.deltaY > 0) {
        scrollToIndex(activeIndex + 1); 
    } else {
        scrollToIndex(activeIndex - 1); 
    }

    setTimeout(() => { isThrottled = false; }, 350); 
}, { passive: false });

let swipeStartY = 0;
scrollWrapper.addEventListener("touchstart", (e) => {
    swipeStartY = e.touches[0].clientY;
}, { passive: true });

scrollWrapper.addEventListener("touchend", (e) => {
    const swipeEndY = e.changedTouches[0].clientY;
    const diffY = swipeStartY - swipeEndY;

    if (Math.abs(diffY) > 40) { 
        if (diffY > 0) {
            scrollToIndex(activeIndex + 1); 
        } else {
            scrollToIndex(activeIndex - 1); 
        }
    }
}, { passive: true });

// === ODESÍLÁNÍ KLIKŮ ===
// === ODESÍLÁNÍ KLIKŮ - UPRAVENO PRO NOTIFIKACI ===
function SendPushups(kliky) {
    // 1. Zobrazíme loading
    document.getElementById("loadingOverlay").style.display = "flex";
    log("Odesílám: " + kliky);

    // 2. Vytvoříme oba procesy: fetch na server a časovač na 500ms
    const fetchPromise = fetch(API_URL_KLIKY, {
        method: "POST",
        body: JSON.stringify({ kliky: kliky, mainName: MyName }),
        headers: { "Content-Type": "application/json" }
    }).then(res => res.json());

    const timerPromise = new Promise(resolve => setTimeout(resolve, 500));

    // 3. Počkáme, až se dokončí OBĚ věci
    Promise.all([fetchPromise, timerPromise])
    .then(([data]) => {
        log("Úspěch!");

        // Zpracování notifikace
        if (data.notification && Notification.permission === "granted") {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg) {
                    reg.showNotification(data.notification.title, {
                        body: data.notification.body,
                        icon: "klikona.png"
                    });
                }
            });
        }
      updateView(data.users);

        document.getElementById("loadingOverlay").style.display = "none";
    })
    .catch(err => {
        log("CHYBA: " + err.message);
        console.error("Chyba při odesílání:", err);
        document.getElementById("loadingOverlay").style.display = "none";
    });
}

// === OHŇOSTROJ PRO STREAK ===
function launchStreakFireworks(streakValue) {
    if (streakValue <= 8) return;
    const container = document.getElementById("streakFireworks");
    if (!container) return;

    container.innerHTML = "";
    const colors = ["#ff5252", "#ffca28", "#69f0ae", "#40c4ff"];

    const interval = setInterval(() => {
        for (let i = 0; i < 10; i++) {
            const dot = document.createElement("div");
            dot.className = "firework";
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 35;

            dot.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
            dot.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
            dot.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            dot.style.left = "50%";
            dot.style.top = "50%";

            container.appendChild(dot);
            setTimeout(() => dot.remove(), 1300);
        }
    }, 300);

    setTimeout(() => clearInterval(interval), 4000);
}

// === STATISTICKÉ TOAST NOTIFIKACE ===
let statsQueue = [];
let currentStatIndex = 0;

let isRotationRunning = false; // Příznak, zda už rotace běží

function zpracujStatistiky(users) {
    const mainUser = users.find(u => u.name === MyName) || {};
    
    let maxAthDay = 0, maxAthMonth = 0, maxAthStreak = 0, maxTotal = 0;

    users.forEach(u => {
        if(u.athday > maxAthDay) maxAthDay = u.athday;
        if(u.athmonth > maxAthMonth) maxAthMonth = u.athmonth;
        if(u.athstreak > maxAthStreak) maxAthStreak = u.athstreak;
        if(u.total > maxTotal) maxTotal = u.total;

    });

    // 3. Sestavíme frontu statistik ze stejných dat
    statsQueue = [
        { text: `Your Daily Peak: ${mainUser.athday || 0}`, icon: "👤", type: "toast-personal" },
        { text: `All Daily Peak: ${maxAthDay}`, icon: "🌍", type: "toast-global" },
        { text: `Your Month Peak: ${mainUser.athmonth || 0}`, icon: "📅", type: "toast-personal" },
        { text: `All Month Peak: ${maxAthMonth}`, icon: "🌍", type: "toast-global" },
        { text: `Your Longest Streak: ${mainUser.athstreak || 0} Days`, icon: "🔥", type: "toast-personal" },
        { text: `All Longest Streak: ${maxAthStreak} Days`, icon: "🌍", type: "toast-global" },
        { text: `Your Total: ${mainUser.total || 0}`, icon: "🔥", type: "toast-personal" },
        { text: `All Total: ${maxTotal}`, icon: "🌍", type: "toast-global" },
        { text: `Your Fav Time: ${mainUser.time || 0}`, icon: "🕒", type: "toast-personal" }
    ];
    
    // Spustíme rotaci, pokud máme co zobrazit
    if (!isRotationRunning) {
        isRotationRunning = true;
        showNextStat();
    }
}

function showNextStat() {
    const container = document.getElementById("stats-notification-container");
    const toastInner = document.getElementById("stats-toast");
    const toastText = document.getElementById("toast-text");
    const iconSpan = toastInner.querySelector(".toast-icon-mini");

    if (!statsQueue[currentStatIndex]) return;
    const stat = statsQueue[currentStatIndex];

    toastText.innerHTML = stat.text;
    iconSpan.textContent = stat.icon;
    toastInner.className = "stats-toast-mini " + stat.type;

    container.classList.add("show");

    setTimeout(() => {
        container.classList.remove("show");
        setTimeout(() => {
            currentStatIndex = (currentStatIndex + 1) % statsQueue.length;
            showNextStat();
        }, 4000);
    }, 5000);
}

// Globální proměnná pro stav toastů
let showStatsToast = localStorage.getItem('showStatsToast') !== 'false';

function toggleToastVisibility(isEnabled) {
    showStatsToast = isEnabled;
    localStorage.setItem('showStatsToast', isEnabled);
    const container = document.getElementById("stats-notification-container");
    container.style.display = isEnabled ? "block" : "none";
}

// Při startu aplikace nastavíme správný stav
document.addEventListener("DOMContentLoaded", () => {
    toggleToastVisibility(showStatsToast);
    document.getElementById("toggle-toast").checked = showStatsToast;
});




/* === instalace aplikace === */

let deferredPrompt;

// 1. Funkce pro detekci stavu
function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// 2. Funkce pro aktualizaci UI
function updateInstallUI() {
    const btnInstall = document.getElementById('btn-install');
    const installHint = document.getElementById('install-hint');
    const nadpisinstall = document.getElementById('nadpis-install');
 

    // Pokud je aplikace nainstalovaná -> vše schovat
    if (isAppInstalled()) {
        if (btnInstall) btnInstall.style.display = 'none';
        if (installHint) installHint.style.display = 'none';
        if (nadpisinstall) nadpisinstall.style.display = 'none';
        return;
    }

    // Pokud nejsme v nainstalované aplikaci, zjistíme platformu
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
        // iOS: Tlačítko skrýt, zobrazit hint
        if (btnInstall) btnInstall.style.display = 'none';
        if (installHint) installHint.style.display = 'block';
    } else {
        // Android/Ostatní: Defaultně skrýt obojí (pokud nepřijde událost k instalaci)
        if (btnInstall) btnInstall.style.display = 'none';
        if (installHint) installHint.style.display = 'block';
    }
}

// 3. Android: Prohlížeč řekne "můžeš instalovat"
window.addEventListener('beforeinstallprompt', (e) => {
    deferredPrompt = e;

    const btnInstall = document.getElementById('btn-install');
    const installHint = document.getElementById('install-hint');

    // Pokud není nainstalováno, ukaž tlačítko
    if (!isAppInstalled()) {
        if (btnInstall) btnInstall.style.display = 'block';
        if (installHint) installHint.style.display = 'none';
    }
});

// 4. Akce na tlačítko (po kliknutí spustí instalaci)
document.getElementById('btn-install').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === 'accepted') {
        document.getElementById('btn-install').style.display = 'none';
    }
});

// 5. Reakce na úspěšnou instalaci
window.addEventListener('appinstalled', () => {
    updateInstallUI();
});

// Inicializace při startu stránky
updateInstallUI();

/* END === instalace aplikace === END */


// === VÝZVY A DUELY ===
function goToStep(step) {
    document.querySelectorAll('.challenge-menu').forEach(m => m.style.display = 'none');
    document.getElementById(`menuStep${step}`).style.display = 'flex';
    if (step === 3) renderOpponents();
}

function renderOpponents() {
    const list = document.getElementById("opponentList");
    list.innerHTML = "";
    allUsers.forEach(opponent => {
        const btn = document.createElement("button");
        btn.className = "menu-item";
        btn.textContent = opponent;
        btn.onclick = () => {
            selectedOpponent = opponent;
            goToStep(4);
        };
        list.appendChild(btn);
    });
}

const scrollValElem = document.getElementById("duel-scroll-value");
let duelTouchStart = 0;

scrollValElem.addEventListener("touchstart", (e) => duelTouchStart = e.touches[0].clientX);
scrollValElem.addEventListener("touchmove", (e) => {
    const diff = e.touches[0].clientX - duelTouchStart;
    if (Math.abs(diff) > 20) {
        duelValue = diff > 0 ? duelValue + 1 : Math.max(1, duelValue - 1);
        scrollValElem.textContent = duelValue;
        duelTouchStart = e.touches[0].clientX;
    }
});

scrollValElem.addEventListener("wheel", (e) => {
    e.preventDefault();
    duelValue = e.deltaY < 0 ? duelValue + 1 : Math.max(1, duelValue - 1);
    scrollValElem.textContent = duelValue;
});

scrollValElem.onclick = () => {
    alert(`Vyzván soupeř: ${selectedOpponent} na ${duelValue} kliků!`);
    toggleChallenges(null, false);
};

function toggleChallenges(event, expand) {
    if (event) event.stopPropagation();
    const container = document.getElementById("challengeContainer");
    const mainBtn = document.getElementById("mainChallengeBtn");

    if (expand) {
        container.classList.add("is-open");
        mainBtn.style.display = "none";
        goToStep(1);
    } else {
        container.classList.remove("is-open");
        document.querySelectorAll('.challenge-menu').forEach(m => m.style.display = 'none');
        setTimeout(() => {
            mainBtn.style.display = "block";
            duelValue = 20;
            scrollValElem.textContent = duelValue;
        }, 300);
    }
}

function log(msg) {
    const d = document.getElementById('debug-log');
    d.innerHTML += msg + '<br>';
    console.log(msg); // Stále to pošle i do normální konzole
}
  
// === INICIALIZACE ===
loadData();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('Service Worker registrován'))
      .catch(err => console.log('Chyba registrace:', err));
  });
}

// Funkce pro vyžádání notifikací
async function toggleNotifikace(MyName) {
    const me = allUsersData.find(u => u.name === MyName);
    if (!me) return;

    const btn = document.querySelector('#btn-enable-notify');
    const originalText = btn.textContent;
    btn.textContent = "Probíhá...";
    btn.disabled = true; // Zabrání vícenásobnému kliknutí

    try {
        if (me.subscriber) {
            // ODHLÁŠENÍ
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
                const sub = await reg.pushManager.getSubscription();
                if (sub) await sub.unsubscribe();
            }
            await fetch('/api/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: MyName })
            });
        } else {
            // PŘIHLÁŠENÍ
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error("Povolení nebylo uděleno");
            }

            const reg = await navigator.serviceWorker.ready;
            const newSub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: 'BOzWAelmL-SPR2rhZzIJ6x5cZ8ZpGAQ3D2wOQyuPtUkyibc7Vbvablr0o89_oWbSVd3BD20aY73RIQK6c3RWN1M'
            });

            await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: MyName, sub: newSub })
            });
            updateSettings('daily', true);
            updateSettings('rivals', true);
            updateSettings('challenges', false);
            updateSettings('records', false);
        }
    } catch (err) {
        console.error("Chyba:", err);
        alert("Nastala chyba při komunikaci se serverem.");
    } finally {
        // Obnovíme tlačítko
        btn.disabled = false;
        await loadData(); // Načte nová data
    }
}

function aktualizujStavUI() {
    const btn = document.querySelector('#btn-enable-notify');
    const options = document.querySelectorAll('.option.notifi');
    const me = allUsersData.find(u => u.name === MyName);

    if (!me) {
        console.error("Uživatel nenalezen v datech!");
        return;
      }
    if (me.subscriber) {
        btn.style.display = "block";
        btn.textContent = "Odebrat notifikace";
        options.forEach(opt => opt.style.display = 'flex');
    } else if (!me.subscriber) {
        btn.style.display = "block";
        btn.textContent = "Zapnout notifikace";
        options.forEach(opt => opt.style.display = 'none');
    }
    if (Notification.permission === "denied") {
        // Notifikace odmítnuty -> tlačítko zobrazíme, ale změníme text
        btn.style.display = "block";
        btn.textContent = "Notifikace jsou blokovány, povol je v nastavení prohlížeče";
    }
    const map = {
        'n-daily': me.settings.daily,
        'n-rivals': me.settings.rivals,
        'n-challenges': me.settings.challenges,
        'n-records': me.settings.records
    };

    Object.keys(map).forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = map[id];
    });


}

function toggleMenu() {
    const menu = document.getElementById("settings-menu");
    menu.classList.toggle("hidden");
    
    // Pokud menu otvíráme, vynutíme načtení aktuálního stavu z dat
    if (!menu.classList.contains("hidden")) {
        const me = allUsersData.find(u => u.name === MyName);
        if (me && me.settings) {
            aktualizujStavUI();
        }
    }
}

// Zavření menu při kliknutí mimo něj
document.addEventListener('click', (e) => {
    const menu = document.getElementById("settings-menu");
    const btn = document.getElementById("menu-btn");
    if (!menu.contains(e.target) && e.target !== btn) {
        menu.classList.add("hidden");
    }
});


// Funkce pro odeslání změny nastavení na server
async function updateSettings(settingKey, value) {
    const payload = {
        name: MyName,
        setting: settingKey, // např. 'daily'
        value: value         // true nebo false
    };

    await fetch('/api/update-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    console.log(`Nastavení ${settingKey} změněno na ${value}`);
}

window.onerror = function (message, source, lineno, colno, error) {
    const errorMsg = `CHYBA: ${message} (řádek: ${lineno})`;
    log(errorMsg); // Toto vypíše chybu do tvého debug-logu v HTML
    console.error(errorMsg); // Pro jistotu i do vývojářské konzole
    return false; // Nechá chybu probublat dál do prohlížeče
};

// Navíc zachytíme chyby v asynchronních funkcích (Promises)
window.addEventListener('unhandledrejection', function (event) {
    log("PROMISE CHYBA: " + event.reason);
    console.error("PROMISE CHYBA:", event.reason);
});




function saveSettings(cislo) {
    const inputVal = document.getElementById('btn' + cislo).value;

    // 2. Ulož HODNOTU (string) do localStorage
    localStorage.setItem('val' + cislo, inputVal);

    if(cislo != 2){
      const btn = document.getElementById('sendButton' + cislo);
      btn.textContent = inputVal; 
      btn.onclick = () => SendPushups(parseInt(inputVal));
    }
}

// Při startu aplikace načteme uloženou hodnotu
window.onload = () => {
    const saved1 = localStorage.getItem('val1');
    const saved2 = localStorage.getItem('val2');
    const saved3 = localStorage.getItem('val3');
    if (saved1) {
        const btn = document.getElementById('sendButton1');
        btn.textContent = saved1;
        btn.onclick = () => SendPushups(parseInt(saved1));
        const input = document.getElementById('btn1');
        if (input) input.value = saved1;
    }
    if (saved2) {
        const input = document.getElementById('btn2');
        if (input) input.value = saved2;
    }
    if (saved3) {
        const btn = document.getElementById('sendButton3');
        btn.textContent = saved3;
        btn.onclick = () => SendPushups(parseInt(saved3));
        const input = document.getElementById('btn3');
        if (input) input.value = saved3;
    }
};
