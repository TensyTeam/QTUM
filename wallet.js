const qtum = require('qtumjs-lib')
const axios = require('axios')

const network = qtum.networks.qtum_testnet

const Wallet = class Wallet {
  constructor(keyPair, extend = {}) {
    this.keyPair = keyPair
    this.extend = extend
    this.info = {
      address: this.getAddress(),
      balance: 'loading',
      unconfirmedBalance: 'loading',
      qrc20: [],
    }
    this.txList = []
  }

  getAddress() {
    return this.keyPair.getAddress()
  }

  getPrivKey() {
    try {
      return this.keyPair.toWIF()
    } catch (e) {
      if (e.toString() === 'Error: Missing private key') {
        return null
      } else {
        throw e
      }
    }
  }

  async generateTx(to, amount, fee) {
    return await Wallet.generateTx(this, to, amount, fee, await getUtxoList(this.info.address))
  }

  static async generateTx(wallet, to, amount, fee, utxoList) {
    return qtum.utils.buildPubKeyHashTransaction(wallet.keyPair, to, amount, fee, utxoList)
  }

  static async sendRawTx(tx) {
    return await sendRawTx(tx)
  }

  static restoreFromWif(wif) {
    return new Wallet(qtum.ECPair.fromWIF(wif, network))
  }
}

const apiPrefix = 'https://testnet.qtum.org/insight-api'

const _get = async url => {
  return (await axios.get(apiPrefix + url)).data
}

const _post = async (url, data) => {
  return (await axios.post(apiPrefix + url, data)).data
}

async function getUtxoList(address) {
  return (await _get(`/addr/${address}/utxo`)).map(item => {
    return {
      address: item.address,
      txid: item.txid,
      confirmations: item.confirmations,
      isStake: item.isStake,
      amount: item.amount,
      value: item.satoshis,
      hash: item.txid,
      pos: item.vout
    }
  })
}

async function sendRawTx(rawTx) {
  return (await (_post('/tx/send', { rawtx: rawTx }))).txid
}

module.exports.Wallet = Wallet