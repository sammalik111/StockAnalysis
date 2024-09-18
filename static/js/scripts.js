document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM is ready');

    // Initialize sidebar functionality
    initializeSidebar(); 

    // Initialize theme toggle button functionality
    initializeThemeToggle(); 

    // Defer fetching crypto data to the background
    // setTimeout(fetchCryptoData, 0);  

    // Lazy load news and recommendations after full page load
    // window.addEventListener('load', () => {
    //     fetchNews(); 
    //     fetchRecommendations();
    // });

    // Debounced search input handler
    const debouncedSearch = debounce(handleSearch, 300);
    const searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('input', debouncedSearch);

    // Set up stock cards after a delay to avoid blocking DOMContentLoaded
    setTimeout(setupStockCards, 5000);  // Delay stock card setup

    // Initialize add, remove, and rising stock functionalities
    initializeAddStock();
    initializeRemoveStock();
    initializeRisingStockFilter();

    // Initialize opening and closing of stock cards
    initializeStockCardToggle();
});

// Helper Functions:

// Sidebar initialization
function initializeSidebar() {
    const sidenav = document.querySelector('.sidenav');
    const container = document.querySelector('.container');
    const toggleSidebarBtn = document.querySelector('.toggle-sidebar-btn');

    toggleSidebarBtn.addEventListener('click', function () {
        sidenav.classList.toggle('hidden');

        if (sidenav.classList.contains('hidden')) {
            container.classList.add('expanded'); // Full width when sidebar is hidden
        } else {
            container.classList.remove('expanded'); // Centered when sidebar is visible
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

// Fetch and display crypto data with a deferred background process
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

    Promise.all(promises)
        .then(results => {
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
        })
        .catch(err => console.error('Error fetching crypto data:', err));
}

// Fetch crypto data helper
function fetchCryptoDataFor(crypto) {
    const apiUrl = `https://api.coinpaprika.com/v1/tickers/${crypto.id}`;
    const stockUrl = `/search_stock?query=${crypto.name}`;

    return Promise.all([
        fetch(apiUrl).then(response => response.json()),
        fetch(stockUrl).then(response => response.json())
    ]);
}

// Fetch and display news articles lazily
function fetchNews() {
    fetch('/news')
        .then(response => response.json())
        .then(data => {
            const newsContainer = document.querySelector('.news-container');
            newsContainer.innerHTML = '';
            data.forEach(news => {
                console.log(news.link);  // Ensure the URL is valid

                newsContainer.innerHTML += `
                    <div class="news-card">
                        <h3 class="news-title">${news.title}</h3>
                        <div class="news-source">${news.source}</div>
                        <div>${news.stock_name}</div>
                        <a href="${news.link}" class="news-link" target="_blank">Read More</a>
                    </div>`;
            });
        })
        .catch(err => console.error('Error fetching news:', err));
}

// Fetch and display recommendations lazily
function fetchRecommendations() {
    fetch('/recommendations')
        .then(response => response.json())
        .then(data => {
            const recommendationContainer = document.querySelector('.recommendation-container');
            recommendationContainer.innerHTML = '';
            data.forEach(recommendation => {
                recommendationContainer.innerHTML += `
                    <div class="stock-card">
                        <div class="stock-top-row">
                            <h3>${recommendation}</h3>
                            <button class="add-stock">+</button>
                        </div>
                        <div class="price">N/A</div>
                        <div class="change">N/A%</div>
                    </div>`;
            });
        })
        .catch(err => console.error('Error fetching recommendations:', err));
}

// Add stock functionality (handles search results <li>, stock cards, and recommended stock cards)
function initializeAddStock() {
    document.addEventListener('click', function (e) {
        // Check if the clicked element is the add-stock button
        if (!e.target.classList.contains('add-stock')) return;

        // Determine whether the click is from a search result <li>, a stock card, or a recommended stock card
        const parentElement = e.target.closest('li') || e.target.closest('.stock-card') || e.target.closest('.recommended-stock');
        if (!parentElement) return;

        // Extract stock data
        const symbol = parentElement.dataset.symbol || parentElement.querySelector('h3').innerText;
        const name = parentElement.dataset.name || parentElement.querySelector('.stock-name')?.innerText || symbol;
        const type = parentElement.dataset.type || 'recommended';
        const displaySymbol = parentElement.dataset.displaySymbol || symbol;

        // Send data to the server to add the stock
        if (symbol && name && type && displaySymbol) {
            fetch('/add_stock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ symbol, name, type, displaySymbol })
            })
            .then(response => response.json())
            .then(data => {
                if (data.favorites) {
                    parentElement.remove(); // Remove the stock card or <li> from the DOM
                    window.location.reload(); // Reload to update the list
                } else {
                    console.error('Error adding stock:', data.error);
                }
            })
            .catch(err => console.error('Error adding stock:', err));
        } else {
            console.error('Missing stock data.');
        }
    });
}


// Remove stock functionality (optimized for async behavior)
function initializeRemoveStock() {
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('remove-stock')) {
            const stockCard = e.target.closest('.stock-card');
            const symbol = stockCard.querySelector('h3').innerText;

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
                    card.style.display = 'block'; // Show stocks
                }
            }
        });
    });
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
                // Populate search results
                searchList.innerHTML = ''; 

                // Check if there is an error in the response
                if (data.error) {
                    const li = document.createElement('li');
                    li.textContent = 'No results found or error occurred';
                    searchList.appendChild(li);
                } else {
                    // Loop through the matches and display each result
                    for (let i = 0; i < data.length; i++) {
                        const stock = data[i];
                        const li = document.createElement('li');
                        li.classList.add('search-item');  // Add a class for styling

                        // Ensure the structure is correct
                        li.innerHTML = `
                            <strong>${stock.name} (${stock.symbol})</strong>
                            <button class="add-stock">+</button>
                        `;
                        // Set data attributes on the parent <li> for easy access
                        li.dataset.symbol = stock.symbol;
                        li.dataset.name = stock.name;
                        li.dataset.type = stock.type;
                        li.dataset.displaySymbol = stock.displaySymbol;
                        searchList.appendChild(li);  // Append to the list
                    }
                }
            })
            .catch(err => console.error('Error fetching stock data:', err));
    }
}

