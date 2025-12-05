function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

const searchInput = document.getElementById("globalSearchInput");
const resultsBox = document.getElementById("searchResultsBox");

async function fetchResults(query) {
    if (!query.trim()) {
        resultsBox.classList.add("hidden");
        resultsBox.innerHTML = "";
        return;
    }

    try {
        const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        let html = "";

        if (data.properties.length === 0 && data.tenders.length === 0) {
            html = `<p class="p-4 text-gray-500">No results found</p>`;
        }

        // PROPERTIES
        if (data.properties.length > 0) {
            html += `<h3 class="p-2 text-sm text-gray-600 font-semibold">Properties</h3>`;
            data.properties.forEach(p => {
                html += `
                    <a href="/properties/${p._id}" 
                       class="block p-3 hover:bg-gray-100 dark:hover:bg-slate-700">
                       <p class="font-semibold">${p.title}</p>
                       <p class="text-gray-500 text-sm">${p.location || ""}</p>
                    </a>
                `;
            });
        }

        // TENDERS
        if (data.tenders.length > 0) {
            html += `<h3 class="p-2 text-sm text-gray-600 font-semibold">Tenders</h3>`;
            data.tenders.forEach(t => {
                html += `
                    <a href="/tenders/${t._id}" 
                       class="block p-3 hover:bg-gray-100 dark:hover:bg-slate-700">
                       <p class="font-semibold">${t.title}</p>
                       <p class="text-gray-500 text-sm">${t.dept}</p>
                    </a>
                `;
            });
        }

        resultsBox.innerHTML = html;
        resultsBox.classList.remove("hidden");

    } catch (err) {
        console.error("Search error:", err);
    }
}
console.log("Search JS loaded");
searchInput.addEventListener("input", debounce(e => fetchResults(e.target.value), 400));