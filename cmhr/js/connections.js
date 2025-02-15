class ConnectionManager {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.connectionsData = null;
        this.iso3ToConnections = null;
        this.countriesData = null; // 存储 geojson 的国家信息
        this.currentIso3 = null;
        this.highlightedTargetLayers = [];

        this.initializeFilterListeners();
    }

    /**
     * @param {Array} connectionsData     解析自 high_RPS_pairs.csv 的全部连接信息
     * @param {Map}   iso3ToConnections   Map<iso3, Array>，存储某个国家 ISO3 对应的连接列表
     * @param {Object} countriesData      解析自 gaul_0.geojson 的 GeoJSON 对象
     */
    setData(connectionsData, iso3ToConnections, countriesData) {
        this.connectionsData = connectionsData;
        this.iso3ToConnections = iso3ToConnections;
        this.countriesData = countriesData;
    }

    /**
     * 显示某个 ISO3 国家对应的连线
     */
    showConnections(iso3) {
        console.log('Showing connections for ISO3:', iso3);
        this.resetTargetColors();
        this.currentIso3 = iso3;
        this.mapManager.connectionLayer.clearLayers();

        const connections = this.iso3ToConnections.get(iso3) || [];
        console.log('Found connections:', connections);

        // 根据过滤器进行筛选
        const filteredConnections = connections.filter(conn =>
            this.mapManager.currentFilter === 'ALL' ||
            conn.tag === this.mapManager.currentFilter
        );
        console.log('Filtered connections:', filteredConnections);

        // 绘制连线
        this.drawConnections(filteredConnections);

        // 更新侧边栏或列表
        this.updateConnectionsList(filteredConnections);
    }

    /**
     * 根据传入的连接列表，画出曲线
     */
    drawConnections(connections) {
        this.mapManager.connectionLayer.clearLayers();
        this.highlightedTargetLayers = [];

        connections.forEach(conn => {
            console.log('Processing connection:', conn);

            // 提取 “起点国家” adm0.x 与 “终点国家” adm0.y
            const sourceIso3 = conn['adm0.x'];
            const targetIso3 = conn['adm0.y'];
            const color = this.getConnectionColor(conn.tag);

            // 获取 sourceIso3 与 targetIso3 对应的坐标
            const sourceCoord = this.getCountryCoordinates(sourceIso3);
            const targetCoord = this.getCountryCoordinates(targetIso3);
            if (!sourceCoord || !targetCoord) {
                console.warn(`Coordinates not found for: ${sourceIso3} or ${targetIso3}`);
                return;
            }

            const start = [sourceCoord.lat, sourceCoord.lng];
            const end   = [targetCoord.lat, targetCoord.lng];
            if (
                isNaN(start[0]) || isNaN(start[1]) ||
                isNaN(end[0])   || isNaN(end[1])
            ) {
                console.warn('Invalid coordinates for connection:', conn, {
                    start, end
                });
                return;
            }

            // 计算曲线控制点
            const { controlPoint } = this.calculateDynamicCurvature(start, end);

            // 绘制弧线
            try {
                L.curve(
                    [
                        'M', start,
                        'Q', controlPoint,
                        end
                    ],
                    {
                        color,
                        weight: 2,
                        opacity: 0.7,
                        className: 'connection-line'
                    }
                ).addTo(this.mapManager.connectionLayer);
            } catch (error) {
                console.error('Error drawing curve:', error, {
                    start,
                    controlPoint,
                    end,
                    connection: conn
                });
            }

            // 高亮目标国家
            this.highlightCountry(targetIso3, color);
        });

        // 保持已点击国家在最上层（如果有）
        if (this.mapManager.selectedLayer) {
            this.mapManager.selectedLayer.setStyle({
                fillColor: '#F4D03F',
                fillOpacity: 0.8,
                weight: 2
            }).bringToFront();
        }
    }

    highlightCountry(iso3, fillColor) {
        const layer = this.mapManager.findCountryLayer(iso3);
        if (!layer) return;
        // 设置国家为“连接高亮”状态
        layer.isHighlightedConnection = true;
        layer.setStyle({
            fillColor,
            fillOpacity: 0.5,
            weight: 2
        }).bringToFront();
        this.highlightedTargetLayers.push(layer);
    }

    // 计算曲线所需的控制点
    calculateDynamicCurvature(start, end) {
        const bearing = this.calculateBearing(start, end);
        const mid = this.midPoint(start, end);

        const latDiff = Math.abs(end[0] - start[0]);
        const lngDiff = Math.abs(end[1] - start[1]);
        // 根据经纬度差值计算偏移比例
        const offsetScale = Math.min(Math.max(latDiff, lngDiff) * 0.3, 15);

        return {
            controlPoint: [
                mid[0] + offsetScale * Math.cos(bearing + Math.PI/2),
                mid[1] + offsetScale * Math.sin(bearing + Math.PI/2)
            ]
        };
    }

    calculateBearing(start, end) {
        const y = Math.sin(end[1] - start[1]) * Math.cos(end[0]);
        const x = Math.cos(start[0]) * Math.sin(end[0]) -
                  Math.sin(start[0]) * Math.cos(end[0]) * Math.cos(end[1] - start[1]);
        return Math.atan2(y, x);
    }

    midPoint(start, end) {
        return [
            (start[0] + end[0]) / 2,
            (start[1] + end[1]) / 2
        ];
    }

    getConnectionColor(tag) {
        const colorPalette = {
            'HHH': '#00B19D', // 绿色
            'HHL': '#F675DA', // 粉色
            'HLH': '#228BDC', // 紫色
            'HLL': '#E64358', // 红色
            'default': '#D98594'
        };
        return colorPalette[tag] || colorPalette.default;
    }

    getCountryCoordinates(iso3) {
        if (!this.countriesData || !this.countriesData.features) {
            console.warn('countriesData is not set or invalid');
            return null;
        }
        const feature = this.countriesData.features.find(f => {
            return f.properties && f.properties.ISO3 === iso3;
        });
        if (!feature) {
            return null;
        }
        return {
            lat: parseFloat(feature.properties.label_Y),
            lng: parseFloat(feature.properties.label_X)
        };
    }

    updateConnectionsList(connections) {
        const connectionList = document.getElementById('connectionList');
        if (!connectionList) return;

        connectionList.innerHTML = '';

        if (connections.length === 0) {
            const item = document.createElement('div');
            item.className = 'connection-item';
            item.textContent = 'No connections found';
            connectionList.appendChild(item);
            return;
        }

        connections.forEach(conn => {
            const item = document.createElement('div');
            item.className = 'connection-item';
            item.innerHTML = `
                <span class="country-name">${conn['adm0_name.y']}</span>
                <span class="partnership-type">${conn.tag}</span>
            `;
            connectionList.appendChild(item);
        });
    }

    // 监听过滤器
    initializeFilterListeners() {
        document.querySelectorAll('input[name="filter"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.mapManager.setFilter(e.target.value);
                // 切换过滤器时，重置地图样式
                this.mapManager.resetCountryStyles();
                // 如果当前已有选中的国家，则重新绘制它的连线
                if (this.currentIso3) {
                    this.showConnections(this.currentIso3);
                }
            });
        });
    }

    // 清除所有非选中图层的颜色
    resetTargetColors() {
        this.mapManager.map.eachLayer(layer => {
            if (layer.feature && layer !== this.mapManager.selectedLayer) {
                layer.isHighlightedConnection = false;
                layer.setStyle(this.mapManager.getCountryStyle());
            }
        });
    }

    // 点击空白处时把所有高亮与连线都清理掉
    resetAllHighlightsAndUI() {
        // 重置所有国家底色
        this.mapManager.resetAllCountryStyles();
        // 清空侧边栏列表
        const connectionList = document.getElementById('connectionList');
        if (connectionList) {
            connectionList.innerHTML = '';
        }
        // 当前点击的 ISO3 也清除
        this.currentIso3 = null;
        this.highlightedTargetLayers = [];
    }
}