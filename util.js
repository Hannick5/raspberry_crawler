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
      case "s": if(value<10) {return `${10}s`} else {return `${value}s`}; // Secondes
      case "m": return `${value}m`; // Minutes
      case "h": return `${value}h`; // Heures
      case "D": return `${value}d`; // Jours
      case "M": return `${value}mo`; // Mois
      case "Y": return `${value}y`; // Années
      default: return null;
    }
  }

  module.exports = { parseNMEA, parseInterval };