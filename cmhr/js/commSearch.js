class CommSearch {
    constructor(communityMap, countryData) {
      this.communityMap = communityMap;
      this.countryData = countryData;
  
      // 配置 Fuse.js
      this.fuse = new Fuse(this.countryData.features, {
        keys: ['properties.adm0_name', 'properties.ISO3'],
        threshold: 0.3
      });
  
      this.searchInput = document.getElementById('searchInput');
      this.searchResults = document.getElementById('searchResults');
  
      this.initSearchListeners();
    }
  
    initSearchListeners() {
      // 输入框变化
      this.searchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim();
        if (term.length < 2) {
          this.clearSearchResults();
          return;
        }
        this.handleSearch(term);
      });
  
      // 点击页面其他区域，隐藏搜索结果
      document.addEventListener('click', (e) => {
        if (!this.searchResults.contains(e.target) && e.target !== this.searchInput) {
          this.searchResults.style.display = 'none';
        }
      });
    }
  
    handleSearch(term) {
      const results = this.fuse.search(term);
      // results 是数组，每个元素形如 { item: geojsonFeature, refIndex: ... }
      const matches = results.map(r => r.item);
  
      // 过滤掉无效 ISO3
      const validMatches = matches.filter(feature => {
        const iso3 = feature.properties.ISO3;
        return iso3 && iso3 !== 'NA' && iso3 !== 'null';
      });
  
      this.displaySearchResults(validMatches);
    }
  
    displaySearchResults(matches) {
      this.searchResults.innerHTML = ''; // 清空
      if (!matches.length) {
        this.searchResults.style.display = 'none';
        return;
      }
  
      matches.forEach(feature => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.textContent = `${feature.properties.adm0_name} (${feature.properties.ISO3})`;
        div.onclick = () => this.handleResultClick(feature);
        this.searchResults.appendChild(div);
      });
      this.searchResults.style.display = 'block';
    }
  
    handleResultClick(feature) {
      // 调用 CommunityMap 的方法完成地图飞行定位
      this.communityMap.flyToFeature(feature);
  
      // 隐藏结果 & 清空输入框
      this.clearSearchResults();
      this.searchInput.value = '';
    }
  
    clearSearchResults() {
      this.searchResults.innerHTML = '';
      this.searchResults.style.display = 'none';
    }
  }
