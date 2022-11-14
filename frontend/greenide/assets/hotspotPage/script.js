const vscode = acquireVsCodeApi();

let hotspotCount = 5;
let hotspotType = "runtime";

let currentHotspotRuntime;
let currentHotspotEnergy;
let currentGreenspotRuntime;
let currentGreenspotEnergy;

//Code after DOM is loaded
(function(){

    const hotspotCountSelect = document.getElementById("hotspotCountSelect");

    hotspotCountSelect.addEventListener("change", () => {
        hotspotCount = parseInt(hotspotCountSelect.value);
        vscode.postMessage({
            command: 'hotspotCountChange',
            hotspotCount: hotspotCount,
          });
        setHotspotsAndGreenspots();
    });
    
    const hotspotTypeSelect = document.getElementById("hotspotTypeSelect");

    hotspotTypeSelect.addEventListener("change", () => {
        hotspotType = hotspotTypeSelect.value;
        vscode.postMessage({
            command: 'hotspotTypeChange',
            hotspotType: hotspotType,
          });
        setHotspotsAndGreenspots();
    });

}());

window.addEventListener('message', event => {
    const message = event.data; 
    if(message.command === 'sendHotspots'){
        currentHotspotRuntime = message.hotspotRuntime;
        currentHotspotEnergy = message.hotspotEnergy;
        currentGreenspotRuntime = message.greenspotRuntime;
        currentGreenspotEnergy = message.greenspotEnergy;

        hotspotType = message.hotspotType;
        document.getElementById("hotspotTypeSelect").value = message.hotspotType;
        hotspotCount = message.hotspotCount;
        document.getElementById("hotspotCountSelect").value = message.hotspotCount;

        setHotspotsAndGreenspots();
    }
});

function setHotspotsAndGreenspots(){
    switch(hotspotType){
        case "runtime":
            setList("hotspotList", currentHotspotRuntime);
            setList("greenspotList", currentGreenspotRuntime);
            break;
        case "energy":
            setList("hotspotList", currentHotspotEnergy);
            setList("greenspotList", currentGreenspotEnergy);
            break;
    }
}

function setList(listID, spots){
    let innerHTML = "";

    for(let i = 0; i < Math.min(hotspotCount, spots.length); i++){
        let printableName = spots[i].name;
        printableName = printableName.replace("<", "&lt");
        printableName = printableName.replace(">", "&gt");
        innerHTML += `<div class="hotspot" onClick="openEditor('${spots[i].name}')">${printableName}</div>`;
    };

    document.getElementById(listID).innerHTML = innerHTML;
}

function openEditor(name){
    vscode.postMessage({
        command: 'openEditor',
        methodName: name,
      });
}