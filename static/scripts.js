
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM is ready');
    const sidenav = document.querySelector('.sidenav');
    const container = document.querySelector('.container');
    const toggleSidebarBtn = document.querySelector('.toggle-sidebar-btn');

    toggleSidebarBtn.addEventListener('click', function () {
        // Toggle the sidebar visibility
        sidenav.classList.toggle('hidden');
        container.classList.toggle('expanded');
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



});
