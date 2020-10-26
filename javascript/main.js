// interface
    // client
        // connect()
        // call()
        // todo: middleware (auth)
    // server setup
        // manuallyAdd()
        // importFolder()
        // startOnPort(options)
        // todo: middleware
        // todo: mby add to express server
        // todo: error handling control
// implementation
    // create express server
        // listen for setup request
            // respond with id
        // listen for function call
        // setup the `this` with auth data
        // call middleware
        // wrap error handling
    // create the client side api
        // request setup immediately
            // save id
            // build API object with response
            // build API with middleware
            // build-in error re-throwing middleware

module.exports = {
    connect(url, authData) {
        
    }
}