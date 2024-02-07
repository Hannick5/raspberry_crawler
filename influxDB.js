const fs = require("fs");
const { InfluxDB, Point } = require("@influxdata/influxdb-client");
const {parseNMEA} = require("./util.js");
const token = process.env.INFLUXDB_TOKEN;
const url = "http://localhost:8086";
const org = "ensg";
const bucket = "db_live_2";

const client = new InfluxDB({ url, token });
async function insertDataToInfluxDB(filePath, coordPath, rainDataPath) {
    try {
      const { latitude, longitude } = parseNMEA(coordPath);
      const logContent = fs.readFileSync(rainDataPath, "utf8");
  
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const writeClient = client.getWriteApi(org, bucket, "ns");
  
      const measurements = data.measure;
  
      // Itérer sur les mesures à partir de data.measurements
      for (const measure of measurements) {
        // Vérifier si la valeur n'est pas NaN avant de la convertir
        if (!isNaN(measure.value)) {
          const point = new Point(measure.name)
            .floatField("value", parseFloat(measure.value))
            .tag("desc", measure.desc)
            .tag("unit", measure.unit)
            .floatField("longitude", longitude) // Ajout de la longitude
            .floatField("latitude", latitude) // Ajout de la latitude
            .stringField("rain", logContent) // Ajout des données de pluie
  
            .timestamp(new Date(data.date));
  
          writeClient.writePoint(point);
        }
      }
  
      writeClient.flush();
      console.log(
        "Données insérées avec succès dans la base de données InfluxDB."
      );
    } catch (error) {
      console.error(
        "Erreur lors de l'insertion des données dans la base de données InfluxDB :",
        error
      );
    }
  }

  module.exports = {insertDataToInfluxDB}