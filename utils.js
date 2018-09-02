const bs58check = require('bs58check')

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
  }
}