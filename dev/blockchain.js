const sha256 = require('sha256')
const uuid = require('uuid/v1')

const currentNodeUrl = process.argv[3]

class Blockchain {
  constructor () {
    this.chain = []
    this.pendingTransactions = [] //待交易的資料

    this.currentNodeUrl = currentNodeUrl
    this.networkNodes = []

    this.createNewBlock(100, '0', '0'); //建立創世block
  }

  /**
   * 建立新區塊
   * @param nonce: hash累計次數
   * @param previousBlockHash: 上一個hash值
   * @param hash: 這一次的hash值
   * @returns {{previousBlockHash: *, index: number, transactions: ([]|*[]), nonce: *, hash: *, timestamp: number}}
   */
  createNewBlock (nonce, previousBlockHash, hash) {
    const newBlock = {
      index: this.chain.length + 1, //block id
      timestamp: Date.now(), //區塊建立時間
      transactions: this.pendingTransactions,
      nonce: nonce,
      hash: hash,
      previousBlockHash: previousBlockHash, //前一個block的hash
    }

    this.pendingTransactions = []
    this.chain.push(newBlock)

    return newBlock
  }

  /**
   * 最得最後一個區塊資料
   * @returns {*}
   */
  getLastBlock () {
    return this.chain[this.chain.length - 1]
  }

  /**
   * 建立新交易
   * @param amount: 金額
   * @param sender: 發送者
   * @param recipient: 接收者
   * @returns {*}
   */
  createNewTransaction (amount, sender, recipient) {
    const newTransaction = {
      amount: amount,
      sender: sender,
      recipient: recipient,
      transactionId: uuid().split('-').join(''),
    }

    return newTransaction
  }

  /**
   * 新增交易到等待區
   * @param {object} transaction: 交易資料
   * @returns {*}
   */
  addTransactionToPendingTransaction (transaction) {
    this.pendingTransactions.push(transaction)
    return this.getLastBlock().index + 1
  }

  /**
   * 雜湊區塊資料
   * @param previousBlockHash: 上一個區塊的hash資料
   * @param currentBlockData: 現在的區塊資料
   * @param nonce: hash次數累計
   */
  hashBlock (previousBlockHash, currentBlockData, nonce) {
    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData)
    return sha256(dataAsString)
  }

  /**
   * 工作量證明
   * @param previousBlockHash: 上一個區塊的hash資料
   * @param currentBlockData: 現在的區塊資料
   * @returns {number}
   */
  proofOfWork (previousBlockHash, currentBlockData) {
    let nonce = 0 //計數器
    let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce)
    while (hash.substring(0, 4) !== '0000') {
      nonce++
      hash = this.hashBlock(previousBlockHash, currentBlockData, nonce)
      console.log('H', hash)
    }

    return nonce
  }

  /**
   * 驗證鏈的正確性
   * @param {Array} blockchain: 整個區塊鏈
   * @returns {boolean}
   */
  chainIsValid (blockchain) {
    let validChain = true

    /*--------------------------------
     | 每個block逐一檢查
     |--------------------------------
     | 透過前4碼是不是等於0000，來驗證proof of work資料是不是正確
     | 再透過block所記錄的上一次hash值，是不是真的跟上一區塊hash值一樣，來驗證鏈的資料
     |
     |
     */
    for (let i = 1; i < blockchain.length; i++) {
      const currentBlock = blockchain[i] //目前區塊資料
      const prevBlock = blockchain[i - 1] //上一區塊資料

      //validate block hash value
      if (currentBlock.previousBlockHash !== prevBlock.hash) {
        validChain = false
      }

      //validate proof of work
      const {transactions, index} = currentBlock;
      const blockHash = this.hashBlock(prevBlock.hash, //取得hash後的區塊資料
        {
          transactions,
          index
        },
        currentBlock.nonce);


      if(blockHash.substring(0, 4) !== '0000'){
        validChain = false;
      }
    }

    /*--------------------------------
     | 透過創世區塊來檢查
     |--------------------------------
     | 一個不合就等於有資料是假的
     |
     |
     */
    const gensisBlock = blockchain[0];
    const correctNonce = gensisBlock.nonce === 100;
    const correctPreviousBlockHash = gensisBlock.previousBlockHash === '0';
    const correctHash = gensisBlock.hash === '0';
    const correctTransactions = gensisBlock.transactions.length === 0;

    if(!correctNonce || !correctPreviousBlockHash || !correctHash || !correctTransactions){
      validChain = false;
    }

    return validChain;
  }

  /**
   * 透過hash value 取得該區塊的資料
   * @param blockHash: block的hash value
   * @returns {null}
   */
  getBlock(blockHash){

    let correctBlock = null;

    //每個block比對hash value
    this.chain.forEach(block => {
      if(block.hash === blockHash){
        correctBlock = block;
      }
    })

    return correctBlock;
  }

  /**
   * 方過交易的id 最得交易資料
   * @param transactionId: 交易id
   * @returns {{block: null, transaction: null}}
   */
  getTransaction(transactionId) {
    let correctTransaction = null; //正確的交易資料，預設null
    let correctBlock = null; //正確的區塊資料，預設null

    //從每個區塊的交易內逐一筆對id..
    this.chain.forEach(block => {
      block.transactions.forEach(transaction => {
        //id相同就賦值給正確資料的變數
        if(transaction.transactionId === transactionId){
          correctTransaction = transaction;
          correctBlock = block;
        }
      })
    })

    return {
      transaction: correctTransaction,
      block: correctBlock
    }
  }

  /**
   * 依錢包地址取得交易資料
   * @param address: 錢包地址
   * @returns {{addressTransactions: [], addressBalance: number}}
   */
  getAddressData(address) {
    const addressTransactions = []; //用來儲存跟這地址向關的交易資料

    //從每個區塊的交易內逐一筆對地址..
    this.chain.forEach(block => {
      block.transactions.forEach(transaction => {
        //支出的或收入的都存到addressTransactions裡
        if(transaction.sender === address || transaction.recipient === address){
          addressTransactions.push(transaction);
        }
      })
    })

    //計算總金額
    let balance = 0;

    addressTransactions.forEach(transaction => {
      //收到的
      if(transaction.recipient === address){
        balance += transaction.amount;
      }

      //支出的
      if(transaction.sender === address){
        balance -= transaction.amount;
      }
    })

    return {
      addressTransactions,
      addressBalance: balance
    }
  }

}

module.exports = Blockchain
