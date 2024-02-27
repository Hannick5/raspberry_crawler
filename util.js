const fs = require("fs");

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

function parseInterval(interval) {
  if (!interval) return null;

  const value = parseInt(interval.slice(0, -1)); // Récupère la valeur numérique
  const unit = interval.slice(-1); // Récupère l'unité de temps

  switch (unit) {
    case "s": if (value < 10) { return `${10}s` } else { return `${value}s` }; // Secondes
    case "m": return `${value}m`; // Minutes
    case "h": return `${value}h`; // Heures
    case "D": return `${value}d`; // Jours
    case "M": return `${value}mo`; // Mois
    case "Y": return `${value}y`; // Années
    default: return null;
  }
}

function parseIntervalMS(interval) {
  if (!interval) return null;

  const value = parseInt(interval.slice(0, -1)); // Récupère la valeur numérique
  const unit = interval.slice(-1); // Récupère l'unité de temps

  switch (unit) {
    case "s": return value * 1000; // Secondes
    case "m": return value * 60000; // Minutes
    case "h": return value * 3600000; // Heures
    case "d": return value * 86400000; // Jours
    case "mo": return value * 2592000000; // Mois
    case "y": return value * 31536000000; // Années
    default: return null;
  }
}


function datesDansIntervalle(dateDebutISO, dateFinISO, intervalleEnMillisecondes) {
  // Convertir les dates en objets Date
  const debut = new Date(dateDebutISO);
  const fin = new Date(dateFinISO);

  // Initialiser un tableau pour stocker les dates résultantes
  const dates = [];

  // Ajouter la date de début au tableau
  dates.push(new Date(debut));

  // Définir la date courante comme la date de début
  let currentDate = new Date(debut);

  // Tant que la date courante est inférieure à la date de fin
  while (currentDate < fin) {
    // Ajouter l'intervalle à la date courante
    currentDate = new Date(currentDate.getTime() + intervalleEnMillisecondes);

    // Si la date résultante est inférieure ou égale à la date de fin, l'ajouter au tableau
    if (currentDate <= fin) {
      dates.push(new Date(currentDate));
    }
  }

  // Retourner le tableau de dates
  return dates;
}

module.exports = { parseNMEA, parseInterval, parseIntervalMS, datesDansIntervalle };