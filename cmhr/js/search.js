class SearchManager {
    constructor(mapManager, countriesData) {
        this.mapManager = mapManager;
        this.countriesData = countriesData;

        // 使用 Fuse.js 初始化搜索
        const options = {
            keys: ['properties.adm0_name', 'properties.ISO3'], // 在对象属性内搜索
            threshold: 0.3 // 容错级别，值越小匹配越严格
        };
        this.fuse = new Fuse(countriesData.features, options);

        this.initializeSearch();
    }

    initializeSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');

        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value, searchResults);
        });

        document.addEventListener('click', (e) => {
            if (!searchResults.contains(e.target) && e.target !== searchInput) {
                searchResults.style.display = 'none';
            }
        });
    }

    handleSearch(searchTerm, searchResults) {
        searchTerm = searchTerm.toLowerCase();
        if (searchTerm.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        const results = this.fuse.search(searchTerm); // results 为数组，结构为 { item: <feature>, refIndex: <index> }
        const matches = results.map(r => r.item);

        // const matches = this.countriesData.features.filter(feature => 
        //     feature.properties.adm0_name.toLowerCase().includes(searchTerm) ||
        //     feature.properties.ISO3.toLowerCase().includes(searchTerm)
        // );

        this.displaySearchResults(matches, searchResults);
    }

    displaySearchResults(matches, searchResults) {
        searchResults.innerHTML = '';
        
        // 过滤掉 ISO3 为 NA 的结果
        const filteredMatches = matches.filter(match => 
            match.properties.ISO3 && 
            match.properties.ISO3 !== 'NA' && 
            match.properties.ISO3 !== 'null'
        );
        
        filteredMatches.forEach(match => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.textContent = `${match.properties.adm0_name} (${match.properties.ISO3})`;
            div.onclick = () => this.handleSearchResultClick(match);
            searchResults.appendChild(div);
        });
        
        searchResults.style.display = matches.length ? 'block' : 'none';
    }

    handleSearchResultClick(match) {
        const bounds = L.geoJSON(match).getBounds();
        this.mapManager.map.fitBounds(bounds);
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('searchInput').value = '';
        this.mapManager.onCountryClick(match.properties.ISO3);
    }

    clearSearchResults() {
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            searchResults.innerHTML = '';
            searchResults.style.display = 'none';
        }
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
    }
}