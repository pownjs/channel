/* global chrome, Window, Worker, BroadcastChannel */

const oneTime = require('onetime')

class ChannelHandler {
    onConnect() {}

    onDisconnect() {}

    onMessage() {}
}

class ChromeRuntimeChannel {
    constructor(runtime) {
        this.runtime = runtime || chrome.runtime
    }

    makePort(port, server, messageHander, disconnectHandler) {
        port.onMessage.addListener(messageHander)
        port.onDisconnect.addListener(disconnectHandler)

        return new class {
            get isServer() {
                return server
            }

            get isClient() {
                return !server
            }

            postMessage(message) {
                port.postMessage(message)
            }

            disconnect() {
                port.disconnect()

                disconnectHandler()
            }
        }
    }

    listen(name, Handler, ...params) {
        this.runtime.onConnect.addListener((port) => {
            if (port.name !== name) {
                return
            }

            const handler = new Handler(...params)

            const messageHander = (message) => {
                handler.onMessage(message)
            }

            const disconnectHandler = oneTime(() => {
                handler.onDisconnect()
            })

            handler.onConnect(this.makePort(port, true, messageHander, disconnectHandler))
        })
    }

    connect(name, Handler, ...params) {
        const port = this.runtime.connect({ name })

        const handler = new Handler(...params)

        const messageHander = (message) => {
            handler.onMessage(message)
        }

        const disconnectHandler = oneTime(() => {
            handler.onDisconnect()
        })

        handler.onConnect(this.makePort(port, false, messageHander, disconnectHandler))
    }

    disconnect() {
        // TODO: add code here
    }
}

class GenericChannel {
    static messageType = 'message(45b409ba-788d-4f5c-87ff-14c3c2836ee6)';
    static connectType = 'connect(3fad0d6b-ae8c-43f0-99d8-3c1b6d6c013e)';
    static disconnectType = 'disconnect(b9c899b2-ed95-4b36-af46-c907fbc54026)';

    constructor(runtime) {
        this.windowPostMessage = this.windowPostMessage.bind(this)
        this.workerPostMessage = this.workerPostMessage.bind(this)
        this.broadcastChannelPostMessage = this.broadcastChannelPostMessage.bind(this)
        this.genericPostMessage = this.genericPostMessage.bind(this)
        this.windowEventValidator = this.windowEventValidator.bind(this)
        this.workerEventValidator = this.workerEventValidator.bind(this)
        this.broadcastChannelEventValidator = this.broadcastChannelEventValidator.bind(this)
        this.genericEventValidator = this.genericEventValidator.bind(this)
        this.runtimeAddEventListener = this.runtimeAddEventListener.bind(this)
        this.runtimeRemoveEventListener = this.runtimeRemoveEventListener.bind(this)
        this.handleMessage = this.handleMessage.bind(this)
        this.handleDisconnect = this.handleDisconnect.bind(this)
        this.makePort = this.makePort.bind(this)
        this.listen = this.listen.bind(this)
        this.connect = this.connect.bind(this)
        this.disconnect = this.disconnect.bind(this)

        this.runtime = runtime

        if (typeof(Window) !== 'undefined' && this.runtime instanceof Window) {
            if (process.env.NODE_ENV !== 'production') {
                console.info(`Using Window runtime`) /* eslint-disable-line no-console */
            }

            this.runtimePostMessage = this.windowPostMessage
            this.runtimeEventValidator = this.windowEventValidator
        }
        else
        if (typeof(Worker) !== 'undefined' && this.runtime instanceof Worker) {
            if (process.env.NODE_ENV !== 'production') {
                console.info(`Using Worker runtime`) /* eslint-disable-line no-console */
            }

            this.runtimePostMessage = this.workerPostMessage
            this.runtimeEventValidator = this.workerEventValidator
        }
        else
        if (typeof(BroadcastChannel) !== 'undefined' && this.runtime instanceof BroadcastChannel) {
            if (process.env.NODE_ENV !== 'production') {
                console.info(`Using BroadcastChannel runtime`) /* eslint-disable-line no-console */
            }

            this.runtimePostMessage = this.broadcastChannelPostMessage
            this.runtimeEventValidator = this.broadcastChannelEventValidator
        }
        else {
            this.runtimePostMessage = this.genericPostMessage
            this.runtimeEventValidator = this.genericEventValidator
        }

        this.messageHandlersHash = {}
        this.disconnectHandlersHash = {}
    }

    windowPostMessage(message) {
        this.runtime.postMessage(message, this.runtime.location.origin)
    }

    workerPostMessage(message) {
        this.runtime.postMessage(message)
    }

    broadcastChannelPostMessage(message) {
        this.runtime.postMessage(message)
    }

    genericPostMessage(message) {
        this.runtime.postMessage(message)
    }

