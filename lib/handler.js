const { LOAD_MESSAGE_TYPE, ERROR_MESSAGE_TYPE, CLOSE_MESSAGE_TYPE, ABORT_MESSAGE_TYPE, TIMEOUT_MESSAGE_TYPE } = require('./consts')

class Handler {
    async onConnect(port) {
        this.port = port

        if (this.handleConnect) {
            try {
                await this.handleConnect()
            }
            catch (e) {
                await this.emitRuntimeError(e)
            }
        }
    }

    async onDisconnect() {
        this.port = null

        if (this.handleDisconnect) {
            try {
                await this.handleDisconnect()
            }
            catch (e) {
                await this.emitRuntimeError(e)
            }
        }
    }

    async postMessage(message) {
        if (!this.port) {
            console.error(new Error(`Attempted to send message on closed port`))

            return
        }

        await this.port.postMessage(message)
    }

    async onMessage(message) {
        try {
            await this.handleMessage(message)
        }
        catch (e) {
            await this.emitRuntimeError(e)
        }
    }

    async emitLoad(payload) {
        await this.postMessage({ type: LOAD_MESSAGE_TYPE, payload })
    }

    async emitError(payload) {
        await this.postMessage({ type: ERROR_MESSAGE_TYPE, payload })
    }

    async emitClose(payload) {
        await this.postMessage({ type: CLOSE_MESSAGE_TYPE, payload })
    }

    async emitAbort(payload) {
        await this.postMessage({ type: ABORT_MESSAGE_TYPE, payload })
    }

    async emitTimeout(payload) {
        await this.postMessage({ type: TIMEOUT_MESSAGE_TYPE, payload })
    }

    async emitRuntimeError(error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Runtime Error:', error)
        }

        switch (error.code) {
            case ERROR_MESSAGE_TYPE:
                await this.emitError(error)

                return

            case CLOSE_MESSAGE_TYPE:
                await this.emitClose(error)

                return

            case ABORT_MESSAGE_TYPE:
                await this.emitAbort(error)

                return

            case TIMEOUT_MESSAGE_TYPE:
                await this.emitTimeout(error)

                return

            default:
                await this.emitError(error)

                return
        }
    }
}

module.exports = { Handler }
