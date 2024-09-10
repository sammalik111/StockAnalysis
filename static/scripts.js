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
                        alert(data.message);
                        // Reload the page to show the updated list
                        // window.location.reload();
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


    let cryptoContainer = document.querySelector('.cryptoContainer');
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
            fetch(apiUrl).then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok for crypto data');
                }
                return response.json();
            }),
            fetch(stockUrl).then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok for stock data');
                }
                return response.json();
            })
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

                // Dynamically update the UI with the fetched data
                cryptoContainer.innerHTML += `
                    <div class="crypto-card">
                        <h3 class="cryptoTitle">${stock.name}</h3>
                        <div class="price">$${price}</div>
                        <div class="change">${change}%</div>
                    </div>
                `;
            });
        })
        .catch(err => {
            console.error('Error fetching data:', err);
        });

    
    let newsContainer = document.querySelector('.newsContainer');
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
                    <h3 class="newsTitle">${news.title}</h3>
                    <div class="newsSource">${news.source}</div>
                    <div> ${news.stock_name} </div>
                    <a href="${news.url}" class="newsLink">Read More</a>
                </div>`;
        }
    });


});