    windowEventValidator(event) {
        return event.source === this.runtime
    }

    workerEventValidator() {
        return true
    }

    broadcastChannelEventValidator() {
        return true
    }

    genericEventValidator() {
        return true
    }

    runtimeAddEventListener(...args) {
        this.runtime.addEventListener(...args)
    }

    runtimeRemoveEventListener(...args) {
        this.runtime.removeEventListener(...args)
    }

    makeId() {
        return `${Date.now()}-${Math.random().toString(32).substring(2)}`
    }

    handleMessage(port, id, messageHander, event) {
        if (!this.runtimeEventValidator(event)) {
            return
        }

        const { messageType } = this.constructor

        const { data } = event

        if (data.type !== messageType) {
            return
        }

        if (data.port !== port) {
            return
        }

        if (data.id === id) {
            return
        }

        event.stopPropagation()

        messageHander(data.message)
    }

    handleDisconnect(port, id, disconnectHandler, event) {
        if (!this.runtimeEventValidator(event)) {
            return
        }

        const { disconnectType } = this.constructor

        const { data } = event

        if (data.type !== disconnectType) {
            return
        }

        if (data.port !== port) {
            return
        }

        if (data.id === id) {
            return
        }

        event.stopPropagation()

        disconnectHandler()
    }

    makePort(port, id, server, messageHander, disconnectHandler) {
        const { messageType, disconnectType } = this.constructor

        const cleanup = () => {
            this.runtimeRemoveEventListener('message', this.messageHandlersHash[port])
            this.runtimeRemoveEventListener('message', this.disconnectHandlersHash[port])

            delete this.messageHandlersHash[port]
            delete this.disconnectHandlersHash[port]
        }

        disconnectHandler = ((disconnectHandler) => {
            return () => {
                cleanup()

                disconnectHandler()
            }
        })(disconnectHandler)

        const setup = () => {
            this.messageHandlersHash[port] = this.handleMessage.bind(this, port, id, messageHander)
            this.disconnectHandlersHash[port] = this.handleDisconnect.bind(this, port, id, disconnectHandler)

            this.runtimeAddEventListener('message', this.messageHandlersHash[port])
            this.runtimeAddEventListener('message', this.disconnectHandlersHash[port])
        }

        setup()

        const { runtimePostMessage } = this

        return new class {
            get isServer() {
                return server
            }

            get isClient() {
                return !server
            }

            postMessage(message) {
                runtimePostMessage({ type: messageType, port, id, message })
            }

            disconnect() {
                cleanup()

                runtimePostMessage({ type: disconnectType, port, id })

                disconnectHandler()
            }
        }
    }

    listen(name, Handler, ...params) {
        const { connectType } = this.constructor

        this.runtimeAddEventListener('message', (event) => {
            if (!this.runtimeEventValidator(event)) {
                return
            }

            const { data } = event

            if (data.type !== connectType) {
                return
            }

            if (data.name !== name) {
                return
            }

            event.stopPropagation()

            const handler = new Handler(...params)

            const messageHander = (message) => {
                handler.onMessage(message)
            }

            const disconnectHandler = oneTime(() => {
                handler.onDisconnect()
            })

            handler.onConnect(this.makePort(data.port, this.makeId(), true, messageHander, disconnectHandler))
        })
    }

    connect(name, Handler, ...params) {
        const { connectType } = this.constructor

        const port = this.makeId()

        this.runtimePostMessage({ type: connectType, name, port })

        const handler = new Handler(...params)

        const messageHander = (message) => {
            handler.onMessage(message)
        }

        const disconnectHandler = oneTime(() => {
            handler.onDisconnect()
        })

        handler.onConnect(this.makePort(port, this.makeId(), false, messageHander, disconnectHandler))
    }

    disconnect() {
        // TODO: add code here
    }
}

class ChannelProxy {
    constructor(firstRuntime, secondRuntime) {
        this.firstRuntime = firstRuntime
        this.secondRuntime = secondRuntime
    }

    listen(type) {
        const { firstRuntime, secondRuntime } = this

        firstRuntime.listen(type, class {
            onConnect(firstPort) {
                const self = this

                self.firstPort = firstPort

                secondRuntime.connect(type, class {
                    onConnect(secondPort) {
                        self.secondPort = secondPort
                    }

                    onDisconnect() {
                        self.firstPort.disconnect()
                    }

                    onMessage(message) {
                        self.firstPort.postMessage(message)
                    }
                })
            }

            onDisconnect() {
                this.secondPort.disconnect()
            }

            onMessage(message) {
                this.secondPort.postMessage(message)
            }
        })
    }

    disconnect() {
        this.firstRuntime.disconnect()
        this.secondRuntime.disconnect()
    }
}

module.exports = { ChannelProxy, GenericChannel, ChromeRuntimeChannel, ChannelHandler }
