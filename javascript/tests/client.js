const { buildInterfaceFor } = require("../frontend/frontend")

buildInterfaceFor("http://localhost:4321").then(testBackend=>(global.testBackend = testBackend))



