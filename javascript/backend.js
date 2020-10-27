const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const { v4: uuidv4 } = require('uuid')
const app = express()

let recursivelyAllAttributesOf = (obj) => {
    // if not an object then add no attributes
    if (!(obj instanceof Object)) {
        return []
    }
    // else check all keys for sub-attributes
    var output = []
    for (let eachKey of Object.keys(obj)) {
        // add the key itself (alone)
        output.push([eachKey])
        // add all of its children
        let newAttributes = recursivelyAllAttributesOf(obj[eachKey])
        // if nested
        for (let eachNewAttributeList of newAttributes) {
            // add the parent key
            eachNewAttributeList.unshift(eachKey)
            output.push(eachNewAttributeList)
        }
    }
    return output
}

/**
 * Safely get nested values
 *
 * @param {any} obj.from - what object/value you're extracting from
 * @param {string[]} obj.keyList - anObject.key1.key2 -> [ "key1", "key2" ]
 * @param {any} obj.failValue - what to return in the event of an error
 * @return {any} either the failValue or the actual value
 *
 * @example
 *     let obj = { key1: {} }
 *     // equivlent to obj.key1.subKey.subSubKey
 *     get({
 *         keyList: [ 'key1', 'subKey', 'subSubKey' ],
 *         from: obj,
 *     })
 *     get({
 *         keyList: [ 'key1', 'subKey', 'subSubKey' ],
 *         from: null,
 *     })
 *     get({
 *         keyList: [ 'key1', 'subKey', 'subSubKey' ],
 *         from: null,
 *         failValue: 0
 *     })
 */
let get = (obj, keyList = undefined, failValue = null) => {
    // process args
    let from
    if (keyList == undefined) {
        ;({ from, keyList, failValue } = obj)
        obj = from
    }
    // convert string values into lists
    if (typeof keyList == "string") {
        if (keyList.length == 0) {
            keyList = []
        } else {
            keyList = keyList.split(".")
        }
    }
    // iterate over nested values
    try {
        for (var each of keyList) {
            if (obj instanceof Object && each in obj) {
                obj = obj[each]
            } else {
                return failValue
            }
        }
    } catch (error) {
        return failValue
    }
    return obj
}

module.exports = class EzRpcServer {
    /**
     * Backend server setter-upper
     *
     * @param {Object} arg.port - where do you want the server to run
     * @param {Array} [arg.beforeEachCall] - an array of functions (see README examples)
     * @param {Array} [arg.afterEachCall] - an array of functions (see README examples)
     * @param {Object} [arg.interface] - an object of async functions (see README)
     * @return {EzRpcServer}
     *
     * @example
     *     (new EzRpcServer({port: 4321})).start()
     */
    constructor(
        arg = {
            port: 4321,
            beforeEachCall: [],
            afterAllFunctionCalls: [],
            interface: {},
            limit: '50mb',
        }
    ) {
        this.beforeEachCall = arg.beforeEachCall
        this.afterEachCall = arg.afterEachCall
        this.interface = arg.interface
        this.port = arg.port
        this.app = express()
        this.app.use(cors())
        this.app.use(bodyParser.json({limit, extended: true}))
    }

    async start() {
        // create the interface endpoint (which is needed by the client)
        this.app.post(`interface`, (req, res) => {
            let data = req.body
            // tell the requester how the API is laid out
            res.send({ "interface": this.interface, info: { uuid: uuidv4() } })
            // FUTURE: maybe include setup options
            // FUTURE: maybe include documentation for functions
        })

        let callWrapper = (endpoint, endpointFunction, req, res) => {
            let error
            try {
                var [ args, metadata ] = req.body
                // process the incoming data
                for (let eachMiddlewareFunction of this.beforeEachCall) {
                    await eachMiddlewareFunction({metadata, endpoint, endpointFunction, args, req, res})
                }
                // execute the call 
                let output = theFunction(args)
                if (output instanceof Promise) {
                    output = await output
                }
            } catch (err) {
                error = err
            }

            try {
                for (let eachMiddlewareFunction of this.afterEachCall) {
                    await eachMiddlewareFunction({ output, error, metadata, endpoint, endpointFunction, args, req, res})
                }
                if (error) {
                    // tell the requester there was an error
                    res.send({
                        error: {
                            endpoint: endpoint.join(".")+"()",
                            arguments: args,
                            stack: error.stack,
                            message: error.message,
                            name: error.name,
                            ...error,
                        },
                    })
                } else {
                    res.send({ value: output })
                }
            // backup error catching system (don't just leave requester waiting on a request-timeout)
            } catch (err) {
                console.error(err)
                res.send({
                    error: {
                        endpoint: endpoint.join(".")+"()",
                        arguments: args,
                        stack: null,
                        message: "There was a problem on the server. The usual error reporting system failed (this is the backup system). Please report whatever error details are available to the owner of the web service.",
                    },
                })
            }
        }

        // create the other endpoints
        for (let endpoint of recursivelyAllAttributesOf(this.interface)) {
            // 
            // validate endpoint name
            // 
            let badEndpointName = false
            for (let eachName of endpoint) {
                if (!eachName.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/)){
                    console.warn(`The endpoint '${endpoint.join('/')}' will be ignored. This is because '${eachName}' contains charaters other than the [a-zA-Z_][a-zA-Z_0-9] requirement.`)
                    badEndpointName = true
                    break
                }
            }
            if (badEndpointName) {
                continue
            }
            
            // 
            // setup endpoint
            // 
            let endpointFunction = get(endpoint, this.interface)
            if (endpointFunction instanceof Function) {
                // create an endpoint
                this.app.post(`call/${endpoint.join("/")}`, (req, res) => callWrapper(endpoint, endpointFunction, req, res))
            }
        }

        return new Promise(resolve=>this.app.listen(this.port, resolve))
    }
}