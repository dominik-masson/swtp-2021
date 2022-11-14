const request = require("supertest");
const app = require("../app.js");

// Tests for getMethodParameters

test('correct parameters in getMethodParameters send result', function(done) {
    request(app)
    .post('/getMethodParameters')
    .send({
        config: [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], 
        oldConfig: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], 
        greenidePackage: 'kanzi'
    })
    .then(response => {
        expect(response.statusCode).toBe(200);
        expect(response._body.methods.length).toBe(256);
        expect(response._body.hotspotRuntime.length).toBe(256);
        expect(response._body.hotspotEnergy.length).toBe(256);
        done();
    });
});

test('wrong parameters in getMethodParameters send error', function(done) {
    request(app)
    .post('/getMethodParameters')
    .send({config: [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]})
    .then(response => {
        expect(response.statusCode).toBe(500);
        done();
    });
});

test('equal configs should return empty hotspot arrays', function(done) {
    request(app)
    .post('/getMethodParameters')
    .send({
        config: [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], 
        oldConfig: [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], 
        greenidePackage: 'kanzi'
    })
    .then(response => {
        expect(response.statusCode).toBe(200);
        expect(response._body.methods.length).toBe(256);
        expect(response._body.hotspotRuntime.length).toBe(0);
        expect(response._body.hotspotEnergy.length).toBe(0);
        done();
    });
});

// Tests for getParameters

test('wrong parameters in getParameters send error', function(done) {
    request(app)
    .post('/getParameters')
    .send({wrongData: 'wrongData'})
    .then(response => {
        expect(response.statusCode).toBe(500);
        done();
    });
});

test('wrong greenIdePackage in getParameters sends error', function(done) {
    request(app)
    .post('/getParameters')
    .send({greenidePackage: 'wrongPackage'})
    .then(response => {
        expect(response.statusCode).toBe(500);
        done();
    });
});

test('correct greenIdePackage in getParameters sends data', function(done) {
    request(app)
    .post('/getParameters')
    .send({greenidePackage: 'kanzi'})
    .then(response => {
        expect(response.statusCode).toBe(200);
        expect(response._body.length).toBe(23);
        done();
    });
});
