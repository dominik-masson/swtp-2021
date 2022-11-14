//import Fkt
import_csv_reader = require('./csv_reader_function');
//compare arrays
const sortArray = require('sort-array')
//Server
const express = require('express');
const app = express();

const models = [
  {
    name: "kanzi",
    path: "java/src/main/java",
    requiredPath: "java/src/main/java/kanzi"
  },
  {
    name: "dconvert",
    path: "src/main/java",
    requiredPath: "src/main/java/at/favre/tools/dconvert"
  }
]

app.use(express.json());

app.use(express.urlencoded({
  extended: true
}));

const getMethodParameters = async (req, res) => {
  if(req.body && req.body.config && req.body.greenidePackage && req.body.oldConfig){
    let hotspotRuntime = [];
    let hotspotEnergy = [];

    let csv_data = await import_csv_reader.readCSV("./models/" + req.body.greenidePackage + ".csv");
    let methods = await import_csv_reader.readAndCalcParameters(req.body.config, csv_data); //Elemente haben die Form: {name: currentMethodName, runtime: currentRuntime, energy: currentEnergy}

    if( req.body.oldConfig.length>0 && !arrayEquals(req.body.oldConfig, req.body.config) ){
      let oldConfigMethods = await import_csv_reader.readAndCalcParameters(req.body.oldConfig, csv_data); //alte config wird berechnet
      let comparisonArray = await import_csv_reader.compareNewOld(methods ,oldConfigMethods); //Aufbau: Array={Element1,...}; Element1={name: methods[i].name, runtimeSpot: runtimeSpot, energySpot: energySpot, oldRuntime: oldConfigMethods[i].runtime, oldEnergy: oldConfigMethods[i].energy}
      hotspotRuntime = [].concat(sortArray(comparisonArray,  //array ist wie comparisonarray aufgebaut nur nach hotspots geordnet
                                           {by: 'compare', 
                                            order: 'desc', //descending order
                                            computed: { compare: comparisonArray => comparisonArray.runtimeSpot}} //runtime ist die Vergleichsgröße
                                          )); 
      hotspotEnergy = sortArray(comparisonArray,  //array ist wie comparisonarray aufgebaut nur nach hotspots geordnet
                                {by: 'compare', 
                                 order: 'desc', //descending order
                                 computed: { compare: comparisonArray => comparisonArray.energySpot}} //runtime ist die Vergleichsgröße
                               ); 
    }
    res.status(200).send({methods: methods, hotspotRuntime: hotspotRuntime, hotspotEnergy: hotspotEnergy});//sendet methodArray, hotspotruntime und -energy(für greenspots muss hotspot nur reversed werden)
  }else{
    res.status(500).send("wrong parameters");  
  }
};

app.post('/getMethodParameters', getMethodParameters);

app.post('/getParameters', async (req, res) => {
  if(req.body && req.body.greenidePackage){
    try{
      //Read config parameters from greenidePackage.csv
      let parameters = await import_csv_reader.readConfigParameters("./models/" + req.body.greenidePackage + ".csv");
      res.status(200).send(parameters)
    }catch(e){
      res.status(500).send(e)
    }
  }else{
    res.status(500).send("wrong parameters")
  }
})

app.post('/getModels', async (req, res) => {
  res.status(200).send(models);
});

module.exports = app;

function arrayEquals(array1, array2){
  let isEqual = true
  if(array1.length === array2.length){
    array1.forEach((element, index) => {
      if(element !== array2[index]){
        isEqual=false;
      }
    });
  } else {
    isEqual=false;
  }
  return isEqual;
}