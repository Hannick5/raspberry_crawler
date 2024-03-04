# Raspberry Crawler

## Description

Ce dépôt contient le code source de l'API et du Back-End du projet station-météo. Cette application lit des données et les insère dans une base de données InfluxDB toutes les 30 secondes et expose l'API.

## Installation

Pour installer et exécuter l'application, suivez ces étapes :

1. Clonez le dépôt sur votre machine locale en utilisant `git clone [URL du dépôt]`.
2. Naviguez vers le répertoire du projet avec `cd [nom du répertoire]`.
3. Installez les dépendances avec `npm install`.
4. Définissez la variable d'environnement `INFLUXDB_TOKEN` avec votre token InfluxDB.
5. Exécutez l'application avec node `node influxDB.js` pour insérer les données dans la BDD.
6. Exécutez l'application avec `node index.js` pour exposer l'API

L'application devrait maintenant être en cours d'exécution et insérer des données dans votre base de données InfluxDB toutes les 30 secondes.

## Fichiers

- `index.js` : Le point d'entrée principal de l'API.
- `live.js` : Contient des fonctions pour interroger les données en direct de InfluxDB.
- `archive.js` : Contient une fonction pour interroger les données archivées de InfluxDB.
- `influxDB.js` : Contient une fonction pour insérer des données dans InfluxDB.
- `util.js` : Contient des fonctions utilitaires utilisées par d'autres scripts.

## Dépendances

Ce projet utilise les dépendances suivantes :

- `@influxdata/influxdb-client` : Pour interagir avec InfluxDB.
- `cors` : Pour gérer CORS dans Express.
- `express` : Pour exécuter le serveur web.
- `gps` : Pour analyser les données GPS.
- `influx` : Pour interagir avec InfluxDB.
