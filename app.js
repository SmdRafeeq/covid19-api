const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
const dbPath = path.join(__dirname, "covid19India.db");

app.use(express.json());

let db = null;

const dbConnection = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server started at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`Database error is ${error.message}`);
    process.exit(1);
  }
};

dbConnection();

// STATE OBJ CONVERT INTO JSON

const convertStateObj = (obj) => {
  return {
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population,
  };
};

// 1. GET ALL STATES API

app.get("/states/", async (request, response) => {
  const getStatesQuery = `select * from state order by state_id;`;

  const statesArray = await db.all(getStatesQuery);
  response.send(statesArray.map((eachState) => convertStateObj(eachState)));
});

// 2. GET API

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const addQuery = `select * from state where state_id = ${stateId}`;
  const stateArray = await db.get(addQuery);
  const result = convertStateObj(stateArray);
  response.send(result);
});

// DISTRICT OBJ

const districtObj = (obj) => {
  return {
    districtId: obj.district_id,
    districtName: obj.district_name,
    stateId: obj.state_id,
    cases: obj.cases,
    cured: obj.cured,
    active: obj.active,
    deaths: obj.deaths,
  };
};

// 3. DISTRICT POST API

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const addDistrictPostQuery = `insert into district (district_name, state_id, cases,cured, active, deaths) 
        values ("${districtName}",${stateId},${cases},${cured},${active},${deaths});`;

  const districtArray = await db.run(addDistrictPostQuery);
  const districtId = districtArray.lastId;
  response.send("District Successfully Added");
});

// 4. GET DISTRICT ID API

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const query = `select * from district where district_id = ${districtId}`;

  const result = await db.get(query);
  response.send(districtObj(result));
});

// 5. DELETE DISTRICT API

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;

  const deleteQuery = `delete from district where district_id = ${districtId};`;
  await db.run(deleteQuery);
  response.send("District Removed");
});

// 6. PUT DISTRICT API

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const updateQuery = `update district set
        district_name = "${districtName}",
        state_id = ${stateId},
        cases = ${cases},
        cured = ${cured},
        active = ${active},
        deaths = ${deaths} where district_id = ${districtId};
    `;
  await db.run(updateQuery);
  response.send("District Details Updated");
});

// 7. GET STATE API

const reportStateObj = (obj) => {
  return {
    totalCases: obj.cases,
    totalCured: obj.cured,
    totalActive: obj.active,
    totalDeaths: obj.deaths,
  };
};

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;

  const getStateReport = `select sum(cases) as cases,
                                 sum(cured) as cured,
                                 sum(active) as active,
                                 sum(deaths) as deaths
                        from district where state_id = ${stateId}`;
  const res = await db.get(getStateReport);
  response.send(reportStateObj(res));
});

// 8. GET API

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getQuery = `select state_name from state JOIN district ON
        district.state_id = state.state_id where district.district_id = ${districtId}`;
  const result = await db.get(getQuery);

  response.send({ stateName: result.state_name });
});

module.exports = app;
