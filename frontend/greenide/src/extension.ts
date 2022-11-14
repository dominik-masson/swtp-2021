// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios from 'axios';

// is required to read and wirte files with Node.js
import * as fs from 'fs';

const path = require('path');

// Save current path of the project, it is important to be in the direct folder
let folderPath = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath);

const configName = "greenide.config";
const defaultConfigName = "greenide.default.config";

// decortor type for hotspots
const hotspotsDecoration = vscode.window.createTextEditorDecorationType({
	overviewRulerLane: vscode.OverviewRulerLane.Full,
	light: {
		backgroundColor: '#bf6161',//'#d65c5e',
		overviewRulerColor: '#bf6161',//'#d65c5e',
	},
	dark: {
		backgroundColor: '#a82a2d',
		overviewRulerColor: '#a82a2d',
	}
});

const greenspotDecoration = vscode.window.createTextEditorDecorationType({
	overviewRulerLane: vscode.OverviewRulerLane.Full,
	light: {
		backgroundColor: '#6aa84f',//'#51d655',
		overviewRulerColor: '#6aa84f',//'#51d655',
	},
	dark: {
		backgroundColor: '#274e13',//'#07ad0c',
		overviewRulerColor: '#274e13'//'#07ad0c',
	}
});

//Zwischenspeicherung der Config Arrays
let configArrayCache : any[] = [];
let defaultConfigArrayCache : any[] = [];
let standardConfigArray : number[] = [];

let currentModel : any = {};

let currentParameterKeys : any[] = [];

let currentHoverProvider : vscode.Disposable;

let currentHotspotRuntime : any;
let currentHotspotEnergy : any;
let currentGreenspotRuntime : any;
let currentGreenspotEnergy : any;

let currentHotspotType = "runtime";
let currentHotspotCount = 5;

let currentHotspotWebviewPanel : vscode.WebviewPanel;

