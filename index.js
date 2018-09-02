const wallet = require('qtumjs-wallet')
const { parseAbi, getIndex } = require('./utils')
const tensegrity = require('./bin/Tensegrity.json')

const BASE_URL = 'http://40.67.212.77:3000'
const CONTRACT_ADDRESS = ''
const config = {
  fee: 0.01,
  gasPrice: 50,
  gasLimit: 3000000
}

function searchlogs(from, to, addresses, topics = []) {
  const url = `${BASE_URL}/searchlogs/${from}/${to}/${addresses.join(',')}/${topics.join(',')}`
  return axios.get(url)
}

//uint price, address student, address author
async function teacher_ready_to_give_lesson(wif, { price, student, author }) {
  if (!price || !student || !author)
    throw `createpost invalid params: ${title}, ${text}, ${category}`
  
  try {
    //uint price, address student, address author
    const decoded = parseAbi(tensegrity.abi)
    const index = getIndex(decoded, 'teacher_ready_to_give_lesson')

    const encodedData = abi.encodeMethod(decoded[index].info, [price, student, author]).substr(2)
    const { gasLimit } = config
    
    const wallet = networks.testnet.fromWIF(wif)
    const signedTx = await wallet.generateContractSendTx(CONTRACT_ADDRESS, encodedData, { gasLimit })
    const { txid } = await wallet.sendRawTx(signedTx)
    
    return txid
  }
  catch (exc) {
    throw `something went wrong: ${exc}`
  }
}

