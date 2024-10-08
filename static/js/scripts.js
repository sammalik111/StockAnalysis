document.addEventListener('DOMContentLoaded', async function () {
    console.log('DOM is ready');

    // Initialize sidebar functionality
    initializeSidebar(); 

    // Initialize theme toggle button functionality
    initializeThemeToggle(); 

    // Fetch crypto data and other independent tasks asynchronously
    setTimeout(fetchCryptoData, 0);  

    // Fetch news and recommendations after full page load
    window.addEventListener('load', async () => {
        await setupStockCards();  // Wait for recommendations, then set up stock cards
    });

    // Debounced search input handler
    const debouncedSearch = debounce(handleSearch, 300);
    const searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('input', debouncedSearch);

    // Initialize add, remove, and rising stock functionalities
    initializeAddStock();
    initializeRemoveStock();
    initializeRisingStockFilter();

    // Initialize opening and closing of stock cards
    initializeStockCardToggle();

    // Initialize filtering for my stocks
    filterMyStock();

    // Fetch news every 5 minutes
    await fetchNews(); 
});

// Debounce function to avoid rapid fetching
function debounce(func, delay) {
    let debounceTimer;
    return function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, arguments), delay);
    };
}


// Search handling with debounce
function handleSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchList = document.querySelector('.search-list');
    const query = searchInput.value.trim();
    if (query.length > 0) {
        fetch(`/search_stock?query=${query}`)
            .then(response => response.json())
            .then(data => {
                // Clear previous search results
                searchList.innerHTML = ''; 

                // Check if there is an error in the response
                if (data.error) {
                    const li = document.createElement('li');
                    li.textContent = 'No results found or error occurred';
                    searchList.appendChild(li);
                } else {
                    // Loop through the matches and display each result
                    data.forEach(stock => {
                        const li = document.createElement('li');
                        li.classList.add('search-item');  // Add a class for styling

                        // Structure for <li> with the button
                        li.innerHTML = `
                            <span class="stock-info">
                                <strong>${stock.name}   (${stock.symbol})</strong>
                            </span>
                            <button class="add-stock">+</button>
                        `;

                        // Set data attributes on the parent <li> for easy access
                        li.dataset.symbol = stock.symbol;
                        li.dataset.name = stock.name;
                        li.dataset.type = stock.type;
                        li.dataset.displaySymbol = stock.displaySymbol;
                        searchList.appendChild(li);  // Append to the list
                    });
                }
            })
            .catch(err => console.error('Error fetching stock data:', err));
    }
}



// Sidebar initialization
function initializeSidebar() {
    const sidenav = document.querySelector('.sidenav');
    const container = document.querySelector('.container');
    const toggleSidebarBtn = document.querySelector('.toggle-sidebar-btn');

    toggleSidebarBtn.addEventListener('click', function () {
        sidenav.classList.toggle('hidden');

        if (sidenav.classList.contains('hidden')) {
            container.classList.add('expanded');
            toggleSidebarBtn.classList.add('expanded');
        } else {
            container.classList.remove('expanded');
            toggleSidebarBtn.classList.remove('expanded');
        }
    });
}

// Theme toggle initialization
function initializeThemeToggle() {
    document.getElementById('theme-stylesheet').disabled = false;
    document.getElementById('day-mode-stylesheet').disabled = true;

    document.getElementById('toggle-mode-btn').addEventListener('click', () => {
        const isNightMode = !document.getElementById('theme-stylesheet').disabled;

        document.getElementById('theme-stylesheet').disabled = isNightMode;
        document.getElementById('day-mode-stylesheet').disabled = !isNightMode;
    });
}

