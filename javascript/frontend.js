let { network, object } = require("good-js")

let apiCall = async (methodName, args=[], metaData)=> {
    let response = await network.postJson({
        data: [args, metaData],
        to: `${databaseUrl}/call/${methodName}`
    })
    if (response.error instanceof Object) {
        throw response.error
    }
    return response.value
} 

module.exports = {
    metaKey: Symbol.for("EzRpcMetadata"),
    buildInterfaceFor(url) {
        let actualEndpoints = {
            [module.exports.metaKey]: {}
        }
        
        return new Promise(async (resolve, reject)=>{
            var { interface } = await network.postJson({ data: [], to: `${url}/interface`})
            
            // create all the endpoints
            for (let eachKeyList of object.recursivelyAllAttributesOf(interface)) {
                const endpointString = eachKeyList.join("/")
                object.set({
                    keyList: eachKeyList,
                    on: actualEndpoints,
                    to: (...args)=>apiCall(endpointString, args, actualEndpoints[module.exports.metaKey])
                })
            }

            return actualEndpoints
        })
    }
}