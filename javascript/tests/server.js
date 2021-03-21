const EzRpcServer = require("../backend/backend.js")

new EzRpcServer({
    port: 4321,
    startImmediately: true,
    interface: {
        hello: ()=>"Hello!"
    },
})
