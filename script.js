const jadwalURL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9onTrr4oKwsFExdOvgN564Ej_0BNedec4MXjgS5NR5uG3zitH_2k8d_Z2V4ikVZZT1LkWiKLXOSiV/pub?gid=0&single=true&output=csv";
const tarawihURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9onTrr4oKwsFExdOvgN564Ej_0BNedec4MXjgS5NR5uG3zitH_2k8d_Z2V4ikVZZT1LkWiKLXOSiV/pub?gid=1281004923&single=true&output=csv";
const khotibURL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9onTrr4oKwsFExdOvgN564Ej_0BNedec4MXjgS5NR5uG3zitH_2k8d_Z2V4ikVZZT1LkWiKLXOSiV/pub?gid=1858181902&single=true&output=csv";
const kajianURL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9onTrr4oKwsFExdOvgN564Ej_0BNedec4MXjgS5NR5uG3zitH_2k8d_Z2V4ikVZZT1LkWiKLXOSiV/pub?gid=1741668718&single=true&output=csv";
const haditsURL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR9onTrr4oKwsFExdOvgN564Ej_0BNedec4MXjgS5NR5uG3zitH_2k8d_Z2V4ikVZZT1LkWiKLXOSiV/pub?gid=1335355124&single=true&output=csv";

let slideIndex = 0;
let haditsList = [];
let haditsIndex = 0;
let todayCols = null;

/* ================= DATE MATCH ================= */
function isTodayMatch(cols) {
   const now = new Date();
   return (
       parseInt(cols[0]) === now.getDate() &&
       parseInt(cols[1]) === now.getMonth() + 1 &&
       parseInt(cols[2]) === now.getFullYear()
   );
}
/* ================= HIJRI ================= */
function getHijriDatePretty() {
   const now = new Date();
   const parts = new Intl.DateTimeFormat("id-ID-u-ca-islamic", {
       day: "numeric",
       month: "long",
       year: "numeric"
   }).formatToParts(now);
   return `${parts.find(p=>p.type==="day").value} ${
       parts.find(p=>p.type==="month").value
   } ${parts.find(p=>p.type==="year").value} H`;
}
/* ================= ADZAN WINDOW ================= */
function isAdzanWindow(cols) {
   const now = new Date().getTime();
   const prayerTimes = [cols[3], cols[4], cols[5], cols[6], cols[7]];
   for (let time of prayerTimes) {
       if (!time?.includes(":")) continue;
       const [h, m] = time.split(":").map(Number);
       const adzan = new Date();
       adzan.setHours(h, m, 0, 0);
       const start = adzan.getTime() - 5 * 60000;
       const end   = adzan.getTime() + 15 * 60000;
       if (now >= start && now <= end) return true;
   }
   return false;
}
/* ================= PRAY STATE ================= */
function getPrayerState(cols) {

    const now = new Date();
    const nowMs = now.getTime();

    const prayers = [
        { name:"Subuh", key:"subuh", time:cols[3] },
        { name:"Dzuhur", key:"dzuhur", time:cols[4] },
        { name:"Ashar", key:"ashar", time:cols[5] },
        { name:"Maghrib", key:"maghrib", time:cols[6] },
        { name:"Isya", key:"isya", time:cols[7] }
    ];

    for (let p of prayers) {

        if (!p.time?.includes(":")) continue;

        const [h,m] = p.time.split(":").map(Number);
        const adzan = new Date();
        adzan.setHours(h,m,0,0);

        const prepareStart = adzan.getTime() - 5*60000;
        const activeEnd    = adzan.getTime() + 15*60000;

        if (nowMs >= prepareStart && nowMs <= adzan.getTime()) {
            return { type:"prepare", ...p, adzanTime:adzan.getTime() };
        }

        if (nowMs >= adzan.getTime() && nowMs <= activeEnd) {
            return { type:"active", ...p, endTime:activeEnd };
        }
    }

    return null;
}
/* ================= SLIDE ================= */
function getSlidesForToday() {
   const today = new Date().getDay();
   return today === 5
       ? ["slide-jadwal", "slide-tarawih", "slide-khotib"]
       : ["slide-jadwal", "slide-tarawih"];
}
function showSlide() {

    const prayerState = todayCols ? getPrayerState(todayCols) : null;

    let activeSlides;

    if (prayerState) {
        // Lock di jadwal
        activeSlides = ["slide-jadwal"];
        slideIndex = 0;
    } else {
        activeSlides = getSlidesForToday();
    }

    document.querySelectorAll(".slide")
        .forEach(s => s.classList.add("hidden"));

    const active = document.getElementById(activeSlides[slideIndex]);
    if (active) active.classList.remove("hidden");

    // 🔑 Hanya rotasi jika TIDAK dalam prayer mode
    if (!prayerState) {
        slideIndex++;
        if (slideIndex >= activeSlides.length) slideIndex = 0;
    }
}
/* ================= FETCH ================= */
async function fetchCSV(url) {
   const res = await fetch(url, { cache: "no-store" });
   return (await res.text()).split("\n").slice(1);
}
/* ================= LOAD HADITS ================= */
async function loadHadits() {
    try {
        const rows = await fetchCSV(haditsURL);

        haditsList = rows
            .map(r => r.split(",").map(c => c.trim()))
            .filter(cols => cols[1]?.toUpperCase() === "YA")
            .map(cols => cols[0]);

        if (haditsList.length === 0) {
            document.getElementById("hadits-box").textContent =
                "Data sedang dalam proses update....";
            return;
        }

        haditsIndex = 0;
        showHadits();

    } catch (e) {
        document.getElementById("hadits-box").textContent =
            "Hadits gagal dimuat";
    }
}