// this method is called when your extension is activated
// your extension is activated the when you open your project folder
export function activate(context: vscode.ExtensionContext) {

	vscode.window.showInformationMessage('GreenIDE is now active!');

	initializeGreenide(context);

	let settingsDisposable = vscode.commands.registerCommand('greenide.config', () => {
		const panel = vscode.window.createWebviewPanel(
			'GreenIde',
			'Settings',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);
		const cssPath = vscode.Uri.file(
			path.join(context.extensionPath, 'assets', "settingsPage", 'style.css')
		);
		const cssSRC = panel.webview.asWebviewUri(cssPath);

		const jsPath = vscode.Uri.file(
			path.join(context.extensionPath, 'assets', "settingsPage", 'script.js')
		);

		const jsSRC = panel.webview.asWebviewUri(jsPath);

		console.log(cssSRC, jsSRC);
		
		panel.webview.html = getSettingsPageContent(cssSRC.toString(), jsSRC.toString());

		panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'configChange':
						let configFileName = "";
						switch(message.configType){
							case "custom":
								configFileName = configName;
								break;
							default:
								configFileName = defaultConfigName;
								break;
						}
						
						//Ändert die ConfigDatei
						updateConfig(configFileName, message.configData);
						//Schickt Updates an Server
						configsUpdated(configFileName, context);
						break;
				}
			},
			undefined,
			context.subscriptions
		);

		if(folderPath && configArrayCache.length > 0 && defaultConfigArrayCache.length > 0){
			try {
				if (!fs.existsSync(path.join(folderPath[0], configName))) {
					fs.writeFileSync(path.join(folderPath[0], configName), configArrayCache.toString());
				}
				if (!fs.existsSync(path.join(folderPath[0], defaultConfigName))) {
					fs.writeFileSync(path.join(folderPath[0], defaultConfigName), defaultConfigArrayCache.toString());
				}
			} catch(err) {
				console.error(err);
			}
		}

		if(currentParameterKeys.length > 0){
			panel.webview.postMessage({ 
				command: 'setParameters', 
				parameterKeys: currentParameterKeys,
				configData: readConfig(configName),
				defaultConfigData: readConfig(defaultConfigName),
			});
		}
	});
	context.subscriptions.push(settingsDisposable);

	let hotspotDisposable = vscode.commands.registerCommand('greenide.hotspots', () => {
		currentHotspotWebviewPanel = vscode.window.createWebviewPanel(
			'GreenIde',
			'HotSpots',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);
		const cssPath = vscode.Uri.file(
			path.join(context.extensionPath, 'assets', "hotspotPage", 'style.css')
		);
		const cssSRC = currentHotspotWebviewPanel.webview.asWebviewUri(cssPath);

		const jsPath = vscode.Uri.file(
			path.join(context.extensionPath, 'assets', "hotspotPage", 'script.js')
		);

		const jsSRC = currentHotspotWebviewPanel.webview.asWebviewUri(jsPath);
		
		console.log(cssSRC, jsSRC);
		
		currentHotspotWebviewPanel.webview.html = getHotspotPageContent(cssSRC.toString(), jsSRC.toString());

		currentHotspotWebviewPanel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'hotspotTypeChange':
						currentHotspotType = message.hotspotType;
						break;
						
					case 'hotspotCountChange':
						currentHotspotCount = message.hotspotCount;
						break;
					case 'openEditor':
						let methodName = message.methodName;
						let parts = [];

						if(methodName.indexOf("(") > -1){
							methodName = methodName.replace(/\(.*\)/, "");
						}

						if(methodName.indexOf("$") > -1){
							let firstSplit = methodName.split("$");
							parts = firstSplit[0].split(".");
						}else{
							parts = methodName.split(".");
							parts.pop();
						}

						let filePath = path.join(vscode.workspace.rootPath, currentModel.path);
						for(let i = 0; i < parts.length; i++){
							filePath = path.join(filePath, parts[i]);
						}
						filePath += ".java";
						
						const openPath = vscode.Uri.file(filePath);
						vscode.workspace.openTextDocument(openPath).then(doc => {
							vscode.window.showTextDocument(doc);
						});


						break;
				}
			},
			undefined,
			context.subscriptions
		);


		if(currentHotspotRuntime && currentHotspotEnergy && currentGreenspotRuntime && currentGreenspotEnergy){
			currentHotspotWebviewPanel.webview.postMessage({ 
				command: 'sendHotspots',
				hotspotCount: currentHotspotCount,
				hotspotType: currentHotspotType,
				hotspotRuntime: currentHotspotRuntime,
				hotspotEnergy: currentHotspotEnergy,
				greenspotRuntime: currentGreenspotRuntime,
				greenspotEnergy: currentGreenspotEnergy,
			});
		}
	});

	context.subscriptions.push(hotspotDisposable);
}

function getSettingsPageContent(cssSRC: string, jsSRC: string){
	return `<!DOCTYPE html>
	<html lang="en">
	<head>
	  <meta charset="utf-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
	
	  <title>Settingswindow</title>
	  <link href="${cssSRC}" rel="stylesheet" type="text/css">
	 
	</head>
	
	<body>
	<h1 style="color:#2ecc71";>GREENIDE SETTINGS</h1>
	

	<fieldset id="parameters">Greenide-Extension wurde nicht gestartet. Bitte richtigen Ordner wählen.
	</fieldset>
	
	<button id="defaultSettings">Set default.config</button>
	<button id="newSettings">Set greenide.config</button>
	
	<script src=${jsSRC}></script>
	
	</body>
	</html>`;
}

