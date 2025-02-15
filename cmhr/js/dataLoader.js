class DataLoader {
    constructor() {
      this.countriesData = null;
      this.connectionsData = null;
      this.iso3ToConnections = new Map();
    }
  
    async loadData() {
      try {
        const geoResponse = await fetch('data/gaul_0.geojson');
        this.countriesData = await geoResponse.json();
  
        const csvResponse = await fetch('data/high_RPS_pairs.csv');
        const csvText = await csvResponse.text();
        this.connectionsData = d3.csvParse(csvText);
  
        this.createIso3Mapping();
        return {
          countriesData: this.countriesData,
          connectionsData: this.connectionsData,
          iso3ToConnections: this.iso3ToConnections
        };
      } catch (error) {
        console.error('Error loading data:', error);
        throw error;
      }
    }
  
    createIso3Mapping() {
      this.connectionsData.forEach(conn => {
        const sourceIso3 = conn['adm0.x'];
        if (!sourceIso3) return;
        const requiredFields = ['adm0.x', 'adm0.y', 'tag'];
        const missingFields = requiredFields.filter(field => !conn[field]);
        if (missingFields.length > 0) {
          return;
        }
        if (!this.iso3ToConnections.has(sourceIso3)) {
          this.iso3ToConnections.set(sourceIso3, []);
        }
        this.iso3ToConnections.get(sourceIso3).push(conn);
      });
    }
  }