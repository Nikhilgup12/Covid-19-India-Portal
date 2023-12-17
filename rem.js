const express = require('express')
const app = express()
const path = require('path')
const dbpath = path.join(__dirname, 'covid19India.db')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
app.use(express.json())
let db = null
const initialize = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is start !')
    })
  } catch (e) {
    console.log(`Error message:${e.message}`)
    process.exit(1)
  }
}
initialize()

const convert = data => {
  return {
    stateId: data.state_id,
    stateName: data.state_name,
    population: data.population,
  }
}

app.get('/states/', async (request, response) => {
  const getStatesQuery = `select * from state`
  const state = await db.all(getStatesQuery)
  response.send(convert(state))
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getStatesQuery = `select * from state where state_id = ${stateId}`
  const state = await db.get(getStatesQuery)
  response.send(convert(state))
})

app.post('/districts/', async (request, response) => {
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const postQuery = `insert into district (district_name,state_id,cases, cured, active, deaths)
    values(
        '${districtName}',
        '${stateId}',
        '${cases}',
        '${cured}',
        '${active}',
        '${deaths}'
    );`
  await db.run(postQuery)
  response.send('District Successfully Added')
})

const converDistrict = data => {
  return {
    districtId: data.district_id,
    districtName: data.district_name,
    stateId: data.state_id,
    cases: data.cases,
    cured: data.cured,
    active: data.active,
    deaths: data.deaths,
  }
}

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictQuery = `select * from district where district_id = ${districtId}`
  const district = await db.get(getDistrictQuery)
  response.send(converDistrict(district))
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteQuery = `delete from district where district_id = ${districtId}`
  await db.run(deleteQuery)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const updateDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = updateDetails
  const updateQuery = `update district 
    set district_name = '${districtName}',
        state_id = '${stateId}',
        cases = '${cases}',
        cured = '${cured}',
        active = '${active}',
        deaths = '${deaths}'
        where district_id = ${districtId};
    `
  await db.run(updateQuery)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStatesQuery = `select sum(cases) as totalCases, 
                                   sum(cured) as totalCured,
                                   sum(active) as totalActive,
                                   sum(deaths) as totalDeaths
                            from district where state_id = ${stateId};`
  const state = await db.get(getStatesQuery)
  response.send(state)
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictIdQuery = `
    select state_id from district
    where district_id = ${districtId};
    ` //With this we will get the state_id using district table
  const getDistrictIdQueryResponse = await database.get(getDistrictIdQuery)
  const getStateNameQuery = `
    select state_name as stateName from state
    where state_id = ${getDistrictIdQueryResponse.state_id};
    ` //With this we will get state_name as stateName using the state_id
  const getStateNameQueryResponse = await db.get(getStateNameQuery)
  response.send(getStateNameQueryResponse)
}) //sendi

module.exports = app