function getHotspotPageContent(cssSRC: string, jsSRC: string){
	return `<!DOCTYPE html>
	<html lang="en">
	<head>
	  <meta charset="utf-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
	
	  <title>HotspotWindow</title>
	  <link href="${cssSRC}" rel="stylesheet" type="text/css">
	 
	</head>
	
	<body>
	<h1 style="color:#2ecc71";>GREENIDE HOTSPOTS</h1>
	
	<div class="row">
		<select id="hotspotTypeSelect">
			<option value="runtime" selected>Runtime</option>
			<option value="energy">Energy</option>
		</select>
		<select id="hotspotCountSelect">
			<option value="5">5</option>
			<option value="10">10</option>
			<option value="20">20</option>
			<option value="50">50</option>
		</select>
	</div>

	<div class="row">
		<div class="column">
			<h2>Hotspots</h2>
			<div id="hotspotList" class="list">
			</div>
		</div>
		
		<div class="column">
			<h2>Greenspots</h2>
			<div id="greenspotList" class="list">
			</div>
		</div>
	</div>
	
	<script src=${jsSRC}></script>
	
	</body>
	</html>`;
}

// this method is called when your extension is deactivated
export function deactivate() {}

function updateConfig(configFile: string, configData: any){ 		//writes in configfile
	if(folderPath){
		fs.writeFileSync(path.join(folderPath[0], configFile), configData.toString());
	}
}


function initializeGreenide(context: vscode.ExtensionContext){

	//Verfügbare Modelle abfragen
	axios.post("http://server-backend-swtp-13.herokuapp.com/getModels", {}, {}).then(res => {

		//Checken welches Modell man gerade braucht
		let models = res.data;

		models.forEach((model: any) => {
			if(fs.existsSync(path.join(vscode.workspace.rootPath, model.requiredPath))){
				currentModel = model;
			}
		});

		if(currentModel && currentModel.name){

			//Request Parameterlist from Server
			axios.post("http://server-backend-swtp-13.herokuapp.com/getParameters", {greenidePackage: currentModel.name}, {}).then(res => {
				if(folderPath){
					let standardConfigKeys : string[] = res.data;

					currentParameterKeys = res.data;

					for (let i = 0; i < standardConfigKeys.length; i ++){
						if(i === 0){
							standardConfigArray[i] = 1;
						}else{
							standardConfigArray[i] = 0;
						}
					}

					try {
						if (!fs.existsSync(path.join(folderPath[0], configName))) {
							fs.writeFileSync(path.join(folderPath[0], configName), standardConfigArray.toString());
						}
						if (!fs.existsSync(path.join(folderPath[0], defaultConfigName))) {
							fs.writeFileSync(path.join(folderPath[0], defaultConfigName), standardConfigArray.toString());
						}
					} catch(err) {
						console.error(err);
					}

					let configArray        = readConfig(configName);
					let defaultConfigArray = readConfig(defaultConfigName);

					configArrayCache = configArray;
					defaultConfigArrayCache = defaultConfigArray;

					registerNewMethodHover(context, configArray, defaultConfigArray);
				}

				vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
					if(folderPath){
						if (document.fileName === path.join(folderPath[0], configName)) {
							configsUpdated(configName, context);
						}
						if (document.fileName === path.join(folderPath[0], defaultConfigName)) {
							configsUpdated(defaultConfigName, context);
						}
					}
				});

			});
		}
		else 
		{
			vscode.window.showErrorMessage('No model for this project!');
		}
	});
}


function configsUpdated(configType: string, context: vscode.ExtensionContext){
	let configArray : any[] = configArrayCache;
	let defaultConfigArray : any[] = defaultConfigArrayCache;
	
	switch(configType){
		case configName:
			configArray = readConfig(configType);
			configArrayCache = configArray;
			break;
		case defaultConfigName:
			defaultConfigArray = readConfig(configType);
			defaultConfigArrayCache = defaultConfigArray;
			break;	
		default:
			vscode.window.showErrorMessage('Invalid Config Name !');
			break;
	}
	
	registerNewMethodHover(context, configArray, defaultConfigArray);
}


