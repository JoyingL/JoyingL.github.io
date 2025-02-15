document.addEventListener('DOMContentLoaded', async function() {
    try {
      // 加载 Global 所需数据
      const dataLoader = new DataLoader();
      const { countriesData, connectionsData, iso3ToConnections } = await dataLoader.loadData();
  
      // 初始化 Global Map
      const mapManager = new MapManager();
      const connectionManager = new ConnectionManager(mapManager);
      const searchManager = new SearchManager(mapManager, countriesData);
  
      // 折叠功能
      const collapseButton = document.querySelector('.collapse-button');
      const controlPanel = document.getElementById('control-panel');
      let isCollapsed = false;

      collapseButton.addEventListener('click', function(e) {
          isCollapsed = !isCollapsed;
          
          // 切换面板宽度和按钮样式
          controlPanel.style.width = isCollapsed ? '30px' : '270px';
          collapseButton.querySelector('i').style.transform = 
              isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
          
          // 切换内容可见性
          document.querySelectorAll('.panel-section').forEach(section => {
              section.style.display = isCollapsed ? 'none' : 'block';
          });

          e.stopPropagation();
      });

      // 点击地图空白处：重置地图 + 连接线 + 搜索结果
      mapManager.onBlankMapClick = () => {
        connectionManager.resetAllHighlightsAndUI();
        if (typeof searchManager.clearSearchResults === 'function') {
          searchManager.clearSearchResults();
        }
      };
      mapManager.onCountryClick = (iso3) => {
        connectionManager.showConnections(iso3);
      };
  
      // 设置连接数据
      connectionManager.setData(connectionsData, iso3ToConnections, countriesData);
  
      // 加载世界底图
      mapManager.addGeoJSONLayer(countriesData);

    } catch (error) {
      console.error('Error initializing application:', error);
    }
  });