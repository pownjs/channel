const { BASE64_TYPE } = require('./consts')

const maybeSerializeArrayBuffer = (arrayBuffer) => {
    if (!arrayBuffer) {
        return
    }

    /* chrome sucks */

    return { type: BASE64_TYPE, buffer: Buffer.from(arrayBuffer).toString('base64') }
}

const maybeDeserializeArrayBuffer = (arrayBuffer) => {
    if (!arrayBuffer) {
        return
    }

    /* chrome sucks */

    return Buffer.from(arrayBuffer.buffer, 'base64')
}

const mangle = (input) => {
    return input
}

const unmangle = (input) => {
    return input
}

module.exports = { maybeSerializeArrayBuffer, maybeDeserializeArrayBuffer, mangle, unmangle }
