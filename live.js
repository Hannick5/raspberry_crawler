const fs = require("fs");
const { InfluxDB, Point } = require("@influxdata/influxdb-client");
const { parseNMEA } = require("./util.js");
const token = process.env.INFLUXDB_TOKEN;
const url = "http://localhost:8086";
const org = "ensg";
const bucket = "db_live";

const client = new InfluxDB({ url, token });

async function queryDataFromInfluxDB() {
  const queryApi = client.getQueryApi(org);
  const measurements = [
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
  const jsonData = {
    name: "SensorName",
    location: { date: "", coords: [] },
    status: true,
    measurements: {
      date: "",
      rain: 0,
      light: 0,
      temperature: 0,
      humidity: 0,
      pressure: 0,
      wind: { speed: 0, direction: 0 },
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

    const fluxQuery = `
          from(bucket: "${bucket}")
          |> range(start: -7d)
          |> filter(fn: (r) => r["_measurement"] == "${measurement}")
          |> filter(fn: (r) => r["_field"] == "value")
          |> last()
      `;

    const result = await queryApi.collectRows(fluxQuery);
    if (result.length > 0) {
      if (fieldName === "speed" || fieldName === "direction") {
        jsonData.measurements.wind[fieldName] = parseFloat(result[0]._value);
      } else if (fieldName === "rain") {
        jsonData.measurements[fieldName] = result[0]._value;
      } else if (fieldName === "latitude") {
        jsonData.location.coords[0] = parseFloat(result[0]._value);
      } else if (fieldName === "longitude") {
        jsonData.location.coords[1] = parseFloat(result[0]._value);
      } else {
        jsonData.measurements[fieldName] = parseFloat(result[0]._value);
      }
    }
  });

  await Promise.all(resultPromises);

  const currentDate = new Date().toISOString();
  jsonData.location.date = currentDate;
  jsonData.measurements.date = currentDate;

  return jsonData;
}

async function queryFilteredDataFromInfluxDB() {
  const queryApi = client.getQueryApi(org);

  const jsonData = {
    name: "SensorName",
    location: { date: "", coords: [0, 0] },
    status: true,
    measurements: {
      date: "",
      rain: 0,
      temperature: 0,
      pressure: 0,
    },
  };

  const resultPromises = [
    "temperature",
    "pressure",
    "rain",
    "longitude",
    "latitude",
  ].map(async (measurement) => {
    const fluxQuery = `
              from(bucket: "${bucket}")
              |> range(start: -7d)
              |> filter(fn: (r) => r["_measurement"] == "${measurement}")
              |> filter(fn: (r) => r["_field"] == "value")
              |> last()
          `;

    const result = await queryApi.collectRows(fluxQuery);
    if (result.length > 0) {
      if (measurement === "rain") {
        jsonData.measurements[measurement] = result[0]._value;
      } else if (measurement === "latitude") {
        jsonData.location.coords[0] = parseFloat(result[0]._value);
      } else if (measurement === "longitude") {
        jsonData.location.coords[1] = parseFloat(result[0]._value);
      } else {
        jsonData.measurements[measurement] = parseFloat(result[0]._value);
      }
    }
  });

  await Promise.all(resultPromises);

  const currentDate = new Date().toISOString();
  jsonData.location.date = currentDate;
  jsonData.measurements.date = currentDate;

  return jsonData;
}

module.exports = { queryDataFromInfluxDB, queryFilteredDataFromInfluxDB };
