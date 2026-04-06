async function convertText() {
    const input = document.getElementById("inputText").value;
    const tone = document.getElementById("tone").value;
    const outputText = document.getElementById("outputText");
    const convertBtn = document.getElementById("convertBtn");
    const rewriteBtn = document.getElementById("rewriteBtn");
    
    if (!input) return;

    // Set loading state
    outputText.innerText = "Polishing your text... ⏳";
    outputText.classList.add("loading-animation");
    convertBtn.disabled = true;
    rewriteBtn.disabled = true;

    try {
        const response = await fetch("/api/convert", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ input, tone })
        });

        const data = await response.json();
        if (data.error) {
            outputText.innerText = `Error: ${data.error}`;
        } else {
            outputText.innerText = data.result;
            // Reveal rewrite button when successful
            rewriteBtn.style.display = "inline-block";
        }
    } catch (err) {
        outputText.innerText = `Fetch Error: ${err.message}`;
    } finally {
        // Remove loading state
        outputText.classList.remove("loading-animation");
        convertBtn.disabled = false;
        rewriteBtn.disabled = false;
    }
}

function copyText(text) {
    const textToCopy = text || document.getElementById("outputText").innerText;
    navigator.clipboard.writeText(textToCopy);
    alert("Copied!");
}

function switchTab(tabId) {
    const polisherSec = document.getElementById("polisherSection");
    const historySec = document.getElementById("historySection");
    const tabPolisher = document.getElementById("tab-polisher");
    const tabHistory = document.getElementById("tab-history");

    if (tabId === 'history') {
        polisherSec.style.display = 'none';
        historySec.style.display = 'block';
        tabPolisher.classList.remove('active');
        tabHistory.classList.add('active');
        fetchHistory();
    } else {
        polisherSec.style.display = 'block';
        historySec.style.display = 'none';
        tabPolisher.classList.add('active');
        tabHistory.classList.remove('active');
    }
}

async function fetchHistory() {
    const historyList = document.getElementById("historyList");
    historyList.innerHTML = "<p>Loading your past conversions...</p>";
    
    try {
        const res = await fetch("/api/history");
        const data = await res.json();
        
        if (!data || data.length === 0) {
            historyList.innerHTML = "<p>No past conversions yet. Time to polish some text!</p>";
            return;
        }

        historyList.innerHTML = "";
        data.forEach(item => {
            const card = document.createElement("div");
            card.className = "history-card";
            card.innerHTML = `
                <div class="history-tone">${item.tone}</div>
                <div class="history-original">"${item.original_text}"</div>
                <div class="history-result">${item.converted_text}</div>
            `;
            historyList.appendChild(card);
        });
    } catch (e) {
        historyList.innerHTML = `<p>Error loading history: ${e.message}</p>`;
    }
}