const express = require("express");
const cors = require("cors");
const fs = require("fs");
const GPS = require("gps");
const { InfluxDB, Point } = require("@influxdata/influxdb-client");

const app = express();

app.use(cors());

const token = process.env.INFLUXDB_TOKEN;
const url = "http://localhost:8086";
const org = "ensg";
const bucket = "db_live_2";

const client = new InfluxDB({ url, token });

const dataFilePath = "test.json";

const gps = new GPS();

// Fonction pour insérer les données dans la base de données InfluxDB
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

async function queryDataFromInfluxDB() {
  const filePath = "gpsNmea";
  const { latitude, longitude } = parseNMEA(filePath);

  const logFilePath = "rainCounter.log";
  const logContent = fs.readFileSync(logFilePath, "utf8");

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
    location: { date: "", coords: [latitude, longitude] },
    status: true,
    measurements: {
      date: "",
      rain: logContent,
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
        |> range(start: -1d)
        |> filter(fn: (r) => r["_measurement"] == "${measurement}")
        |> filter(fn: (r) => r["_field"] == "value")
        |> last()
    `;

    const result = await queryApi.collectRows(fluxQuery);
    if (result.length > 0) {
      if (fieldName === "speed" || fieldName === "direction") {
        jsonData.measurements.wind[fieldName] = parseFloat(result[0]._value);
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
  const filePath = "gpsNmea";
  const { latitude, longitude } = parseNMEA(filePath);

  const logFilePath = "rainCounter.log";
  const logContent = fs.readFileSync(logFilePath, "utf8");

  const queryApi = client.getQueryApi(org);

  const jsonData = {
    name: "SensorName",
    location: { date: "", coords: [latitude, longitude] },
    status: true,
    measurements: {
      date: "",
      rain: logContent,
      temperature: 0,
      pressure: 0,
    },
  };

  const resultPromises = ["temperature", "pressure"].map(
    async (measurement) => {
      const fluxQuery = `
            from(bucket: "${bucket}")
            |> range(start: -1d)
            |> filter(fn: (r) => r["_measurement"] == "${measurement}")
            |> filter(fn: (r) => r["_field"] == "value")
            |> last()
        `;

      const result = await queryApi.collectRows(fluxQuery);
      if (result.length > 0) {
        jsonData.measurements[measurement] = parseFloat(result[0]._value);
      }
    }
  );

  await Promise.all(resultPromises);

  const currentDate = new Date().toISOString();
  jsonData.location.date = currentDate;
  jsonData.measurements.date = currentDate;

  return jsonData;
}

async function queryArchiveDataFromInfluxDB(date_debut=null, date_fin=null, champs=null) {
    let fluxQuery;
    const filePath = 'gpsNmea';
    const { latitude, longitude } = parseNMEA(filePath);
  
    const logFilePath = 'rainCounter.log';
    const logContent = fs.readFileSync(logFilePath, 'utf8');
  
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
  
  
      fluxQuery = `
      from(bucket: "${bucket}")
      |> range(start: 2024-02-06T05:28:04.976Z, stop: 2024-02-06T09:28:04.975Z)
      |> filter(fn: (r) => r["_measurement"] == "${measurement}")
      |> filter(fn: (r) => r["_field"] == "value")
  `;
  
      const result = await queryApi.collectRows(fluxQuery);
      if (result.length > 0) {
        // Parcourir toutes les lignes de résultats
        result.forEach(row => {
          // Ajouter chaque valeur à la liste appropriée dans jsonData.measurements
          if (fieldName === "speed" || fieldName === "direction") {
            console.log(parseFloat(row._value))
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
  

// API

app.get("/live", async (req, res) => {
  try {
    if (req.query.ptdr !== undefined) {
      const data = await queryFilteredDataFromInfluxDB();
      res.json(data);
    } else {
      const data = await queryDataFromInfluxDB();
      res.json(data);
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des données live:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des données live" });
  }
});

app.get("/archive", async (req, res) => {
    try {
        const data = await queryArchiveDataFromInfluxDB("2024-02-06T06:28:04.975Z", "2024-02-06T07:28:04.975Z");
        res.json(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des données live:", error);
      res
        .status(500)
        .json({ error: "Erreur lors de la récupération des données live" });
    }
  });

function parseNMEA(filePath) {
  const data = fs.readFileSync(filePath, "utf8");
  const lines = data.split("\n");

  let latitude, longitude;

  for (const line of lines) {
    if (line.startsWith("$GPGGA")) {
      const parts = line.split(",");
      if (parts.length >= 10) {
        const lat = parseFloat(parts[2]);
        const latDirection = parts[3];
        const lon = parseFloat(parts[4]);
        const lonDirection = parts[5];

        // Convertir en degrés décimaux
        latitude = convertToDecimalDegrees(lat, latDirection);
        longitude = convertToDecimalDegrees(lon, lonDirection);

        break; // Sortir de la boucle après avoir trouvé GPGGA
      }
    }
  }

  return { latitude, longitude };
}

function convertToDecimalDegrees(coordinate, direction) {
  // La latitude est au format DDMM.MMMM, la longitude est au format DDDMM.MMMM
  // Convertir en degrés décimaux
  const degrees = Math.floor(coordinate / 100);
  const minutes = coordinate - degrees * 100;
  const decimalDegrees = degrees + minutes / 60;

  // Ajouter la direction (N, S, E, W)
  if (direction === "S" || direction === "W") {
    return -decimalDegrees;
  } else {
    return decimalDegrees;
  }
}

// Fonction principale pour lire les données et les insérer dans InfluxDB toutes les 30 secondes
async function main() {
  try {
    await insertDataToInfluxDB(dataFilePath, "gpsNmea", "rainCounter.log");

    console.log(
      "Données interrogées avec succès depuis la base de données InfluxDB."
    );
  } catch (error) {
    console.error(
      "Erreur lors de l'insertion ou de l'interrogation des données dans la base de données InfluxDB :",
      error
    );
  }
}

// Appeler la fonction principale toutes les 30 secondes
setInterval(main, 1000);

// Démarrer le serveur Express
const PORT = process.env.PORT || 3000;
app.listen(PORT,"0.0.0.0",() => {
  console.log(`Serveur Express écoutant sur le port ${PORT}`);
});