function readConfig(configType: string){ 
	let configArray: number[] = [];

	if(folderPath){
		let fileContent = fs.readFileSync(path.join(folderPath[0], configType));
		let wrongConfig: boolean = false; 
		let testArray = fileContent.toString().split(",").map(function(item) {
			return parseInt(item);
		});;
		
		try{
			if(fileContent.length !== (currentParameterKeys.length * 2 )-1)
				wrongConfig=true;				
			
			for(let i = 0; i < testArray.length; i++)
				if(testArray[i] !== 0 && testArray[i] !== 1)
					wrongConfig = true;

			if(wrongConfig){
				if(defaultConfigArrayCache.length === 0)
					defaultConfigArrayCache = standardConfigArray;
				
				if(configArrayCache.length === 0)
					configArrayCache = standardConfigArray;

				switch(configType)
				{
					case defaultConfigName:
						configArray = defaultConfigArrayCache;
						updateConfig(defaultConfigName,configArray);
						vscode.window.showErrorMessage('Invalid input in ' + configType + '!  The previous setting is loaded');
						break;
					case configName:
						configArray = configArrayCache;
						updateConfig(configName,configArray);
						vscode.window.showErrorMessage('Invalid input in ' + configType + '!  The previous setting is loaded');
						break;
					default:
						vscode.window.showErrorMessage(configType + ' not found');
						break;
				}
			}
			else
			{
				configArray = testArray;
			}
		}catch{
			vscode.window.showErrorMessage(configType + ' not found or has an invalid input');
		}
	}
	return configArray;
}

function registerNewMethodHover(context: vscode.ExtensionContext, configArray: any[], defaultConfigArray: any[]){

	//Wenn kein passendes Modell gefunden wurde
	if(!currentModel || !currentModel.name){
		return;
	}

	//Abfrage zum Server
	axios.post("http://server-backend-swtp-13.herokuapp.com/getMethodParameters", {config: configArray, greenidePackage: currentModel.name, oldConfig: defaultConfigArray}, {}).then(res => {
		let definedFunctions: any = res.data.methods;
		currentHotspotRuntime = res.data.hotspotRuntime;
		currentHotspotEnergy = res.data.hotspotEnergy;
		currentGreenspotRuntime = [].concat(currentHotspotRuntime).reverse();//Achtung die ersten Elemente werden immer -1 als runtime- und energyHotspot haben
		currentGreenspotEnergy = [].concat(currentHotspotEnergy).reverse();  //same thing

		//Update HotspotWindow wenn offen
		currentHotspotWebviewPanel && currentHotspotWebviewPanel.webview && currentHotspotWebviewPanel.webview.postMessage({ 
			command: 'sendHotspots',
			hotspotCount: currentHotspotCount,
			hotspotType: currentHotspotType,
			hotspotRuntime: currentHotspotRuntime,
			hotspotEnergy: currentHotspotEnergy,
			greenspotRuntime: currentGreenspotRuntime,
			greenspotEnergy: currentGreenspotEnergy,
		});

		//Entferne vorherige HoverProvider
		if(currentHoverProvider){
			currentHoverProvider.dispose();
		}

		highlightHotAndGreenspots();

		vscode.window.onDidChangeVisibleTextEditors(event => {
			highlightHotAndGreenspots();
		}, null, context.subscriptions);

		let disposable = vscode.languages.registerHoverProvider({language: 'java', scheme: 'file'},{
			provideHover(document, position, token) {
				//Standardwerte bei Hover
				let hoverTriggered = false;
				let hoverLanguage = "";
				let hoverText = "";


				const wordRange = document.getWordRangeAtPosition(position, /\w[\w]*/g);


				queryFunctionNames(document, definedFunctions, wordRange, (definedFunction: any) => {
					hoverTriggered = true;
					hoverText = "Function: " + definedFunction.name + 
								"\nCustomConfig" +
								"\nRuntime: " + definedFunction.runtime.toFixed(2) + " ms" +
								"\nEnergy: " + definedFunction.energy.toFixed(2) + " mWs";

					let isInArray = false;
					for(const hotspot of currentHotspotRuntime){
						if(hotspot.name === definedFunction.name){
							const runtimeChange = (definedFunction.runtime - hotspot.oldRuntime);
							const energyChange = (definedFunction.energy - hotspot.oldEnergy);
							
							hoverText = "Function: " + definedFunction.name + 
										"\nDefaultConfig" +
										"\nRuntime: " + (definedFunction.runtime - runtimeChange).toFixed(2) + " ms" +
										"\nEnergy: " + (definedFunction.energy - energyChange).toFixed(2) + " mWs" + 
										"\nCustomConfig" +
										"\nRuntime: " + definedFunction.runtime.toFixed(2) + " ms" +
										"\nEnergy: " + definedFunction.energy.toFixed(2) + " mWs" + 
										"\nValueChange" +
										"\nRuntimeChange: " + (runtimeChange > 0 ? '+' : '') + runtimeChange.toFixed(2) + " ms" +
										"\nEnergyChange: " + (energyChange > 0 ? '+' : '') + energyChange.toFixed(2) + " mWs";

							isInArray = true;
						}
					}
				});

				if(hoverTriggered){
					return new vscode.Hover({
						language: hoverLanguage,
						value: hoverText
					});
				}
			}
		});
		currentHoverProvider = disposable;
		context.subscriptions.push(disposable);
	}).catch((error) => {
		console.log(error.response);
	});
}


