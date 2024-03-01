const fs = require("fs");
const { InfluxDB, Point } = require("@influxdata/influxdb-client");
const {
  parseInterval,
  parseIntervalMS,
  datesDansIntervalle,
} = require("./util.js");
const token = process.env.INFLUXDB_TOKEN;
const url = "http://localhost:8086";
const org = "ensg";
const bucket = "db_live";

const client = new InfluxDB({ url, token });

async function queryArchiveDataFromInfluxDB(
  date_debut,
  date_fin = null,
  filter = null,
  interval = null
) {
  let fluxQuery;
  let measurements;
  let dateArray;
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

  let intervalMs = parseInterval(interval);

  if (date_fin === null) {
    dateArray = [date_debut, new Date().toISOString()];
  } else {
    dateArray = [date_debut, date_fin];
  }

  if (interval === null) {
    intervalMs = '1d';
  }
  else {
    intervalMs = parseInterval(interval);
  }

  let date1 = datesDansIntervalle(dateArray[0], dateArray[1], parseIntervalMS(intervalMs));

  const jsonData = {
    name: "PIENSG030",
    location: { date: dateArray, coords: [] },
    status: true,
    measurements: {
      date: date1,
      rain: [],
      light: [],
      temperature: [],
      humidity: [],
      pressure: [],
      wind: { speed: [], direction: [] },
    },
  };

  const resultPromises = measurements.map(async (measurement) => {
    fluxQuery = `
      from(bucket: "${bucket}")
      |> range(start: ${dateArray[0]}, stop: ${dateArray[1]})
      |> filter(fn: (r) => r["_measurement"] == "${measurement}")
      |> filter(fn: (r) => r["_field"] == "value")
    `;

    fluxQuery += `|> aggregateWindow(every: ${intervalMs}, fn:mean)`;
    const result = await queryApi.collectRows(fluxQuery);
    if (result.length > 0) {
      // Parcourir toutes les lignes de résultats
      result.forEach((row) => {
        // Ajouter chaque valeur à la liste appropriée dans jsonData.measurements
        if (measurement === "longitude") {
          jsonData.location.coords[0] = parseFloat(row._value);
        } else if (measurement === "latitude") {
          jsonData.location.coords[1] = parseFloat(row._value);
        } else if (measurement === "rain"){
          jsonData.measurements.rain.push(parseFloat(row._value));
        } else {
          let fieldName = measurement;
          if (measurement === "luminosity") {
            fieldName = "light";
          } else if (measurement === "wind_heading") {
            fieldName = "direction";
          } else if (measurement === "wind_speed_avg") {
            fieldName = "speed";
          }
          if (fieldName === "speed" || fieldName === "direction") {
            jsonData.measurements.wind[fieldName].push(parseFloat(row._value));
          } else {
            jsonData.measurements[fieldName].push(parseFloat(row._value));
          }
        }
      });
    }
  });

  await Promise.all(resultPromises);

  const currentDate = new Date().toISOString();
  jsonData.measurements.rain = jsonData.measurements.rain.length
    ? jsonData.measurements.rain
    : null;

  return jsonData;
}
module.exports = { queryArchiveDataFromInfluxDB };
