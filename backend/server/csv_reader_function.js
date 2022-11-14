const fs = require('fs')

function readConfigParameters(filePath){
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8' , (err, data) => {
      if (err) {
        reject("Something went wrong with reading the csv");
        return;
      }

      let zeilen = data.split('\n');
      let ersteZeile = zeilen[0];
      ersteZeile = ersteZeile.replace(/"/g, '');
      let parameters = ersteZeile.split(',');
      
      //Entferne unnötige Einträge
      parameters.shift()
      parameters.pop()
      parameters.pop()

      resolve(parameters);
    });
  });
}
exports.readConfigParameters = readConfigParameters;//exports function

function readCSV(filePath){
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8' , (err, data) => {
        if (err) {
          reject("Something went wrong with reading the csv");
          return;
        }
        resolve(data);
    });
  });
}
exports.readCSV = readCSV;

function readAndCalcParameters(eingabeConfig, /*filePath*/csv_data){
  let zeilen = csv_data.split('\n');
  zeilen.shift();//nimmt erste Zeile raus

  //Zwischenspeicher für Berechnungen
  let ersteZeile = zeilen[0].split('"');
  let currentMethodName = ersteZeile[1];
  let currentRuntime = 0;
  let currentEnergy = 0;

  //Rückkgabearray
  let calculatedMethods = [];

  //Gehe Zeile für Zeile durch
  zeilen.forEach((zeile) => {
    if(zeile !== ""){      
        let zeilenTemp = zeile.split('"');
        let zeilenMethodenname = zeilenTemp[1];
        let zeilenarray = zeilenTemp[2].split(',');

        let zeilenConfig = zeilenarray.slice(1,zeilenarray.length-2);

        //Methodenname der aktuellen Zeile
        if(currentMethodName !== zeilenMethodenname){
            //Fertig berechnete Methode wird in Rückgabearray gepusht
              //console.log(currentMethodName,currentEnergy, currentRuntime);
            calculatedMethods.push({name: currentMethodName, runtime: currentRuntime, energy: currentEnergy});
            //Setze CurrentMethodenname auf neue sMethode und resette Runtime und Energy für Neuberechnung
            currentMethodName = zeilenMethodenname;
            currentRuntime = 0;
            currentEnergy = 0;
        }

        //Wenn die Zeilenconfig mit der Eingabeconfig passt, dann addiere Werte der Zeile
        if(configMatches(eingabeConfig, zeilenConfig)){
            currentRuntime += parseFloat(zeilenarray[zeilenarray.length-2]); //addiere Runtime der Zeile
            currentEnergy += parseFloat(zeilenarray[zeilenarray.length-1]); //addiere Energy der Zeile
        }
    }
  });
  return calculatedMethods;
}
exports.readAndCalcParameters = readAndCalcParameters;//exports function

function configMatches(eingabeConfig, zeilenConfig){ //eingabeKonfig vom Frontend | zeilenkonfig sind alle konfigs für die fkt als der csv
  let configsMatch = true;

  if(eingabeConfig.length !== zeilenConfig.length){
    return false;
  }

  for(let i = 0; i < zeilenConfig.length; i++){
    if(parseInt(eingabeConfig[i]) === 1 && parseInt(zeilenConfig[i]) === 1){ //wenn match bei nur einer 1 dann addiere 
      configsMatch = true;
    }
    if(parseInt(eingabeConfig[i]) === 0 && parseInt(zeilenConfig[i]) === 1){ //abbruchbedingung falls in zeilenconfig ne 1 zu viel(missmatch)
          configsMatch = false;
          break;
    }
  }

  return configsMatch;
}
exports.configMatches = configMatches;//exports function

function compareNewOld(methods, oldConfigMethods){//.runtime, .energy | vergleicht alten runtimes/energyconsumptions mit neuen und rechnet prozentuale abnahme/zunahme aus
  if(methods.length !== oldConfigMethods.length){
    throw "Array lengths do not match";
  }
  
  let spotArray = [];
  for(i=0;i<methods.length;i++){
      if(methods[i].name!==oldConfigMethods[i].name){//falls es sich nicht gleicht, fehler im array 
        throw "Method names do not match";
      }
      let runtimeSpot = compareMethodparameters(methods[i].runtime, oldConfigMethods[i].runtime);
      let energySpot = compareMethodparameters(methods[i].energy, oldConfigMethods[i].energy);
      spotArray.push({name: methods[i].name, runtimeSpot: runtimeSpot, energySpot: energySpot, oldRuntime: oldConfigMethods[i].runtime, oldEnergy: oldConfigMethods[i].energy});             
  }
  return spotArray;
}
exports.compareNewOld = compareNewOld;//exports function

function compareMethodparameters(wertNeu, wertAlt){
  if(wertAlt!==0){//Do not divide by 0
    return ((wertNeu-wertAlt)/Math.abs(wertAlt)); //rechnet prozent zunahme/abnhame aus
  } else {
    return 0;
  }
}