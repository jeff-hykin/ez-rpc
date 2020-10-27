let { network, object } = require("good-js")

let apiCall = async (url, args=[], metaData)=> {
    let response = await network.postJson({
        data: [args, metaData],
        to: url
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
            let result = await network.postJson({ data: [], to: `${url}/interface`})
            
            // create all the endpoints
            for (let eachKeyList of result.interface) {
                const endpointUrl = `${url}/call/${eachKeyList.join("/")}`
                object.set({
                    keyList: eachKeyList,
                    on: actualEndpoints,
                    to: (...args)=>apiCall(endpointUrl, args, actualEndpoints[module.exports.metaKey])
                })
            }
            
            resolve(actualEndpoints)
        })
    }
}