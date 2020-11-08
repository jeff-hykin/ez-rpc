const EzRpcServer = require("../javascript/backend")

new EzRpcServer({
    port: 4321,
    startImmediately: true,
    interface: {
        hello: ()=>"Hello!"
    },
})