// Fetch and display crypto data asynchronously
async function fetchCryptoData() {
    const cryptos = [
        { name: 'Bitcoin', id: 'btc-bitcoin' },
        { name: 'Ethereum', id: 'eth-ethereum' },
        { name: 'Ripple', id: 'xrp-xrp' },
        { name: 'Polkadot', id: 'dot-polkadot' },
        { name: 'Chainlink', id: 'link-chainlink' },
        { name: 'Uniswap', id: 'uni-uniswap' },
        { name: 'Binance Coin', id: 'bnb-binance-coin' },
        { name: 'DOGE/ETH', id: 'doge-dogecoin' },
    ];

    const cryptoContainer = document.querySelector('.crypto-container');
    const promises = cryptos.map(crypto => fetchCryptoDataFor(crypto));

    try {
        const results = await Promise.all(promises);
        cryptoContainer.innerHTML = ''; // Clear any placeholders
        results.forEach(([cryptoData, stockData]) => {
            const price = cryptoData.quotes.USD.price.toFixed(2);
            const change = cryptoData.quotes.USD.percent_change_24h.toFixed(2);
            const positiveChange = change[0] === '-' ? 'negative' : 'positive';

            cryptoContainer.innerHTML += `
                <div class="crypto-card">
                    <div class="crypto-name">${cryptoData.name}</div>
                    <div class="crypto-stats">
                        <div class="price">$${price}</div>
                        <div class="change ${positiveChange}">${change}%</div>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error('Error fetching crypto data:', err);
    }
}

// Fetch crypto data helper
async function fetchCryptoDataFor(crypto) {
    const apiUrl = `https://api.coinpaprika.com/v1/tickers/${crypto.id}`;
    const stockUrl = `/search_stock?query=${crypto.name}`;

    try {
        const [cryptoData, stockData] = await Promise.all([
            fetch(apiUrl).then(response => response.json()),
            fetch(stockUrl).then(response => response.json())
        ]);

        return [cryptoData, stockData];
    } catch (err) {
        console.error('Error fetching data for', crypto.name, ':', err);
        return [null, null];
    }
}

// Fetch and display news articles lazily
async function fetchNews() {
    try {
        const response = await fetch('/news');
        const data = await response.json();
        const newsContainer = document.querySelector('.news-container');
        newsContainer.innerHTML = '';

        data.forEach(news => {
            newsContainer.innerHTML += `
                <div class="news-card">
                    <div class="news-header">
                        <div class="news-source">${news.source}</div>
                    </div>
                    <h3 class="news-title">${news.title}</h3>
                    <div>${news.stock_name}</div>
                    <div class="news-footer">
                        <a href="${news.link}" class="news-link" target="_blank">Read More</a>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error('Error fetching news:', err);
    }
}

// Fetch and display recommendations asynchronously
async function fetchRecommendations() {
    try {
        const response = await fetch('/recommendations');
        const data = await response.json();
        const recommendationContainer = document.querySelector('.recommendation-container');
        recommendationContainer.innerHTML = '';

        data.forEach(recommendation => {
            recommendationContainer.innerHTML += `
                <div class="stock-card">
                    <div class="stock-name">${recommendation}</div>
                    <div class="price">$N/A</div>
                    <div class="change">N/A%</div>
                    <button class="add-stock">+</button>
                </div>
            `;
        });
    } catch (err) {
        console.error('Error fetching recommendations:', err);
    }
}

// Add stock functionality (handles search results <li>, stock cards, and recommended stock cards)
function initializeAddStock() {
    document.addEventListener('click', async function (e) {
        if (e.target.classList.contains('add-stock')) {
            const parentElement = e.target.closest('.stock-card');
            const symbol = parentElement.dataset.symbol || parentElement.querySelector('.stock-name')?.innerText;
            const name = parentElement.dataset.name || symbol;
            const type = parentElement.dataset.type || 'recommended';
            const displaySymbol = parentElement.dataset.displaySymbol || symbol;

            if (symbol && name && type && displaySymbol) {
                try {
                    const response = await fetch('/add_stock', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ symbol, name, type, displaySymbol })
                    });
                    const data = await response.json();
                    if (data.favorites) {
                        parentElement.remove();  // Remove the stock card from DOM
                    } else {
                        console.error('Error adding stock:', data.error);
                    }
                } catch (err) {
                    console.error('Error adding stock:', err);
                }
            } else {
                console.error('Missing stock data.');
            }
        }
    });
}


// Remove stock functionality (optimized for async behavior)
function initializeRemoveStock() {
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('remove-stock')) {
            const stockCard = e.target.closest('.stock-card');
            const symbol = stockCard.querySelector('.stock-name').innerText;

            if (symbol) {
                fetch('/remove_stock', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ symbol: symbol })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.favorites) {
                        stockCard.remove(); // Remove stock card from the DOM
                    } else {
                        console.error('Error removing stock:', data.error);
                    }
                })
                .catch(err => console.error('Error removing stock:', err));
            }
        }
    });
}

// Set up stock cards after fetching recommendations
async function setupStockCards() {
    // only await if the page has recommendations to fetch in index.html
    if (document.querySelector('.recommendation-container')) {
        await fetchRecommendations(); // Ensure recommendations are fetched before setting up stock cards
    }

    const stockCards = document.querySelectorAll('.stock-card');
    stockCards.forEach(async card => {
        const symbol = card.querySelector('.stock-name').innerText;
        try {
            const response = await fetch(`/get_stock_data?symbol=${encodeURIComponent(symbol)}`);
            const data = await response.json();
            if (data.price && data.change) {
                card.querySelector('.price').innerText = `$${data.price.toFixed(2)}`;
                card.querySelector('.change').innerText = `${data.change.toFixed(2)}%`;

                const changeElement = card.querySelector('.change');
                changeElement.classList.toggle('positive', data.change >= 0);
                changeElement.classList.toggle('negative', data.change < 0);
            }
        } catch (err) {
            console.error('Error fetching stock data:', err);
        }
    });
}

// Display only rising stocks
function initializeRisingStockFilter() {
    const risingCheckbox = document.querySelector('.rising');
    risingCheckbox.addEventListener('change', function () {
        const stockCards = document.querySelectorAll('.stock-card');
        stockCards.forEach(card => {
            const changeElement = card.querySelector('.change');
            if (changeElement) {
                const changeValue = parseFloat(changeElement.textContent.replace('%', ''));
                if (risingCheckbox.checked && changeValue < 0) {
                    card.style.display = 'none'; // Hide stocks with negative change
                } else {
                    card.style.display = 'flex'; // Show stocks
                }
            }
        });
    });
}

function filterMyStock(){
    // JavaScript to filter the stocks list
    document.getElementById('stockSearch').addEventListener('input', function() {
        const filterValue = this.value.toLowerCase();
        const stockCards = document.querySelectorAll('.my-stock');

        stockCards.forEach(function(card) {
            const stockName = card.querySelector('.stock-name').textContent.toLowerCase();
            
            // Check if the stock name includes all the letters in the search box
            let matches = true;
            for (let i = 0; i < filterValue.length; i++) {
                if (!stockName.includes(filterValue[i])) {
                    matches = false;
                    break;
                }
            }

            // Toggle visibility based on the matching criteria and reload the styling
            if (matches) {
                card.style.display = 'flex';
                
            } else {
                card.style.display = 'none';
            }
        });
    });
}

function initializeStockCardToggle() {
    document.addEventListener('click', function (e) {
        // Check if the clicked element or its parent is a stock card
        const stockCard = e.target.closest('.stock-card');
        
        // Ensure it's not a button inside the stock card (like add or remove buttons)
        if (stockCard && !e.target.classList.contains('add-stock') && !e.target.classList.contains('remove-stock')) {
            // Get the ticker, price, and change of the stock
            const symbol = stockCard.querySelector('.stock-name').innerText;
            const price = parseFloat(stockCard.querySelector('.price').innerText.replace('$', ''));
            const change = parseFloat(stockCard.querySelector('.change').innerText.replace('%', ''));

            console.log("symbol %s price %s change %s", symbol, price, change);
            if (symbol) {
                // Redirect to the stock page with the symbol as a query parameter
                window.location.href = `/stock?symbol=${encodeURIComponent(symbol)}&price=${encodeURIComponent(price)}&change=${encodeURIComponent(change)}`;
            } else {
                console.error('Stock symbol not found.');
            }
        }
    });
}


