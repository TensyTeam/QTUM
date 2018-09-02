const bs58check = require('bs58check')
const bigInt = require('big-integer')

module.exports = {
  parseAbi: function(abi) {
    try {
      const abiJson = JSON.parse(abi)
      
      let parsedAbi = []
      for (let i = 0; i < abiJson.length; i++) {
        parsedAbi[i] = { text: abiJson[i]['name'], value: i, info: abiJson[i] }
      }
      return parsedAbi;
    } catch (e) {
      throw new Error(`send_to_contract_decode_abi_error ${e.stack || e.toString() || e}`)
    }
  },
  getIndex: function(parsedAbi, method) {
    const res = parsedAbi.find(({ text }) => method === text)
    if (res === undefined) {
      throw new Error(`get_index_of_method_error: \n ${method} \n ${JSON.stringify(parsedAbi)}`)
    }
    return res.value
  },
  toUint256Address: function(address) {
    const hex = module.exports.tohexaddress(address)
    const nulls = new Array(64).join('0')
    return `${nulls}${hex}`.substr(-64);
  },
  
  uint8arr2hex: function(byteArray) {
    return Array.from(byteArray, function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
  },
  
  hex2uint8arr: function(hex) {
    return new Uint8Array(hex.match(/[\da-f]{2}/gi).map(function (h) {
      return parseInt(h, 16)
    }))
  },
  
  tohexaddress: function(addr) {
    return module.exports.uint8arr2hex(bs58check.decode(addr)).substr(2)
  },
  
  fromhexaddress: function(hex) {
    return bs58check.encode(new Buffer(module.exports.hex2uint8arr('78' + hex)))
  },

  parseCourseStatus: function(hex) {
    const type = parseInt(hex, 16)
    return module.exports.COURSE_STATUS[type]
  },

  parseUint256: function(hex) {
    return bigInt(hex, 16).toString()
  },
  
  parseAddress: function(hex) {
    return module.exports.fromhexaddress(hex.replace(/^0+/, ''))
  },
  
  parseCourse: function(raw) {
    return {
      student: module.exports.parseAddress(raw.substr(0 * 64, 64)),
      author: module.exports.parseAddress(raw.substr(1 * 64, 64)),
      status: module.exports.parseCourseStatus(raw.substr(2 * 64, 64)),
      price: module.exports.parseUint256(raw.substr(3 * 64, 64))
    }
  },

  COURSE_STATUS: {
    0: "IS_OFF",
    1: "STARTING",
    2: "IS_ON"
  }
}

