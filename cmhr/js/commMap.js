class CommunityMap {
  constructor(mapContainerId, commData, tessData) {
    // 地图相关
    this.map = null;
    this.commLayer = null;
    this.tessLayer = null;

    // 原始数据
    this.commData = commData;
    this.tessData = tessData;

    // 调色
    this.commColors = [];
    this.riskColors = [];

    // 当前选中的 Region 过滤值
    this.currentRegionFilter = 'ALL';

    // 跨区域筛选
    this.currentMulAdm0Filter = 'ALL';
    
    // 初始化地图
    this.initMap(mapContainerId);
    this.tessLayer = L.geoJSON(null, {
      style: (feature) => this.styleTess(feature)
    }).addTo(this.map);
    
    // 初始化 BaseMap & 自定义控件
    this.initBaseMap();
    this.initCustomZoomControl();

    // 生成配色
    this.prepareCommColors(1111);
    this.prepareRiskColors();

    // 加载社区图层 & tess 图层
    this.loadCommLayer(commData, tessData);

    // 监听 regionFilter
    this.initRegionFilterListeners();

    // 监听 mulAdm0Filter
    this.initMulAdm0FilterListeners();

    // 初始化折叠面板功能
    this.initCollapsePanel();
  }

  // ---------------- 地图与基础控件相关 ---------------------------------------------------------------------
  initMap(mapContainerId) {
    this.map = L.map(mapContainerId, {
      center: [20, 20],
      zoom: 2.2,
      minZoom: 2.2,
      maxZoom: 8,
      scrollWheelZoom: false,
      zoomControl: false,
      dragging: true
    });

    // 地图空白处点击监听
    this.map.on('click', (e) => {
      if (!e.originalEvent.target.closest('.leaflet-overlay-pane')) {
        this.tessLayer.clearLayers();
        document.getElementById('risk-info').innerHTML = '';
      }
    });
  }

  initFilters() {
    document.querySelectorAll('input[name="regionFilter"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const filterVal = e.target.value;
            this.applyRegionFilter(filterVal);
        });
    });
}

  initBaseMap() {
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap, ©CartoDB',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(this.map);
  }

  // 缩放控件
  initCustomZoomControl() {
    const zoomControls = document.createElement('div');
    zoomControls.id = 'zoom-controls';

    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '+';
    zoomInBtn.onclick = () => this.map.zoomIn();

    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '−';
    zoomOutBtn.onclick = () => this.map.zoomOut();

    zoomControls.appendChild(zoomInBtn);
    zoomControls.appendChild(zoomOutBtn);

    document.getElementById(this.map._container.id).appendChild(zoomControls);
  }

  // 折叠面板
  initCollapsePanel() {
    const collapseButton = document.querySelector('.collapse-button');
    const controlPanel = document.getElementById('control-panel');
    if (!collapseButton || !controlPanel) {
      // 如果页面中没有对应的 DOM，就直接返回
      return;
    }

    let isCollapsed = false;

    collapseButton.addEventListener('click', (e) => {
      isCollapsed = !isCollapsed;

      // 切换面板宽度和按钮样式
      controlPanel.style.width = isCollapsed ? '30px' : '270px';

      // 假设使用 <i> 图标旋转来表示折叠状态
      const icon = collapseButton.querySelector('i');
      if (icon) {
        icon.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
      }

      // 切换内容可见性
      document.querySelectorAll('.panel-section').forEach(section => {
        section.style.display = isCollapsed ? 'none' : 'block';
      });

      e.stopPropagation();
    });
  }

  
  // ---------------- 过滤器相关 ---------------------------------------------------------------------
  initRegionFilterListeners() {
    const radios = document.querySelectorAll('input[name="regionFilter"]');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const filterVal = e.target.value; // e.g. "ALL"/"GS"/"GN"/"CN+S"
        this.applyRegionFilter(filterVal);
      });
    });
  }

  initMulAdm0FilterListeners() {
    const radios = document.querySelectorAll('input[name="mulAdm0Filter"]');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const filterVal = e.target.value; // e.g. "ALL"/"yes"/"no"
        this.applyMulAdm0Filter(filterVal);
      });
    });
  }

  applyRegionFilter(regionVal) {
    this.currentRegionFilter = regionVal; // 记录当前选中的 region 筛选值
    if (this.commLayer) {
      this.map.removeLayer(this.commLayer);
    }
    this.loadCommLayer();
  }

  applyMulAdm0Filter(mulAdm0Val) {
    this.currentMulAdm0Filter = mulAdm0Val; // 记录当前选中的 mulAdm0 筛选值
    if (this.commLayer) {
      this.map.removeLayer(this.commLayer);
    }
    this.loadCommLayer();
  }

  // ---------------- 社区图层相关 ---------------------------------------------------------------------
  loadCommLayer() {
    // 重新构建 geoJSON 图层
    this.commLayer = L.geoJSON(this.commData, {
      style: (feature) => this.styleComm(feature),
      onEachFeature: (feature, layer) => {
        this.onEachCommFeature(feature, layer, this.tessData);
      }
    }).addTo(this.map);
  }

  styleComm(feature) {
    if (!this.isRegionVisible(feature)) {
      return {
        fillColor: '#000000',
        fillOpacity: 0,
        weight: 0,
        interactive: false
      };
    }

    const idx = feature.properties.COMM - 1;
    return {
      fillColor: this.commColors[idx] || '#ffffff',
      weight: 0.5,
      color: 'white',
      fillOpacity: 0.7
    };
  }

  isRegionVisible(feature) {
    // regionFilter
    if (this.currentRegionFilter !== 'ALL') {
      if (feature.properties.GNS !== this.currentRegionFilter) {
        return false;
      }
    }

    // mulAdm0Filter
    if (this.currentMulAdm0Filter !== 'ALL') {
      if (feature.properties.mul_adm0 !== this.currentMulAdm0Filter) {
        return false;
      }
    }

    return true;
  }

  onEachCommFeature(feature, layer, tessData) {
    if (!this.isRegionVisible(feature)) {
      layer.off(); // 若 feature 不可见，则移除事件监听
      return;
    }
    layer.on({
      mouseover: e => {
        e.target.setStyle({ weight: 3 });
        layer.bindTooltip(`RC: ${feature.properties.COMM}`, {
          className: 'custom-tooltip'
        }).openTooltip();
      },
      mouseout: e => {
        e.target.setStyle({ weight: 1 });
        layer.closeTooltip();
      },
      click: e => {
        // 点击社区后，显示对应 tess
        this.showTessForComm(feature.properties.COMM, tessData);
        
        // 找到面板里显示信息的容器
        const riskInfoEl = document.getElementById('risk-info');
        if (!riskInfoEl) return;

        const wopVal = Math.round(feature.properties.wop) || 'N/A';
        const rRankVal = feature.properties['R.rank'] ?? 'N/A';
        const cRankVal = feature.properties['C.rank'] ?? 'N/A';

        riskInfoEl.innerHTML = `
        <h3>Risk Community</h3>
        <div class="risk-legend">
            <div class="color-scale"></div>
            <div class="risk-stats">
                <p>WorldPop ≈ ${wopVal}</p>
                <div class="ranking-section">
                    <p>Risk Ranking: ${rRankVal}</p>
                    <small class="ranking-note">(Rank 1 indicates highest risk)</small>
                </div>
                <div class="ranking-section">
                    <p>Clustering Ranking: ${cRankVal}</p>
                    <small class="ranking-note">(Rank 1 indicates highest clustering)</small>
                </div>
            </div>
        </div>
      `;
        // 这段样式仅作示例，可根据自己的需求进行美化
      }
    });
  }

  // ---------------- Tess 图层相关 ---------------------------------------------------------------------
  showTessForComm(commId, tessData) {
    this.tessLayer.clearLayers();
    const tessFeatures = tessData.features.filter(f => f.properties.COMM === commId);
    this.tessLayer.addData(tessFeatures);
  }

  styleTess(feature) {
    const riskValue = feature.properties.risk || 0;
    const colorIdx = Math.min(99, Math.floor(riskValue * 100));
    return {
      fillColor: this.riskColors[colorIdx],
      weight: 0.3,
      color: "white",
      fillOpacity: 1
    };
  }

  // ---------------- 颜色与图例 ---------------------------------------------------------------------
  prepareCommColors(n) {
    const baseSimpsonsPalette = [
      "#FED439", "#709AE1", "#8A9197", "#D2AF81", "#FD7446",
      "#D5E4A2", "#197EC0", "#F05C3B", "#46732E", "#71D0F5",
      "#370335", "#075149", "#C80813", "#91331F", "#1A9993", "#FD8CC1"
    ];
    const repeated = [];
    for (let i = 0; i < n; i++) {
      repeated.push(baseSimpsonsPalette[i % baseSimpsonsPalette.length]);
    }
    this.commColors = repeated;
  }

  prepareRiskColors() {
    const spectral10 = [
      "#9e0142","#d53e4f","#f46d43","#fdae61","#fee08b",
      "#e6f598","#abdda4","#66c2a5","#3288bd","#5e4fa2"
    ];
    this.riskColors = chroma
      .scale(["#000003", ...spectral10])
      .mode("lab")
      .colors(100)
      .reverse();
  }

  // ---------------- 其他 ---------------------------------------------------------------------

  // 提供给搜索类的 API：飞行定位到某个国家边界
  flyToFeature(feature) {
    const bounds = L.geoJSON(feature).getBounds();
    this.map.flyToBounds(bounds);
  }  
}