// Debounce function to avoid rapid fetching
function debounce(func, delay) {
    let debounceTimer;
    return function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, arguments), delay);
    };
}

// Stock card setup after 1 second delay
function setupStockCards() {
    const stockCards = document.querySelectorAll('.stock-card');
    stockCards.forEach(card => {
        const symbol = card.querySelector('h3').innerText;
        fetch(`/get_stock_data?symbol=${encodeURIComponent(symbol)}`)
            .then(response => response.json())
            .then(data => {
                if (data.price && data.change) {
                    card.querySelector('.price').innerText = `$${data.price.toFixed(2)}`;
                    card.querySelector('.change').innerText = `${data.change.toFixed(2)}%`;
                    // add classes based on the change percentage
                    const changeElement = card.querySelector('.change');
                    changeElement.classList.remove('positive', 'negative'); // Reset classes
                    if (data.change < 0) {
                        changeElement.classList.add('negative');
                    } else {
                        changeElement.classList.add('positive');
                    }
                }
            })
            .catch(error => console.error('Error fetching stock data:', error));
    });
}


function initializeStockCardToggle() {
    document.addEventListener('click', function (e) {
        // Check if the clicked element or its parent is a stock card
        const stockCard = e.target.closest('.stock-card');
        
        // Ensure it's not a button inside the stock card (like add or remove buttons)
        if (stockCard && !e.target.classList.contains('add-stock') && !e.target.classList.contains('remove-stock')) {
            // Get the ticker, price, and change of the stock
            const symbol = stockCard.querySelector('h3').innerText;
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



