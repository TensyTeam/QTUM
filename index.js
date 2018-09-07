const { networks, generateMnemonic } = require('qtumjs-wallet')
const abi = require('ethjs-abi')
const axios = require('axios')

const { parseAbi, getIndex, tohexaddress, parseCourse } = require('./utils')
const tensegrity = require('./bin/Tensegrity.json')

const QTUM_TESTNET = 'https://testnet.qtum.org'
const BASE_URL = 'http://40.67.212.77:3000'
const CONTRACT_ADDRESS = 'ed1b64311bf196365b93b0119ec76b49be9043b8'
const FAKE_WALLET_WIF = 'cQHKNVeCRHUHzDnQcScKbZcKP96uKeGDcXq87kqNZsLWVWjWFbC4'
const LOG_LESSON_STARTED = '1513afd76a75f5d693cff2d526284178e616f44aa02b3027456f9d240e2d6066'
const TOPIC_LESSON_PREPARED = 'af83266df43f4cbe2812ff8e87dbb9f92768a2becf85ad2dfb2aa36f56dd2c9c'
const config = {
  fee: 0.01,
  gasPrice: 50,
  gasLimit: 3000000
}

module.exports = {
  get_current_height: async () => {
    const { data } = await axios.get(`${QTUM_TESTNET}/insight-api/sync`)
    
    if (data.status !== 'finished')
      throw 'cant get current blockchain height.'

    return data.blockChainHeight
  },

  waitforlog: async (from, topic, callback = (res) => { console.log('found!', res) }, 
    timeout = () => { console.log('waitfor_LessonPrepared_log expired')}) => {
    const currHeight = await module.exports.get_current_height()
    const start = new Date().getTime();
    
    const interval = setInterval(async () => {
      console.log(`REQUEST ${currHeight}`)
      const { data } = await module.exports.searchlogs(currHeight, "latest", [CONTRACT_ADDRESS], [topic])
      const filtered = data.data.filter(v => v.from.toLowerCase() === tohexaddress(from).toLowerCase())
      
      if (new Date().getTime() > start + 10 * 60 * 1000) {
        timeout()
        clearInterval(interval)
      }

      if (filtered.length !== 0) {
        callback(filtered[0])
        clearInterval(interval)
      }
    }, 10 * 1000)
  },

  searchlogs: async (from, to, addresses, topics = []) => {
    const url = `${BASE_URL}/searchlogs/${from}/${to}/${addresses.join(',')}/${topics.join(',')}`
    return axios.get(url)
  },
  
  teacher_ready_to_give_lesson: async (wif, { price, student, author, duration }) => {
    if (!price || !student || !author)
      throw `teacher_ready_to_give_lesson invalid params: ${price}, ${student}, ${author}`
    
    try {
      //uint price, address student, address author
      const decoded = parseAbi(tensegrity.abi)
      const index = getIndex(decoded, 'teacher_ready_to_give_lesson')
  
      const encodedData = abi.encodeMethod(decoded[index].info, [price, `0x${tohexaddress(student)}`, `0x${tohexaddress(author)}`, duration]).substr(2)
      const { gasLimit } = config
      
      const wallet = networks.testnet.fromWIF(wif)
      const signedTx = await wallet.generateContractSendTx(CONTRACT_ADDRESS, encodedData, { gasLimit })
      const { txid } = await wallet.sendRawTx(signedTx)
      return txid
    }
    catch (exc) {
      throw `something went wrong: ${exc}`
    }
  },
  
  courses: async (address) => {
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
  },
  
  student_start_lesson: async (wif, { teacher, price }) => {
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
  },

  withdraw_expired: async (wif) => {
    try {
      const decoded = parseAbi(tensegrity.abi)
      const index = getIndex(decoded, 'withdraw_expired')
  
      const encodedData = abi.encodeMethod(decoded[index].info, []).substr(2)
      const { gasLimit } = config
      
      const wallet = networks.testnet.fromWIF(wif)
      const signedTx = await wallet.generateContractSendTx(CONTRACT_ADDRESS, encodedData, { gasLimit })
      const { txid } = await wallet.sendRawTx(signedTx)
      return txid
    }
    catch (exc) {
      throw `something went wrong: ${exc}`
    }
  },
  
  student_end_lesson: async (wif, { isOk, teacher }) => {
    if (!teacher || !isOk)
      throw `student_end_lesson invalid params: ${teacher}, ${isOk}`
    
    try {
      const decoded = parseAbi(tensegrity.abi)
      const index = getIndex(decoded, 'student_end_lesson')
  
      const encodedData = abi.encodeMethod(decoded[index].info, [isOk, `0x${tohexaddress(teacher)}`]).substr(2)
      const { gasLimit } = config
      
      const wallet = networks.testnet.fromWIF(wif)
      const signedTx = await wallet.generateContractSendTx(CONTRACT_ADDRESS, encodedData, { gasLimit })
      const { txid } = await wallet.sendRawTx(signedTx)
      return txid
    }
    catch (exc) {
      throw `something went wrong: ${exc}`
    }
  },

  generate_priv_key: () => {
    const network = networks.testnet
    const mnemonic = generateMnemonic()
    const wallet = network.fromMnemonic(mnemonic)
    return {
      address: wallet.address,
      wif: wallet.toWIF(),
      mnemonic
    }
  },

  get_info: async (address) => {
    const wallet = networks.testnet.fromWIF(FAKE_WALLET_WIF)
    wallet.address = address
    return await wallet.getInfo()
  }
}