function showHadits() {

    if (!haditsList.length) return;

    const box = document.getElementById("hadits-box");

    box.classList.add("fade");

    setTimeout(() => {

        box.textContent = haditsList[haditsIndex];

        box.classList.remove("fade");

        haditsIndex++;
        if (haditsIndex >= haditsList.length)
            haditsIndex = 0;

    }, 300);
}
/* ================= JADWAL ================= */
async function loadJadwal() {
   const rows = await fetchCSV(jadwalURL);
   rows.forEach(row => {
       const cols = row.split(",").map(c => c.trim());
       if (isTodayMatch(cols)) {
           todayCols = cols;
           document.getElementById("subuh").textContent   = cols[3];
           document.getElementById("dzuhur").textContent  = cols[4];
           document.getElementById("ashar").textContent   = cols[5];
           document.getElementById("maghrib").textContent = cols[6];
           document.getElementById("isya").textContent    = cols[7];
           highlightNextPrayer(cols);
           updateCountdown(cols);
       }
   });
}
/* ================= HIGHLIGHT ================= */
function highlightNextPrayer(cols) {
   const prayerState = getPrayerState(cols);

   if (prayerState) {
   
       document.querySelectorAll(".prayer-table tr")
           .forEach(r=>r.classList.remove("highlight"));
   
       const row = document.getElementById("row-"+prayerState.key);
       if (row) row.classList.add("highlight");
   
       return;
   }
   
   const nowMinutes = new Date().getHours()*60 +
                      new Date().getMinutes();
   const prayers = [
       { name: "subuh",   time: cols[3] },
       { name: "dzuhur",  time: cols[4] },
       { name: "ashar",   time: cols[5] },
       { name: "maghrib", time: cols[6] },
       { name: "isya",    time: cols[7] }
   ];
   let next = null;
   prayers.forEach(p => {
       if (!next && p.time?.includes(":")) {
           const [h,m] = p.time.split(":").map(Number);
           if (h*60+m > nowMinutes) next = p.name;
       }
   });
   if (!next) next = "subuh";
   document.querySelectorAll(".prayer-table tr")
       .forEach(r=>r.classList.remove("highlight"));
   const row = document.getElementById("row-"+next);
   if (row) row.classList.add("highlight");
}
/* ================= COUNTDOWN ================= */
function updateCountdown(cols) {
  const prayerState = getPrayerState(cols);

   if (prayerState) {
   
       if (prayerState.type === "prepare") {
   
           const diff = prayerState.adzanTime - new Date().getTime();
   
           const h = Math.floor(diff/3600000);
           const m = Math.floor((diff%3600000)/60000);
           const s = Math.floor((diff%60000)/1000);
   
           document.getElementById("next-prayer-name")
               .textContent = "Menuju " + prayerState.name;
   
           document.getElementById("next-prayer-countdown")
               .textContent =
               `${String(h).padStart(2,"0")}:${
                   String(m).padStart(2,"0")}:${
                   String(s).padStart(2,"0")}`;
   
           return;
       }
   
       if (prayerState.type === "active") {
   
           const diff = prayerState.endTime - new Date().getTime();
   
           const m = Math.floor(diff/60000);
           const s = Math.floor((diff%60000)/1000);
   
           document.getElementById("next-prayer-name")
               .textContent = "Telah Masuk Waktu " + prayerState.name;
   
           document.getElementById("next-prayer-countdown")
               .textContent =
               `00:${String(m).padStart(2,"0")}:${
                   String(s).padStart(2,"0")}`;
   
           return;
       }
   }
   
   const now = new Date();
   const nowMs = now.getTime();
   const prayers = [
       { name:"Subuh",   time:cols[3] },
       { name:"Dzuhur",  time:cols[4] },
       { name:"Ashar",   time:cols[5] },
       { name:"Maghrib", time:cols[6] },
       { name:"Isya",    time:cols[7] }
   ];
   let next = null;
   prayers.forEach(p=>{
       if(!next && p.time?.includes(":")){
           const [h,m]=p.time.split(":").map(Number);
           const d=new Date();
           d.setHours(h,m,0,0);
           if(d.getTime()>nowMs) next={...p,date:d};
       }
   });
   if(!next){
       const [h,m]=cols[3].split(":").map(Number);
       const d=new Date();
       d.setDate(d.getDate()+1);
       d.setHours(h,m,0,0);
       next={name:"Subuh",date:d};
   }
   const diff = next.date-nowMs;
   const h = Math.floor(diff/3600000);
   const m = Math.floor((diff%3600000)/60000);
   const s = Math.floor((diff%60000)/1000);
   document.getElementById("next-prayer-name")
       .textContent="Menuju "+next.name;
   document.getElementById("next-prayer-countdown")
       .textContent=`${String(h).padStart(2,"0")}:${
           String(m).padStart(2,"0")}:${
           String(s).padStart(2,"0")}`;
}
/* ================= KHOTIB ================= */
async function loadKhotib(){
   const rows=await fetchCSV(khotibURL);
   let html="";
   rows.forEach(r=>{
       const cols=r.split(",").map(c=>c.trim());
       if(isTodayMatch(cols)){
           html+=`<div>🕌 ${cols[3]} : ${cols[4]}</div>`;
       }
   });
   document.getElementById("khotib-hijri")
       .textContent=getHijriDatePretty();
   document.getElementById("khotib-date")
       .textContent=new Date().toLocaleDateString("id-ID",{
           weekday:"long",day:"numeric",month:"long",year:"numeric"
       });
   document.getElementById("khotib-content").innerHTML =
       html || "<div>Data sedang dalam proses update....</div>";
}
/* ================= TARAWIH ================= */
async function loadTarawih(){
   const rows=await fetchCSV(tarawihURL);
   let html="";
   rows.forEach(r=>{
       const cols=r.split(",").map(c=>c.trim());
       if(isTodayMatch(cols)){
           html+=`
<div>Townsite : ${cols[3]}</div>
<div>NCC : ${cols[4]}</div>
<div>Benete : ${cols[5]}</div>
<div>Smelter : ${cols[6]}</div>`;
       }
   });
   document.getElementById("tarawih-hijri")
       .textContent=getHijriDatePretty();
   document.getElementById("tarawih-date")
       .textContent=new Date().toLocaleDateString("id-ID",{
           weekday:"long",day:"numeric",month:"long",year:"numeric"
       });
   document.getElementById("tarawih-content").innerHTML =
       html || "<div>Data sedang dalam proses update....</div>";
}
/* ================= CLOCK ================= */
function updateClock(){
   const now=new Date();
   document.getElementById("clock")
       .textContent=now.toLocaleTimeString("id-ID",{hour12:false});
   document.getElementById("date")
       .textContent=now.toLocaleDateString("id-ID",{
           weekday:"long",day:"numeric",month:"long",year:"numeric"
       });
}
/* ================= INTERVAL ================= */
setInterval(updateClock,1000);
setInterval(showSlide,10000);
setInterval(loadJadwal,60000);
setInterval(loadTarawih,60000);
setInterval(loadKhotib,60000);
setInterval(showHadits, 8000);
setInterval(loadHadits, 180000);
setInterval(() => {
    if (todayCols) {

        updateCountdown(todayCols);
        highlightNextPrayer(todayCols);

        const prayerState = getPrayerState(todayCols);

        if (prayerState) {
            showSlide(); // hanya paksa lock kalau sedang prayer
        }
    }
}, 1000);
/* ================= INIT ================= */
updateClock();
showSlide();
loadJadwal();
loadTarawih();
loadKhotib();
loadHadits();
