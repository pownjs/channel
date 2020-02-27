const { ERROR_MESSAGE_TYPE, ABORT_MESSAGE_TYPE, TIMEOUT_MESSAGE_TYPE, CLOSE_MESSAGE_TYPE } = require('./consts')

const mke = (error) => {
    if (error instanceof Object) {
        return error
    }
    else {
        return new Error(error)
    }
}

const makeError = (error) => {
    error = mke(error)

    error.code = ERROR_MESSAGE_TYPE

    return error
}

const makeAbortError = (error) => {
    error = mke(error)

    error.code = ABORT_MESSAGE_TYPE

    return error
}

const makeTimeoutError = (error) => {
    error = mke(error)

    error.code = TIMEOUT_MESSAGE_TYPE

    return error
}

const makeCloseError = (error) => {
    error = mke(error)

    error.code = CLOSE_MESSAGE_TYPE

    return error
}

module.exports = { makeError, makeAbortError, makeTimeoutError, makeCloseError }
