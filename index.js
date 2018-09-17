const { networks, generateMnemonic } = require('qtumjs-wallet')
const abi = require('ethjs-abi')
const axios = require('axios')
const { AES, enc } = require('crypto-js')

const { Wallet } = require('./wallet')
const { parseAbi, getIndex, tohexaddress, parseCourse, fromhexaddress  } = require('./utils')
const tensegrity = require('./bin/Tensegrity.json')

const QTUM_TESTNET = 'https://testnet.qtum.org'
const BASE_URL = 'http://40.67.212.77:3000'
const CONTRACT_ADDRESS = 'af627f760792bb66fefb4aaaf4c5be6811fe546b'
const FAKE_WALLET_WIF = 'cQHKNVeCRHUHzDnQcScKbZcKP96uKeGDcXq87kqNZsLWVWjWFbC4'
const TOPIC_LESSON_STARTED = '1513afd76a75f5d693cff2d526284178e616f44aa02b3027456f9d240e2d6066'
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

  waitfor_LessonStarted_log: (teacher, onSuccess = v => console.log('found', v), onTimeout = () => console.log('timeout')) => {
    return module.exports.waitforlog(teacher, TOPIC_LESSON_STARTED, onSuccess, onTimeout)
  },

  waitfor_LessonPrepared_log: (teacher, onSuccess = v => console.log('found', v), onTimeout = () => console.log('timeout')) => {
    return module.exports.waitforlog(teacher, TOPIC_LESSON_PREPARED, onSuccess, onTimeout)
  },

  waitforlog: async (from, topic, callback = (res) => { console.log('found!', res) }, 
    timeout = () => { console.log('waitfor_LessonPrepared_log expired')}) => {
    const currHeight = await module.exports.get_current_height()
    const start = new Date().getTime();
    
    const interval = setInterval(async () => {
      console.log(`REQUEST ${currHeight}`)
      const { data } = await module.exports.searchlogs(currHeight, "latest", [CONTRACT_ADDRESS], [topic])
      const filtered = data.data.filter(v => v.from.toLowerCase() === tohexaddress(from).toLowerCase())
      
      if (new Date().getTime() > start + 2 * 10 * 60 * 1000) {
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
  
  teacher_ready_to_give_lesson: async (wif, { price, student, author, duration, gasPrice }) => {
    if (!price || !student || !author)
      throw `teacher_ready_to_give_lesson invalid params: ${price}, ${student}, ${author}`
    
    try {
      //uint price, address student, address author
      const decoded = parseAbi(tensegrity.abi)
      const index = getIndex(decoded, 'teacher_ready_to_give_lesson')
  
      const encodedData = abi.encodeMethod(decoded[index].info, [price, `0x${tohexaddress(student)}`, `0x${tohexaddress(author)}`, duration]).substr(2)
      const { gasLimit } = config
      
      const wallet = networks.testnet.fromWIF(wif)
      const signedTx = await wallet.generateContractSendTx(CONTRACT_ADDRESS, encodedData, { gasPrice: gasPrice || 50 })
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
  
  student_start_lesson: async (wif, { teacher, price, gasPrice }) => {
    if (!teacher)
      throw `teacher_ready_to_give_lesson invalid params: ${teacher}`
    
    try {
      //uint price, address student, address author
      const decoded = parseAbi(tensegrity.abi)
      const index = getIndex(decoded, 'student_start_lesson')
  
      const encodedData = abi.encodeMethod(decoded[index].info, [`0x${tohexaddress(teacher)}`]).substr(2)
      const { gasLimit } = config
      
      const wallet = networks.testnet.fromWIF(wif)
      const signedTx = await wallet.generateContractSendTx(CONTRACT_ADDRESS, encodedData, { amount: price, gasPrice: gasPrice || 50 })
      const { txid } = await wallet.sendRawTx(signedTx)
      return txid
    }
    catch (exc) {
      throw `something went wrong: ${exc}`
    }
  },

  withdraw_expired: async (wif, { gasPrice }) => {
    try {
      const decoded = parseAbi(tensegrity.abi)
      const index = getIndex(decoded, 'withdraw_expired')
  
      const encodedData = abi.encodeMethod(decoded[index].info, []).substr(2)
      const { gasLimit } = config
      
      const wallet = networks.testnet.fromWIF(wif)
      const signedTx = await wallet.generateContractSendTx(CONTRACT_ADDRESS, encodedData, { gasPrice: gasPrice || 50 })
      const { txid } = await wallet.sendRawTx(signedTx)
      return txid
    }
    catch (exc) {
      throw `something went wrong: ${exc}`
    }
  },
  
  student_end_lesson: async (wif, { isOk, teacher, gasPrice }) => {
    if (!teacher || !isOk)
      throw `student_end_lesson invalid params: ${teacher}, ${isOk}`
    
    try {
      const decoded = parseAbi(tensegrity.abi)
      const index = getIndex(decoded, 'student_end_lesson')
  
      const encodedData = abi.encodeMethod(decoded[index].info, [isOk, `0x${tohexaddress(teacher)}`]).substr(2)
      const { gasLimit } = config
      
      const wallet = networks.testnet.fromWIF(wif)
      const signedTx = await wallet.generateContractSendTx(CONTRACT_ADDRESS, encodedData, { gasPrice: gasPrice || 50 })
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
  },

  encrypt: (wif, password) => {
    return AES.encrypt(wif, password).toString()
  },

  decrypt: (ecnrypted, password) => {
    bytes = AES.decrypt(ecnrypted, password);
    return bytes.toString(enc.Utf8);
  },

  checkPrivKey: (priv, addr) => {
    try {
      const wallet = networks.testnet.fromWIF(priv)
      return wallet.address === addr
    }
    catch (exc) {
      return false
    }
  },

  // 0.1
  send: async (wif, to, amount) => {
    const wallet = Wallet.restoreFromWif(wif)
    const tx = await wallet.generateTx(to, amount, 0.01)
    const txid = await Wallet.sendRawTx(tx)
    return txid
  }

}

//console.log(module.exports.checkPrivKey('cQBNExX8R9cKuzbZG16NYcDKx4yeCLQ6XQgLSdUmVg3xErNJfQx9', 'qbW63bgX99Cz8ckV3VKkF9vsFYrQVgu81u'))



const address = 'qRTujVfPSTo584P6MysCLWtRQcefwbkQpb'
const wif = 'cUEC74oRKXBFypQeucSMwPDw6fXHxkBZxm4hWQcXeDVP6TCkrhvh'

console.log(fromhexaddress('a9e29fbe8d567384a192471d249db075e393627c'))
//module.exports.send(wif, 'qRTujVfPSTo584P6MysCLWtRQcefwbkQpb', 0.1234).then(txid => console.log(txid))
/*
module.exports.courses(address).then(res => console.log(res))

module.exports.withdraw_expired(wif).then(tx => console.log(tx))
*/

module.exports.teacher_ready_to_give_lesson(wif, { price: 100, student: address, author: address, duration: 60 })
.then(txid => { 
  console.log(txid)
  module.exports.waitfor_LessonPrepared_log(address, (v) => {
    console.log(v)
    module.exports.courses(address).then(res => console.log(res))
    module.exports.student_start_lesson(wif, { teacher: address, price: 100 })
    .then(txid => { 
      console.log(txid)
      module.exports.waitfor_LessonStarted_log(address, (v) => {
        module.exports.courses(address).then(res => console.log(res))

        //module.exports.student_end_lesson(wif, {isOk: true, teacher: address}).then(t => console.log(t))
      })
    })
    .catch(err => console.log(err))
  })
})
.catch(err => console.log(err))


/*
module.exports.waitforlog(address, TOPIC_LESSON_PREPARED)
*/

//console.log(module.exports.encrypt('hello', 'password').toString())