function highlightHotAndGreenspots(){

	const activeEditor = vscode.window.activeTextEditor;
	if(!activeEditor)
		{return;}
	

	if(currentHotspotType === "runtime"){
		const hotspots: vscode.DecorationOptions[] | undefined = highlightSpots(currentHotspotRuntime, currentHotspotCount);
		if(hotspots !== undefined){
			activeEditor.setDecorations(hotspotsDecoration, hotspots);
		}
		const greenspots: vscode.DecorationOptions[] | undefined = highlightSpots(currentGreenspotRuntime, currentHotspotCount);
		if(greenspots !== undefined){
			activeEditor.setDecorations(greenspotDecoration, greenspots);
		}
	}else if(currentHotspotType === "energy"){
		const hotspots: vscode.DecorationOptions[] | undefined = highlightSpots(currentHotspotEnergy, currentHotspotCount);
		if(hotspots !== undefined){
			activeEditor.setDecorations(hotspotsDecoration, hotspots);
		}
		const greenspots: vscode.DecorationOptions[] | undefined = highlightSpots(currentGreenspotEnergy, currentHotspotCount);
		if(greenspots !== undefined){
			activeEditor.setDecorations(greenspotDecoration, greenspots);
		}
	}
}


function highlightSpots(funktionsnamen: any, count: number)
{
	const activeEditor = vscode.window.activeTextEditor;
	if(!activeEditor)
		{return;}

	const regex = /\w+/g;
	const text = activeEditor.document.getText();
	const hotspots: vscode.DecorationOptions[] = [];

	let match: any;
	while ((match = regex.exec(text))) {

		const startPos = activeEditor.document.positionAt(match.index);
		const endPos = activeEditor.document.positionAt(match.index + match[0].length);
		let decoration = { range: new vscode.Range(startPos, endPos) };

		const wordRange = activeEditor.document.getWordRangeAtPosition(startPos, /\w+/g);

		queryFunctionNames(activeEditor.document, funktionsnamen.slice(0,count), wordRange, (definedFunction: any) => {
			hotspots.push(decoration);
		});

	}

	return hotspots;
}



