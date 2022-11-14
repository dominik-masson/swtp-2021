const vscode = acquireVsCodeApi();

function setSettings(configType) {//wenn button zum abspeichern gedrueckt wird
  var parametersFieldset = document.getElementById('parameters');
	const checkboxes = Array.from(parametersFieldset.querySelectorAll('input[type="checkbox"]'));  
	
	var values=[];										

  for (var i = 0; i < checkboxes.length; i++) {
    checkboxes[i].checked ? values[i] = 1 : values[i] = 0;   
  }

  let valuesToPost = []

  switch(configType){
    case "default":
      valuesToPost = values.slice( 0, values.length/2);
      break;
    case "custom":
      valuesToPost = values.slice(values.length/2, values.length);
      break;
    default:
      break;
  }

  vscode.postMessage({
    command: 'configChange',
    configType: configType,
    configData: valuesToPost
  });
};



window.addEventListener('message', event => {
  const message = event.data; 

  switch (message.command) {
      case 'setParameters':
        let HTMLstring = "";
        let HTMLstring1 = "";
        let HTMLstring2 = "";

        message.parameterKeys.forEach((key, index) => {
          let checked1 = message.defaultConfigData[index] ? 'checked' : '';
          let checked2 = message.configData[index] ? 'checked' : '';
          let disabledCheckboxes = index==0 ? 'disabled' : '';
          HTMLstring1 += `<div><input type="checkbox" id="d${index}" ${checked1} ${disabledCheckboxes}><label for="d${index}">${key}</label></div>`;
          HTMLstring2 += `<div><input type="checkbox" id="c${index}" ${checked2} ${disabledCheckboxes}><label for="c${index}">${key}</label></div>`;
        });
        HTMLstring=`<fieldset>` + HTMLstring1 + `</fieldset><fieldset>` + HTMLstring2 + `</fieldset>`;
        document.getElementById("parameters").innerHTML = HTMLstring;
      
        break;
  }
});



document.getElementById('defaultSettings').addEventListener('click', function(){setSettings('default');});
document.getElementById('newSettings').addEventListener('click', function(){setSettings('custom');});
