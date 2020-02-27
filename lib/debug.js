const { performance } = require('perf_hooks')

const enumObjectPrototypeMethods = (owner) => {
    const methods = {}

    for (let name of Object.getOwnPropertyNames(Object.getPrototypeOf(owner))) {
        const value = owner[name]

        if (name !== 'constructor' && typeof(value) === 'function') {
            methods[name] = value
        }
    }

    return methods
}

const hookObject = (owner, methods, target, trace) => {
    Object.entries(methods).forEach(([name, value]) => {
        if (typeof(value) === 'function') {
            const loc = `${owner}::${name}`

            console.log(`Hooking ${loc}`) /* eslint-disable-line no-console */

            target[name] = function(...args) {
                const id = performance.now().toString().replace('.', '')

                if (trace) {
                    console.debug('>', loc, id, ...args)
                }

                let result

                try {
                    result = value.call(target, ...args)
                }
                catch (e) {
                    console.error(`Error in ${owner}::${name}`, e)

                    throw e
                }

                if (trace) {
                    if (result instanceof Promise) {
                        setImmediate(async() => {
                            try {
                                console.debug('<', loc, id, await result)
                            }
                            catch (e) {
                                console.error('<', loc, id, e)
                            }
                        })
                    }
                    else {
                        console.debug('<', loc, id, result)
                    }
                }

                return result
            }
        }
    })
}

module.exports = { enumObjectPrototypeMethods, hookObject }
