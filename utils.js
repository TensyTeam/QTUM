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
  }
}