function queryFunctionNames(document: vscode.TextDocument, definedFunctions: any, wordRange: vscode.Range | undefined, callback: Function){
	let suffixText = "";
	let prefixText = "";

	if(wordRange){
		prefixText = document.getText(new vscode.Range(new vscode.Position(0,0), wordRange.start));
		suffixText = document.getText(new vscode.Range(wordRange.end, new vscode.Position(document.lineCount - 1, Math.max(document.lineAt(document.lineCount - 1).text.length - 1, 0))));
	}
	//Das Wort über welches gerade gehovered wird
	const word = document.getText(wordRange);

	//Speichere am Ende die Subclass, die am nächsten dran ist
	let highestSubClassIndex = -1;

	//Gehe durch alle Methodennamen
	definedFunctions.forEach((definedFunction: any) => {

			let functionDef = definedFunction.name;
			let isFunctionParameterCountSet = false;
			let functionParameterCount = 0;

			//Anzahl der Parameter erhalten und Klammern entfernen
			if(definedFunction.name.indexOf('(') > -1){
				isFunctionParameterCountSet = true;
				let functionDefParts = definedFunction.name.split('(');
				functionDef = functionDefParts[0];
				functionParameterCount = (functionDefParts[1].match(/,/g) || []).length;
			}

			//In Pfad aufspalten und Namen erhalten
			let functionComponents = functionDef.split('.');
			let functionName = functionComponents[functionComponents.length - 1];


			let documentPath = document.uri.toString().replace(".java","").split('/');


			let isSubClass = false;
			let subClassName = "";
			let isInSubclass = false;
			let subClassIndex = -1;
			//Sonderfall Subclass
			if(functionComponents[functionComponents.length - 2].indexOf('$') > -1){
				let tempSubClassParts = functionComponents[functionComponents.length - 2].split('$');
				isSubClass = true;
				functionComponents[functionComponents.length - 2] = tempSubClassParts[0];
				subClassName = tempSubClassParts[1];

				subClassIndex = prefixText.search(new RegExp("(static[\\s]*class[\\s]*" + subClassName + ")", "g"));

				if(subClassIndex > -1){
					let subClassPrefixBody = prefixText.slice(subClassIndex);

					//Zähle die geschweiften Klammern und schaue ob sie ungerade sind => Man befindet sich in Subclass
					if((subClassPrefixBody.match(/[\{\}]/g) || []).length % 2 !== 0){
						isInSubclass = true;
					}
				}
			}

			let suffixRegex : RegExp = /^\(.*\)[^\;\}\(]*{/;
			let prefixRegex : RegExp = /\s$/;
			
			//Sonderfall Static Konstruktor
			if(functionName === "<clinit>"){
				prefixRegex = /class[^\;\}\(\{\)]*$/;
				suffixRegex = /^[\s]*{/;
			}

			//Sonderfall Konstruktor
			if(functionName === "<init>" || functionName === "<clinit>"){
				documentPath.pop();
				functionComponents.pop();
				if(isInSubclass){
					functionName = subClassName;
				}else{
					functionName = functionComponents[functionComponents.length - 1];
				}
			}

			//Checke ob mit Leerzeichen beginnt und Klammern folgen
			if((suffixText.match(suffixRegex) !== null) && (prefixText.match(prefixRegex) !== null)){

				//Teste ob entgültiger Funktionsname mit Wort übereinstimmt
				if (functionName === word) {
					let pathMatches = true;

					//Teste ob Pfad übereinstimmt
					for(let i = 1; i < functionComponents.length; i++){
						if(functionComponents[functionComponents.length - 1 - i] !== documentPath[documentPath.length - i]){
							pathMatches = false;
							break;
						}
					}

					if(pathMatches){
						//Anzahl der Parameter der Hoverfunktion erhalten
						let suffixParts = suffixText.split(')');
						let suffixParameterCount = (suffixParts[0].match(/,/g) || []).length;

						//Teste ob Parameteranzahl mitgegeben ist und wenn ja, ob sie passt
						if(!isFunctionParameterCountSet || suffixParameterCount === functionParameterCount){
							//Sonderbehandlung für Subclasses
							if((!isSubClass || isInSubclass) && subClassIndex >= highestSubClassIndex){
								highestSubClassIndex = subClassIndex;
								callback(definedFunction);
								return;
							}
						}
					}
				}
			}
	});
}