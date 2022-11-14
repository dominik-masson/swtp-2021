import_csv_reader = require('../csv_reader_function');

// Tests for readConfigParameters

test("readConfigParameters rejects with wrong file name", () => {
    expect(import_csv_reader.readConfigParameters("./someinvalidfilepath.csv")).rejects.toMatch('Something went wrong with reading the csv');
});
test('valid filename returns correct parameter length', async () => {
    let data = await import_csv_reader.readConfigParameters("./models/kanzi.csv");
    expect(data.length).toBe(23);
});

// Tests for readCSV

test('readCSV rejects with wrong file name', () => {
    return expect(import_csv_reader.readCSV("./someinvalidfilepath.csv")).rejects.toMatch('Something went wrong with reading the csv');
});
test('valid filename returns correct line length', async () => {
    let data = await import_csv_reader.readCSV("./models/kanzi.csv");
    expect(data.split("\n").length).toBe(12344);
});

// Tests for ReadAndCalcParameters

test('correct values for calc parameters', () => {
    let dummyConfig = [1,0,1,1]

    let dummyCSV = `"method_name","root","BLOCKSIZE","JOBS","LEVEL","run_time(ms;<)","energy(mWs;<)"\n"function1",1,0,0,0,2,2\n"function1",0,1,0,0,2,2\n"function1",0,0,1,0,2,2\n"function1",0,0,0,1,2,2\n"function1",0,0,1,1,2,2\n"function1",1,0,1,0,2,2\n"function1",1,1,1,1,2,2\n"function2",1,0,0,0,3,3\n"function2",0,1,0,0,3,3\n"function2",0,1,1,0,3,3\n"function2",1,0,1,0,3,3\n"function3",0,0,1,1,3,3\n`

    //Expects [{name: "function1", runtime: 10, energy: 10}, {name: "function2", runtime: 6, energy: 6}]
    calculatedMethods = import_csv_reader.readAndCalcParameters(dummyConfig, dummyCSV);

    expect(calculatedMethods[0].runtime).toBe(10);
    expect(calculatedMethods[1].energy).toBe(6);
});

// Tests for configMatches

test('equal configs should return true', () => {
    return expect(import_csv_reader.configMatches([1,0,1,0],[1,0,1,0])).toBe(true);
})

test('correct config matching should return true', () => {
    expect(import_csv_reader.configMatches([1,0,1,1],[0,0,0,1])).toBe(true);
    expect(import_csv_reader.configMatches([1,0,1,1],[1,0,1,0])).toBe(true);
    expect(import_csv_reader.configMatches([1,1,0,0],[0,1,0,0])).toBe(true);
})

test('wrong config matching should return false', () => {
    expect(import_csv_reader.configMatches([1,0,1,1],[1,1,0,0])).toBe(false);
    expect(import_csv_reader.configMatches([1,0,1,1],[1,1,1,1])).toBe(false);
    expect(import_csv_reader.configMatches([1,1,0,0],[0,0,1,1])).toBe(false);
})

test('different config lengths should return false', () => {
    expect(import_csv_reader.configMatches([1,1,1,1],[1,1,1,1,1])).toBe(false);
    expect(import_csv_reader.configMatches([1,1,1,1,1],[1,1,1,1])).toBe(false);
})

// Tests for compareNewOld
test("wrong length for compareNewOld", () => {
    let dummyMethods = [{name: "function1", runtime: 2, energy: 3}, {name: "function2", runtime: -2, energy: 3}];
    let dummyOldMethods = [{name: "function1", runtime: 1, energy: 6}];

    expect(() => {import_csv_reader.compareNewOld(dummyMethods, dummyOldMethods)}).toThrow();
});

test("wrong names in compareNewOld", () => {
    let dummyMethods = [{name: "function1", runtime: 2, energy: 3}, {name: "function2", runtime: -2, energy: 3}];
    let dummyOldMethods = [{name: "function1", runtime: 1, energy: 6}, {name: "function3", runtime: -2, energy: 3}];

    expect(() => {import_csv_reader.compareNewOld(dummyMethods, dummyOldMethods)}).toThrow();
});

test("correct values for compareNewOld", () => {
    let dummyMethods = [{name: "function1", runtime: 2, energy: 3}, {name: "function2", runtime: -2, energy: 3}, {name: "function3", runtime: 1, energy: 0}];
    let dummyOldMethods = [{name: "function1", runtime: 1, energy: -3}, {name: "function2", runtime: 1, energy: 5}, {name: "function3", runtime: 0, energy: 5}];

    let spotArray = import_csv_reader.compareNewOld(dummyMethods, dummyOldMethods);

    //100% Steigerung bei Function1 Runtime
    expect(spotArray[0].runtimeSpot).toBe(1);
    //200% Verlust bei Function1 Energy
    expect(spotArray[0].energySpot).toBe(2);

    //-300% Verlust bei Function2 Runtime
    expect(spotArray[1].runtimeSpot).toBe(-3);
    //40% Verlust bei Function2 Energy
    expect(spotArray[1].energySpot).toBe(-0.4);

    //0% Steigerung bei Function3 Runtime (Von 0 auf irgendeinen Wert)
    expect(spotArray[2].runtimeSpot).toBe(0);
    //100% Verlust bei Function3 Energy
    expect(spotArray[2].energySpot).toBe(-1);
});