class MapManager {
    constructor() {
        this.map = null;
        this.connectionLayer = null;
        this.currentFilter = 'ALL';

        // 记录选中的图层
        this.selectedLayer = null;

        // 外部回调
        this.onBlankMapClick = null;
        this.onCountryClick = null;

        this.initMap();
        this.initMapClickListener();
        this.initCustomZoomControl();
    }

    // 缩放控件
    initCustomZoomControl() {
        // 创建缩放控件容器
        const zoomControls = document.createElement('div');
        zoomControls.id = 'zoom-controls';

        // 创建放大按钮
        const zoomInBtn = document.createElement('button');
        zoomInBtn.innerHTML = '+';
        zoomInBtn.onclick = () => this.map.zoomIn();

        // 创建缩小按钮
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.innerHTML = '−';
        zoomOutBtn.onclick = () => this.map.zoomOut();

        // 将按钮添加到容器
        zoomControls.appendChild(zoomInBtn);
        zoomControls.appendChild(zoomOutBtn);

        // 将容器添加到地图容器中
        document.querySelector('#map').appendChild(zoomControls);
    }

    // 地图空白处点击处理
    initMapClickListener() {
        this.map.on('click', (e) => {
            if (!e.originalEvent.propagatedFromFeature) {
                // 说明点击在地图空白处
                if (this.onBlankMapClick) {
                    // 如果外部有回调（main.js 中通常会设置）
                    this.onBlankMapClick();
                } else {
                    // 否则仅重置高亮
                    this.resetCountryHighlight();
                }
            }
        });
    }
    
    // 初始化地图
    initMap() {
        this.map = L.map('map', {
            center: [20, 20],
            zoom: 2.2,
            minZoom: 2.2,
            maxZoom: 8,
            zoomControl: false, // 禁用默认缩放控件
            scrollWheelZoom: false,
            wheelDebounceTime: 300,
            wheelPxPerZoomLevel: 300,
            zoomDelta: 1,
            zoomSnap: 1
        });

        // 添加暗色底图
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '©OpenStreetMap, ©CartoDB',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(this.map);

        // 用于连线的图层
        this.connectionLayer = L.layerGroup().addTo(this.map);
    }

    addGeoJSONLayer(data) {
        L.geoJSON(data, {
            style: this.getCountryStyle(),
            onEachFeature: (feature, layer) => {
                this.onEachFeature(feature, layer);
            }
        }).addTo(this.map);
    }

    getCountryStyle() {
        return {
            fillColor: '#e2e8f0',
            color: '#94a3b8',
            weight: 0.5,
            opacity: 0.7,
            fillOpacity: 0.3
        };
    }

    onEachFeature(feature, layer) {
        // 初始状态：未锁定、不属于连接高亮
        layer.isLocked = false;
        layer.isHighlightedConnection = false;

        // 绑定 mouseover、mouseout、click 等事件
        layer.on({
            mouseover: (e) => {
                if (!feature.properties.ISO3 || feature.properties.ISO3 === 'NA') return;

                // 如果图层已锁定或因连接而高亮，则仅展示 tooltip，不改变样式
                if (layer.isLocked || layer.isHighlightedConnection) {
                    layer.bindTooltip(layer.feature.properties.adm0_name, {
                        className: 'custom-tooltip'
                    }).openTooltip();
                    return;
                }

                // 否则对未锁定、未高亮的图层显示鼠标悬浮高亮
                layer.setStyle({
                    weight: 2,
                    color: 'white',
                    fillOpacity: 0.7
                });
                layer.bindTooltip(layer.feature.properties.adm0_name, {
                    className: 'custom-tooltip'
                }).openTooltip();
            },

            mouseout: (e) => {
                if (!feature.properties.ISO3 || feature.properties.ISO3 === 'NA') return;
                // 如果图层被锁定或因连接而高亮，鼠标移出时不恢复默认样式，只隐藏 tooltip
                if (layer.isLocked || layer.isHighlightedConnection) {
                    layer.closeTooltip();
                    return;
                }
                // 普通情况，恢复默认样式
                layer.setStyle(this.getCountryStyle());
                layer.closeTooltip();
            },

            click: (e) => {
                if (!feature.properties.ISO3 || feature.properties.ISO3 === 'NA') return;
                
                // 标记点击事件源自某个图层，避免空白点击时触发
                e.originalEvent.propagatedFromFeature = true;

                // 如果已有选中图层且不是本图层，则取消之前图层的锁定并恢复样式
                if (this.selectedLayer && this.selectedLayer !== layer) {
                    this.selectedLayer.isLocked = false;
                    this.selectedLayer.setStyle(this.getCountryStyle());
                }

                // 更新选中图层并设置锁定标记
                this.selectedLayer = layer;
                layer.isLocked = true;

                // 设置样式
                layer.setStyle({
                    fillColor: '#F4D03F',
                    fillOpacity: 0.8,
                    weight: 2
                }).bringToFront();

                // 如果有外部回调 (onCountryClick)，则执行
                if (this.onCountryClick) {
                    this.onCountryClick(feature.properties.ISO3);
                }
            }
        });
    }

    // 重置除“锁定”国家以外所有国家的样式
    resetCountryStyles() {
        this.map.eachLayer((layer) => {
            if (layer.feature && layer !== this.selectedLayer) {
                // 取消所有非选中图层的高亮标记
                layer.isHighlightedConnection = false;
                layer.setStyle(this.getCountryStyle());
            }
        });
        // 同时清除连线图层
        this.connectionLayer.clearLayers();
    }

    // 完全重置地图的高亮
    resetCountryHighlight() {
        this.map.eachLayer((layer) => {
            if (layer.feature) {
                // 取消锁定状态 & 取消连接高亮
                layer.isLocked = false;
                layer.isHighlightedConnection = false;
                layer.setStyle(this.getCountryStyle());
            }
        });
        // 清除连线图层
        this.connectionLayer.clearLayers();
        // 清空记录
        this.selectedLayer = null;
    }

    // 切换过滤器
    setFilter(filter) {
        this.currentFilter = filter;
    }

    // 根据 ISO3 从地图上找到对应的 layer
    findCountryLayer(iso3) {
        let targetLayer = null;
        this.map.eachLayer((layer) => {
            if (layer.feature && layer.feature.properties.ISO3 === iso3) {
                targetLayer = layer;
            }
        });
        return targetLayer;
    }

    // 重置（包括已选中图层）
    resetAllCountryStyles() {
       // 统一使用这个方法来实现空白点击后恢复
        this.map.eachLayer((layer) => {
            if (layer.feature) {
                layer.isLocked = false;
                layer.isHighlightedConnection = false;
                layer.setStyle(this.getCountryStyle());
            }
        });
        this.connectionLayer.clearLayers();
        this.selectedLayer = null;
    }
}