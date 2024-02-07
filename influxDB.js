const fs = require("fs");
const { InfluxDB, Point } = require("@influxdata/influxdb-client");
const {parseNMEA} = require("./util.js");
const token = process.env.INFLUXDB_TOKEN;
const url = "http://localhost:8086";
const org = "ensg";
const bucket = "db_live";

const client = new InfluxDB({ url, token });
async function insertDataToInfluxDB(filePath, coordPath, rainDataPath) {
  try {
      const { latitude, longitude } = parseNMEA(coordPath);
      const logContent = fs.readFileSync(rainDataPath, "utf8").trim();
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const writeClient = client.getWriteApi(org, bucket, "ns");
      console.log(logContent);
      // Insérer la longitude
      const longitudePoint = new Point("longitude")
          .floatField("value", longitude)
          .timestamp(new Date(data.date));
      writeClient.writePoint(longitudePoint);

      // Insérer la latitude
      const latitudePoint = new Point("latitude")
          .floatField("value", latitude)
          .timestamp(new Date(data.date));
      writeClient.writePoint(latitudePoint);

      // Insérer les données de pluie
      const rainPoint = new Point("rain")
          .stringField("value", logContent)
          .timestamp(new Date(data.date));
      writeClient.writePoint(rainPoint);

      const measurements = data.measure;

      // Insérer les mesures
      for (const measure of measurements) {
          // Vérifier si la valeur n'est pas NaN avant de la convertir
          if (!isNaN(measure.value)) {
              const point = new Point(measure.name)
                  .floatField("value", parseFloat(measure.value))
                  .tag("desc", measure.desc)
                  .tag("unit", measure.unit)
                  .timestamp(new Date(data.date));

              writeClient.writePoint(point);
          }
      }

      writeClient.flush();
      console.log("Données insérées avec succès dans la base de données InfluxDB.");
  } catch (error) {
      console.error("Erreur lors de l'insertion des données dans la base de données InfluxDB :", error);
  }
}


  module.exports = {insertDataToInfluxDB}