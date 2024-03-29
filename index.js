const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { InfluxDB, Point } = require("@influxdata/influxdb-client");
const { insertDataToInfluxDB } = require("./influxDB.js");
const { queryArchiveDataFromInfluxDB } = require("./archive.js");
const { queryDataFromInfluxDB } = require("./live.js");
const { queryFilteredDataFromInfluxDB } = require("./live.js");
const app = express();

app.use(cors());

const token = process.env.INFLUXDB_TOKEN;
const url = "http://localhost:8086";
const org = "ensg";
const bucket = "db_live";

const client = new InfluxDB({ url, token });

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
    const { from, to, filter, interval } = req.query;
    if (from === undefined) {
      return res.status(400).json({ error: "Le paramètre date_debut est obligatoire" });
    }

    const filterArray = filter ? filter.split(',') : null;

    const data = await queryArchiveDataFromInfluxDB(from, to, filterArray, interval);
    res.json(data);
  } catch (error) {
    console.error("Erreur lors de la récupération des données archive:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des données live" });
  }
});


// Démarrer le serveur Express
const PORT = process.env.PORT || 80;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur Express écoutant sur le port ${PORT}`);
});
