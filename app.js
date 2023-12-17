const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dbpath = path.join(__dirname, 'covid19IndiaPortal.db')
const app = express()
app.use(express.json())
let db = null
const initalize = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is start!!')
    })
  } catch (e) {
    console.log(`Error message ${e.message}`)
    process.exit(1)
  }
}
initalize()

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const userQuery = `select * from user where username = '${username}';`
  const dbuser = await db.get(userQuery)
  if (dbuser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isValidPassword = bcrypt.compare(password, dbuser.password)
    if (isValidPassword === true) {
      const payload = {username: username}
      const jwtToken = await jwt.sign(payload, 'MY_Secret_Key')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

const AuthenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_Secret_Key', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

const convert = data => {
  return {
    stateId: data.state_id,
    stateName: data.state_name,
    population: data.population,
  }
}

app.get('/states/', AuthenticateToken, async (request, response) => {
  const getStatesQuery = `select * from state`
  const state = await db.all(getStatesQuery)
  response.send(convert(state))
})

app.get('/states/:stateId/', AuthenticateToken, async (request, response) => {
  const {stateId} = request.params
  const getStatesQuery = `select * from state where state_id = ${stateId}`
  const state = await db.get(getStatesQuery)
  response.send(convert(state))
})

app.post('/districts/', AuthenticateToken, async (request, response) => {
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

app.get(
  '/districts/:districtId/',
  AuthenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const getDistrictQuery = `select * from district where district_id = ${districtId}`
    const district = await db.get(getDistrictQuery)
    response.send(converDistrict(district))
  },
)

app.delete(
  '/districts/:districtId/',
  AuthenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const deleteQuery = `delete from district where district_id = ${districtId}`
    await db.run(deleteQuery)
    response.send('District Removed')
  },
)

app.put(
  '/districts/:districtId/',
  AuthenticateToken,
  async (request, response) => {
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
  },
)

app.get(
  '/states/:stateId/stats/',
  AuthenticateToken,
  async (request, response) => {
    const {stateId} = request.params
    const getStatesQuery = `select sum(cases) as totalCases, 
                                   sum(cured) as totalCured,
                                   sum(active) as totalActive,
                                   sum(deaths) as totalDeaths
                            from district where state_id = ${stateId};`
    const state = await db.get(getStatesQuery)
    response.send(state)
  },
)
