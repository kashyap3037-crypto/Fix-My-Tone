// ─── Character Counter ───────────────────────────────────────────────────────
const inputTextEl = document.getElementById("inputText");
inputTextEl.addEventListener("input", () => {
    document.getElementById("charCount").textContent = inputTextEl.value.length;
});

// ─── Output Style Pills ───────────────────────────────────────────────────────
let selectedOutputStyle = "Highly Formal (Corporate)";

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".style-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll(".style-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            selectedOutputStyle = pill.dataset.value;
        });
    });
});

// ─── Convert ─────────────────────────────────────────────────────────────────
async function convertText() {
    const input     = inputTextEl.value.trim();
    const tone      = document.getElementById("tone").value;
    const outputEl  = document.getElementById("outputText");
    const outputBox = document.getElementById("outputBox");
    const convertBtn = document.getElementById("convertBtn");
    const btnText   = document.getElementById("convertBtnText");
    const rewriteBtn = document.getElementById("rewriteBtn");

    if (!input) {
        inputTextEl.focus();
        inputTextEl.style.borderColor = "rgba(239,68,68,0.6)";
        setTimeout(() => { inputTextEl.style.borderColor = ""; }, 1500);
        return;
    }

    // Loading state
    convertBtn.disabled = true;
    rewriteBtn.disabled = true;
    convertBtn.classList.add("loading");
    btnText.textContent  = "Polishing...";
    outputEl.textContent = "Analysing your text... ✦";
    outputEl.classList.remove("result-ready");
    outputBox.classList.remove("has-result");
    outputEl.classList.add("loading-animation");

    try {
        const res  = await fetch("/api/convert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input, tone, outputStyle: selectedOutputStyle })
        });
        const data = await res.json();

        if (data.error) {
            outputEl.textContent = `⚠ ${data.error}`;
        } else {
            // Typewriter reveal
            await typeWriter(outputEl, data.result);
            outputEl.classList.add("result-ready");
            outputBox.classList.add("has-result");
            rewriteBtn.style.display = "flex";
        }
    } catch (err) {
        outputEl.textContent = `⚠ Network error: ${err.message}`;
    } finally {
        outputEl.classList.remove("loading-animation");
        convertBtn.disabled  = false;
        rewriteBtn.disabled  = false;
        convertBtn.classList.remove("loading");
        btnText.textContent  = "Polish It";
    }
}

// ─── Typewriter Effect ────────────────────────────────────────────────────────
function typeWriter(el, text, speed = 10) {
    return new Promise(resolve => {
        el.textContent = "";
        let i = 0;
        const interval = setInterval(() => {
            el.textContent += text[i];
            i++;
            if (i >= text.length) {
                clearInterval(interval);
                resolve();
            }
        }, speed);
    });
}

// ─── Copy ─────────────────────────────────────────────────────────────────────
function copyText() {
    const text = document.getElementById("outputText").textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => showToast("Copied!"));
}

function refreshForm() {
    const inputEl   = document.getElementById("inputText");
    const outputEl  = document.getElementById("outputText");
    const outputBox = document.getElementById("outputBox");
    const rewriteBtn = document.getElementById("rewriteBtn");
    const refreshIcon = document.querySelector("#refreshBtn svg");

    inputEl.value = "";
    document.getElementById("charCount").textContent = "0";
    outputEl.textContent = "Your polished text will appear here...";
    outputEl.classList.remove("result-ready");
    outputBox.classList.remove("has-result");
    rewriteBtn.style.display = "none";

    // Spin the refresh icon briefly
    refreshIcon.style.transition = "transform 0.5s ease";
    refreshIcon.style.transform  = "rotate(360deg)";
    setTimeout(() => {
        refreshIcon.style.transition = "none";
        refreshIcon.style.transform  = "";
    }, 500);

    inputEl.focus();
}

function showToast(msg) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
}

// ─── Tab Switching ────────────────────────────────────────────────────────────
function switchTab(tabId) {
    const polisherSec  = document.getElementById("polisherSection");
    const historySec   = document.getElementById("historySection");
    const tabPolisher  = document.getElementById("tab-polisher");
    const tabHistory   = document.getElementById("tab-history");

    if (tabId === "history") {
        polisherSec.style.display  = "none";
        historySec.style.display   = "block";
        tabPolisher.classList.remove("active");
        tabPolisher.setAttribute("aria-selected", "false");
        tabHistory.classList.add("active");
        tabHistory.setAttribute("aria-selected", "true");
        fetchHistory();
    } else {
        historySec.style.display   = "none";
        polisherSec.style.display  = "block";
        tabHistory.classList.remove("active");
        tabHistory.setAttribute("aria-selected", "false");
        tabPolisher.classList.add("active");
        tabPolisher.setAttribute("aria-selected", "true");
    }
}

// ─── Fetch History ────────────────────────────────────────────────────────────
async function fetchHistory() {
    const list   = document.getElementById("historyList");
    const badge  = document.getElementById("historyBadge");
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading...</p></div>`;

    try {
        const res  = await fetch("/api/history");
        const data = await res.json();

        badge.textContent = data.length || 0;

        if (!data || data.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🕐</div>
                    <p>No conversions yet.</p>
                    <span>Polish some text first!</span>
                </div>`;
            return;
        }

        list.innerHTML = "";
        data.forEach((item, i) => {
            const card = document.createElement("div");
            card.className = "history-card";
            card.style.animationDelay = `${i * 0.05}s`;
            const date = item.created_at
                ? new Date(item.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                : "";
            card.innerHTML = `
                <div class="history-tone">${item.tone || "Unknown"}</div>
                <div class="history-original">"${escapeHtml(item.original_text)}"</div>
                <div class="history-result">${escapeHtml(item.converted_text)}</div>
                ${date ? `<div class="history-time">${date}</div>` : ""}
            `;
            list.appendChild(card);
        });
    } catch (e) {
        list.innerHTML = `<div class="empty-state"><p>⚠ Failed to load history</p><span>${e.message}</span></div>`;
    }
}

function escapeHtml(str = "") {
    return str
        .replace(/&/g,  "&amp;")
        .replace(/</g,  "&lt;")
        .replace(/>/g,  "&gt;")
        .replace(/"/g,  "&quot;");
}