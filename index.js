const { networks } = require('qtumjs-wallet')
const abi = require('ethjs-abi')

const { parseAbi, getIndex, tohexaddress, parseCourse } = require('./utils')
const tensegrity = require('./bin/Tensegrity.json')

const BASE_URL = 'http://40.67.212.77:3000'
const CONTRACT_ADDRESS = '18d62e8bf71cceea495e71c7b29733d51abfca50'
const FAKE_WALLET_WIF = 'cQHKNVeCRHUHzDnQcScKbZcKP96uKeGDcXq87kqNZsLWVWjWFbC4'
const config = {
  fee: 0.01,
  gasPrice: 50,
  gasLimit: 3000000
}

function searchlogs(from, to, addresses, topics = []) {
  const url = `${BASE_URL}/searchlogs/${from}/${to}/${addresses.join(',')}/${topics.join(',')}`
  return axios.get(url)
}

async function teacher_ready_to_give_lesson(wif, { price, student, author }) {
  if (!price || !student || !author)
    throw `teacher_ready_to_give_lesson invalid params: ${price}, ${student}, ${author}`
  
  try {
    //uint price, address student, address author
    const decoded = parseAbi(tensegrity.abi)
    const index = getIndex(decoded, 'teacher_ready_to_give_lesson')

    const encodedData = abi.encodeMethod(decoded[index].info, [price, `0x${tohexaddress(student)}`, `0x${tohexaddress(author)}`]).substr(2)
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

async function courses(address) {
  if (!address)
    throw `courses invalid params: ${address}`
  
  try {
    const decoded = parseAbi(tensegrity.abi)
    const index = getIndex(decoded, 'courses')
    const topic = tohexaddress(address)
    const encodedData = abi.encodeMethod(decoded[index].info, [`0x${topic}`]).substr(2)

    const wallet = networks.testnet.fromWIF(FAKE_WALLET_WIF)
    const { executionResult } = await wallet.contractCall(CONTRACT_ADDRESS, encodedData)
    return parseCourse(executionResult.output)
  }
  catch (exc) {
    throw `something went wrong: ${exc}`
  }
}

async function student_start_lesson(wif, teacher, price) {
  if (!teacher)
    throw `teacher_ready_to_give_lesson invalid params: ${teacher}`
  
  try {
    //uint price, address student, address author
    const decoded = parseAbi(tensegrity.abi)
    const index = getIndex(decoded, 'student_start_lesson')

    const encodedData = abi.encodeMethod(decoded[index].info, [`0x${tohexaddress(teacher)}`]).substr(2)
    const { gasLimit } = config
    
    const wallet = networks.testnet.fromWIF(wif)
    const signedTx = await wallet.generateContractSendTx(CONTRACT_ADDRESS, encodedData, { gasLimit, amount: price })
    const { txid } = await wallet.sendRawTx(signedTx)
    return txid
  }
  catch (exc) {
    throw `something went wrong: ${exc}`
  }
}

async function student_end_lesson(wif, isOk, teacher) {
  if (!teacher || !isOk)
    throw `teacher_ready_to_give_lesson invalid params: ${teacher}, ${isOk}`
  
  try {
    const decoded = parseAbi(tensegrity.abi)
    const index = getIndex(decoded, 'student_end_lesson')

    const encodedData = abi.encodeMethod(decoded[index].info, [isOk, `0x${tohexaddress(teacher)}`]).substr(2)
    const { gasLimit } = config
    
    const wallet = networks.testnet.fromWIF(wif)
    const signedTx = await wallet.generateContractSendTx(CONTRACT_ADDRESS, encodedData, { gasLimit })
    const { txid } = await wallet.sendRawTx(signedTx)
    console.log(txid)
    return txid
  }
  catch (exc) {
    throw `something went wrong: ${exc}`
  }
}

//teacher_ready_to_give_lesson('cQBNExX8R9cKuzbZG16NYcDKx4yeCLQ6XQgLSdUmVgUxErNJfQx9', { price: 100, student: address, author: address })

//student_start_lesson(wif, address, 100).catch(err => console.log(err))

//student_end_lesson(wif, true, address)
//courses(address).then(res => console.log(res))
