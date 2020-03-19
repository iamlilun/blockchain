const sha256 = require('sha256');
const uuid = require('uuid/v1');


const currentNodeUrl = process.argv[3];

class Blockchain {
  constructor () {
    this.chain = [];
    this.pendingTransactions = []; //待交易的資料

    this.currentNodeUrl = currentNodeUrl;
    this.networkNodes = [];

    this.createNewBlock(100, '0', '0');
  }

  /**
   * 建立新區塊
   * @param nonce: hash累計次數
   * @param previousBlockHash: 上一個hash值
   * @param hash: 這一次的hash值
   * @returns {{previousBlockHash: *, index: number, transactions: ([]|*[]), nonce: *, hash: *, timestamp: number}}
   */
  createNewBlock(nonce, previousBlockHash, hash){
    const newBlock = {
      index: this.chain.length + 1, //block id
      timestamp: Date.now(), //區塊建立時間
      transactions: this.pendingTransactions,
      nonce: nonce,
      hash: hash,
      previousBlockHash: previousBlockHash, //前一個block的hash
    }

    this.pendingTransactions = [];
    this.chain.push(newBlock);

    return newBlock;
  }

  /**
   * 最得最後一個區塊資料
   * @returns {*}
   */
  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * 建立新交易
   * @param amount: 金額
   * @param sender: 發送者
   * @param recipient: 接收者
   * @returns {*}
   */
  createNewTransaction(amount, sender, recipient) {
    const newTransaction = {
      amount: amount,
      sender: sender,
      recipient: recipient,
      transactionId: uuid().split('-').join(''),
    }

    return newTransaction;
  }

  /**
   * 新增交易到等待區
   * @param {object} transaction: 交易資料
   * @returns {*}
   */
  addTransactionToPendingTransaction(transaction){
    this.pendingTransactions.push(transaction);
    return this.getLastBlock().index + 1;
  }

  /**
   * 雜湊區塊資料
   * @param previousBlockHash: 上一個區塊的hash資料
   * @param currentBlockData: 現在的區塊資料
   * @param nonce: hash次數累計
   */
  hashBlock(previousBlockHash, currentBlockData, nonce) {
    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    return sha256(dataAsString);
  }

  /**
   * 工作量證明
   * @param previousBlockHash: 上一個區塊的hash資料
   * @param currentBlockData: 現在的區塊資料
   * @returns {number}
   */
  proofOfWork(previousBlockHash, currentBlockData){
    let nonce = 0; //計數器
    let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    while (hash.substring(0, 4) !== '0000'){
      nonce ++;
      hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
      console.log('H', hash);
    }

    return nonce;
  }
}

module.exports = Blockchain;
