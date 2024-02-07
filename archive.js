const fs = require("fs");
const { InfluxDB, Point } = require("@influxdata/influxdb-client");
const {parseNMEA, parseInterval} = require("./util.js");
const token = process.env.INFLUXDB_TOKEN;
const url = "http://localhost:8086";
const org = "ensg";
const bucket = "db_live_2";

const client = new InfluxDB({ url, token });

async function queryArchiveDataFromInfluxDB(
    date_debut,
    date_fin = null,
    filter = null,
    interval = null
  ) {
    let fluxQuery;
    let measurements;
    const filePath = "gpsNmea";
    const { latitude, longitude } = parseNMEA(filePath);
  
    const logFilePath = "rainCounter.log";
    const logContent = fs.readFileSync(logFilePath, "utf8");
  
    const queryApi = client.getQueryApi(org);
  
    if (filter != null) {
      measurements = filter;
    } else {
      measurements = [
        "temperature",
        "pressure",
        "humidity",
        "luminosity",
        "wind_heading",
        "wind_speed_avg",
        "rain",
        "longitude",
        "latitude",
      ];
    }
  
    const intervalMs = parseInterval(interval);
  
    const jsonData = {
      name: "SensorName",
      location: { date: "", coords: [latitude, longitude] },
      status: true,
      measurements: {
        date: "",
        rain: logContent,
        light: [],
        temperature: [],
        humidity: [],
        pressure: [],
        wind: { speed: [], direction: [] },
      },
    };
  
    const resultPromises = measurements.map(async (measurement) => {
      let fieldName = measurement;
      if (measurement === "luminosity") {
        fieldName = "light";
      } else if (measurement === "wind_heading") {
        fieldName = "direction";
      } else if (measurement === "wind_speed_avg") {
        fieldName = "speed";
      }
  
      if (date_fin === null) {
        fluxQuery = `
          from(bucket: "${bucket}")
          |> range(start: ${date_debut})
          |> filter(fn: (r) => r["_measurement"] == "${measurement}")
          |> filter(fn: (r) => r["_field"] == "value")
        `;
      } else {
        fluxQuery = `
          from(bucket: "${bucket}")
          |> range(start: ${date_debut}, stop: ${date_fin})
          |> filter(fn: (r) => r["_measurement"] == "${measurement}")
          |> filter(fn: (r) => r["_field"] == "value")
        `;
      }
      
  
      if (intervalMs) {
        fluxQuery += `|> aggregateWindow(every: ${intervalMs}, fn: mean)`;
      }
  
      const result = await queryApi.collectRows(fluxQuery);
      if (result.length > 0) {
        // Parcourir toutes les lignes de résultats
        result.forEach((row) => {
          // Ajouter chaque valeur à la liste appropriée dans jsonData.measurements
          if (fieldName === "speed" || fieldName === "direction") {
            jsonData.measurements.wind[fieldName].push(parseFloat(row._value));
          } else {
            jsonData.measurements[fieldName].push(parseFloat(row._value));
          }
        });
      }
    });
  
    await Promise.all(resultPromises);
  
    const currentDate = new Date().toISOString();
    jsonData.location.date = currentDate;
    jsonData.measurements.date = currentDate;
  
    return jsonData;
  }
  
  module.exports = {queryArchiveDataFromInfluxDB}