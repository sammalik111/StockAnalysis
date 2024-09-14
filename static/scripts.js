document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM is ready');
    const sidenav = document.querySelector('.sidenav');
    const container = document.querySelector('.container');
    const toggleSidebarBtn = document.querySelector('.toggle-sidebar-btn');

    toggleSidebarBtn.addEventListener('click', function () {
        // Toggle the sidebar visibility
        sidenav.classList.toggle('hidden');

        // Adjust the container width based on sidebar visibility
        if (sidenav.classList.contains('hidden')) {
            container.classList.add('expanded'); // Full width when sidebar is hidden
        } else {
            container.classList.remove('expanded'); // Center it when sidebar is visible
        }
    });


    // Initially set the theme to night mode
    document.getElementById('theme-stylesheet').disabled = false;
    document.getElementById('day-mode-stylesheet').disabled = true;

    document.getElementById('toggle-mode-btn').addEventListener('click', () => {
        const isNightMode = !document.getElementById('theme-stylesheet').disabled;

        document.getElementById('theme-stylesheet').disabled = isNightMode;
        document.getElementById('day-mode-stylesheet').disabled = !isNightMode;
    });
    

    // Get the search input and list elements
    const searchInput = document.querySelector('.search-input');
    const searchList = document.querySelector('.search-list'); // Ensure this exists and is correctly selected

    // Add event listener to detect input change
    searchInput.addEventListener('change', function () {
        const query = searchInput.value.trim();

        // Only search if input is not empty
        if (query.length > 0) {
            fetch(`/search_stock?query=${query}`)
                .then(response => response.json())
                .then(data => {
                    searchList.innerHTML = '';  // Clear previous search results

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

                            // Ensure the structure is correct
                            li.innerHTML = `
                                <strong>${stock.name} (${stock.symbol})</strong> - 
                                ${stock.type} - Display Symbol: ${stock.displaySymbol} 
                                <span class="add-stock">+</span>
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
                .catch(err => {
                    console.error('Error fetching stock data:', err);
                    searchList.innerHTML = '<li>Error fetching stock data</li>';
                });
        } else {
            searchList.innerHTML = ''; // Clear search results if input is empty
        }
    });


    // Add event listener to detect when the user clicks on a search result's plus button
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('add-stock')) {

            const parentLi = e.target.closest('li');

            // Extract data attributes from the parent <li>
            const symbol = parentLi.dataset.symbol;
            const name = parentLi.dataset.name;
            const type = parentLi.dataset.type;
            const displaySymbol = parentLi.dataset.displaySymbol;
            console.log('Adding stock:', symbol, name, type, displaySymbol);

            // Ensure that the required data is present
            if (symbol && name && type && displaySymbol) {
                // Send the stock data to the server
                fetch('/add_stock', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        symbol: symbol,
                        name: name,
                        type: type,
                        displaySymbol: displaySymbol
                    })
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Add stock response:', data);
                    if (data.error) {
                        alert(data.error);
                    } else {
                        // Reload the page to show the updated list
                        window.location.reload();
                    }
                })
                .catch(err => {
                    console.error('Error adding stock:', err);
                    alert('Error adding stock');
                });
            } else {
                alert("Missing stock data. Please try again.");
            }
        }
    });


    let cryptoContainer = document.querySelector('.crypto-container');
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

    const fetchCryptoData = (crypto) => {
        const apiUrl = `https://api.coinpaprika.com/v1/tickers/${crypto.id}`;
        const stockUrl = `/search_stock?query=${crypto.name}`;

        // Parallel fetches for price and stock data
        return Promise.all([
            fetch(apiUrl).then(response => response.json()),
            fetch(stockUrl).then(response => response.json())
        ]);
    };

    const promises = cryptos.map(crypto => fetchCryptoData(crypto));

    // Wait for all promises to resolve
    Promise.all(promises)
        .then(results => {
            results.forEach(([cryptoData, stockData]) => {
                const price = cryptoData.quotes.USD.price.toFixed(2);
                const change = cryptoData.quotes.USD.percent_change_24h.toFixed(2);
                const stock = stockData[0];
                const positiveChange = change[0] == '-' ? 'negative' : 'positive';

                // Dynamically update the UI with the fetched data
                cryptoContainer.innerHTML += `
                    <div class="crypto-card">
                        <div class="crypto-name">
                            ${ stock.name }
                        </div>
                        <div class="crypto-stats">
                            <div class="price">$${ price }</div>
                            <div class="change ${positiveChange}">${ change }%</div>
                        </div>
                    </div>
                `;
            });
        })
        .catch(err => {
            console.error('Error fetching data:', err);
        });

    

    let newsContainer = document.querySelector('.news-container');
    fetch('http://127.0.0.1:5000/news', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        for (let i = 0; i < data.length; i++){
            const news = data[i];
            newsContainer.innerHTML += `
                <div class="news-card">
                    <h3 class="news-title">${news.title}</h3>
                    <div class="news-source">${news.source}</div>
                    <div> ${news.stock_name} </div>
                    <a href="${news.url}" class="news-link">Read More</a>
                </div>`;
        }
    });


    // Fetch recommendations
    fetch('/recommendations', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        for (let i = 0; i < data.length; i++){
            // Assuming data[i] contains the recommendation details
            const recommendation = data[i];
            const recommendationContainer = document.querySelector('.recommendation-container');
            recommendationContainer.innerHTML += `
                <div class="stock-card">
                    <div class="stock-top-row">
                        <h3> ${ recommendation }</h3>
                        <button class="add-stock"> + </button>
                    </div>
                    <div class="price">$N/A</div>
                    <div class="change">N/A%</div>
                </div>
            `;
        }
    });
    
    // Use event delegation
    document.addEventListener('click', function (e) {

        // Ensure this part is handled by the remove button
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
                        // Update the UI accordingly
                        stockCard.remove(); // Remove the stock card from the DOM
                    } else {
                        console.error('Error removing stock');
                    }
                });
            }
        }

        // Ensure this part is handled by the remove button
        if (e.target.classList.contains('add-stock')) {
            const stockCard = e.target.closest('.stock-card');
            const symbol = stockCard.querySelector('h3').innerText;

            if (symbol) {
                fetch('/add_stock', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ symbol: symbol })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.favorites) {
                        // Update the UI accordingly
                        stockCard.remove(); // Remove the stock card from the DOM
                        window.location.reload(); // Reload the page to show the updated list
                    } else {
                        console.error('Error removing stock');
                    }
                });
            }
        }


        // Check if the click target is a stock card
        if (e.target.closest('.stock-card') && !e.target.classList.contains('remove-stock')) {
            const stockCard = e.target.closest('.stock-card');
            const symbol = stockCard.querySelector('h3').innerText; // Adjust selector based on actual HTML structure
            const price = parseFloat(stockCard.querySelector('.price').innerText.replace('$', ''));
            const change = parseFloat(stockCard.querySelector('.change').innerText.replace('%', ''));
            if (symbol) {
                // Redirect to the stock page with the symbol as a query parameter
                window.location.href = `/stock?symbol=${encodeURIComponent(symbol)}&price=${encodeURIComponent(price)}&change=${encodeURIComponent(change)}`;
            } else {
                console.error('Stock symbol not found.');
            }
        }
        

        // Handle checkbox changes
        if (e.target.matches('.rising')) {
            const risingCheckbox = e.target;
            console.log('Rising checkbox clicked');
            if (risingCheckbox.checked) {
                // Hide stock cards with negative change
                document.querySelectorAll('.stock-card').forEach(element => {
                    const changeElement = element.querySelector('.change');
                    if (changeElement && changeElement.classList.contains('negative')) {
                        element.style.display = 'none'; // Hide the stock card
                    }
                });
            } else {
                // Show all stock cards
                document.querySelectorAll('.stock-card').forEach(element => {
                    element.style.display = 'block'; // Show the stock card
                });
            }
        }
    });



    // Add classes based on the change percentage
    document.querySelectorAll('.change').forEach(element => {
        // Get the text content of the element
        const content = element.textContent.trim();
        
        // Check if the content starts with '-'
        if (content.startsWith('-')) {
            // Add 'negative' class
            element.classList.add('negative');
        } else {
            // Add 'positive' class
            element.classList.add('positive');
        }
    });

    

    
    // Function to update stock data
    function updateStockData() {
        const stockCards = document.querySelectorAll('.stock-card');
        stockCards.forEach(card => {
            const symbol = card.querySelector('h3').innerText;
            fetch(`/get_stock_data?symbol=${encodeURIComponent(symbol)}`)
                .then(response => response.json())
                .then(data => {
                    if (data.price !== undefined && data.change !== undefined) {
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


                    } else {
                        console.error('Failed to fetch stock data:', data);
                    }
                })
                .catch(error => console.error('Error fetching stock data:', error));
        });
    }

    // Wait 1 second after page load before setting up stockCards
    setTimeout(() => {
        console.log('Waiting 1 second before setting up stock cards.');
        // Update stock data every minute
        setInterval(updateStockData, 60000);
        updateStockData();
    }, 3000); 

    // Initial update when the page loads
    updateStockData();

    

});
