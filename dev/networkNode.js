const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const Blockchain = require('./blockchain')
const uuid = require('uuid/v1')
const port = process.argv[2]
const rp = require('request-promise')

const nodeAddress = uuid().split('-').join('')

const chain = new Blockchain()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

/**
 * 顯示區塊狀態
 */
app.get('/blockchain', (req, res) => {
  res.send(chain)
})

/**
 * 加入一筆交易
 */
app.post('/transaction', (req, res) => {
  const newTransaction = req.body
  const blockIndex = chain.addTransactionToPendingTransaction(newTransaction)
  res.json({ note: `transaction will be created in block ${blockIndex}` })
})

/**
 * 新增一筆交易並廣播給其它node
 */
app.post('/transaction/broadcast', (req, res) => {
  const newTransaction = chain.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient)
  chain.addTransactionToPendingTransaction(newTransaction)

  /*--------------------------------
   | 通知各個節點有新交易加入了
   |--------------------------------
   | 輪循裝載到promise array裡
   | 然後再用promise all方式一次通知
   |
   */
  const requestPromises = []

  chain.networkNodes.forEach(networkNodeUrl => {
    const requestOptions = {
      uri: networkNodeUrl + '/transaction', //call各節點的 /transaction
      method: 'POST',
      body: newTransaction,
      json: true
    }
    requestPromises.push(rp(requestOptions))
  })

  Promise.all(requestPromises)
    .then(data => {
      res.json({ note: 'Transaction created and broadcast successfully' })
    })
})

/**
 * 礦務
 */
app.get('/mine', (req, res) => {
  const lastBlock = chain.getLastBlock() //取得最後一個區塊資料
  const previousBlockHash = lastBlock.hash //取得上一個區塊的雜湊值

  //設定本次區塊資料
  const currentBlockData = {
    transactions: chain.pendingTransactions, //待交易的資料
    index: lastBlock.index + 1 //設定index..當然是上筆資料index + 1
  }
  const nonce = chain.proofOfWork(previousBlockHash, currentBlockData) //開始運算挖礦囉
  const blockHash = chain.hashBlock(previousBlockHash, currentBlockData, nonce) //將區塊資料hash

  const newBlock = chain.createNewBlock(nonce, previousBlockHash, blockHash) //建立新的區塊

  /*--------------------------------
   | 礦工挖好礦了，通知各個節點儲存新區塊
   |--------------------------------
   | 輪循裝載到promise array裡
   | 然後再用promise all方式一次通知
   |
   */
  const requestPromises = []

  chain.networkNodes.forEach(networkNodeUrl => {
    const requestOptions = {
      uri: networkNodeUrl + '/receive-new-block',
      method: 'POST',
      body: { newBlock: newBlock },
      json: true
    }

    requestPromises.push(rp(requestOptions))
  })

  Promise.all(requestPromises)
    .then(data => {
      const requestOptions = {
        uri: chain.currentNodeUrl + '/transaction/broadcast',
        method: 'POST',
        body: { //給礦工的
          amount: 12.5,
          sender: '00',
          recipient: nodeAddress
        },
        json: true
      }

      return rp(requestOptions)
    })
    .then(data => {
      res.json({
        note: 'New block mined & broadcast successfully',
        block: newBlock
      })
    })
})

app.post('/receive-new-block', (req, res) => {
  const newBlock = req.body.newBlock
  const lastBlock = chain.getLastBlock() //取得最後一個block出來

  /*--------------------------------
   | 判斷區塊的順序正不正確..正確才能加入鏈中
   |--------------------------------
   | 我們在每個區塊都有記錄previousBlockHash的值
   | 所以最後一個block的hash value值，應該要等於新block的previousBlockHash
   | And
   | 我們在每個區塊都有記錄index的值
   | 所以最後一個block的值+1後，應該要跟新block的index相等
   |
   */
  const correctHash = lastBlock.hash === newBlock.previousBlockHash
  const correctIndex = lastBlock.index + 1 === newBlock.index //chain的最後一個block index + 1是不是等於新block的index

  if (correctHash && correctIndex) {
    chain.chain.push(newBlock) //加入新的區塊
    chain.pendingTransactions = [] //清空pending的交易，因為以經運算完了
    res.json({
      note: 'New block received and accepted. ',
      newBlock: newBlock
    })
  } else {
    res.json({
      note: 'New block rejected. ',
      newBlock: newBlock
    })
  }
})

/**
 * 註冊並廣播給其它node
 * 加入一個分散式鏈時使用
 */
app.post('/register-and-broadcast-node', (req, res) => {
  const newNodeUrl = req.body.newNodeUrl //取得新的nodeUrl
  if (!newNodeUrl) {
    res.json({ note: 'Error param at newNodeUrl' })
    res.end()
  }

  //如果該節點尚未註冊過才加入節點
  if (!chain.networkNodes.includes(newNodeUrl)) {
    chain.networkNodes.push(newNodeUrl)
  }

  /*--------------------------------
   | 通知各個節點有新node加入了
   |--------------------------------
   | 輪循裝載到promise array裡
   | 然後再用promise all方式一次通知
   |
   */
  const regNodePromise = []

  chain.networkNodes.forEach(networkNodeUrl => {
    const requestOptions = {
      uri: networkNodeUrl + '/register-node', //call各節點的 /register-node
      method: 'POST',
      body: {
        newNodeUrl: newNodeUrl,
      },
      json: true,
    }
    regNodePromise.push(rp(requestOptions))
  })

  Promise.all(regNodePromise)
    .then(data => {
      //通知新註冊的機器自己也要加入其它的節點
      const bulkRegisterOptions = {
        uri: newNodeUrl + '/register-nodes-bulk',
        method: 'POST',
        body: {
          allNetworkNodes: [...chain.networkNodes, chain.currentNodeUrl],
        },
        json: true,
      }
      return rp(bulkRegisterOptions)
    })
    .then(data => {
      res.json({ note: 'New node registered with network successfully. ' })
    })
})

/**
 * 註冊單一節點
 * 將broadcast發出的其它節點資料，註冊到本節點
 */
app.post('/register-node', (req, res) => {
  const newNodeUrl = req.body.newNodeUrl

  //新的節點url沒有註用過?
  const nodeNotAlreadyPresent = !chain.networkNodes.includes(newNodeUrl)

  //現在的url跟新的url不一樣？
  const notCurrentNode = chain.currentNodeUrl !== newNodeUrl

  //條件都成立才加入新的節點
  if (nodeNotAlreadyPresent && notCurrentNode) {
    chain.networkNodes.push(newNodeUrl)
  }

  res.json({ note: 'New node registered successfully with node.' })
})

/**
 * 註冊多個節點
 * 加入一個分散式鏈時，會收到各個節點的資料回傳，再一一註冊在本節點裡
 */
app.post('/register-nodes-bulk', (req, res) => {
  const allNetworkNodes = req.body.allNetworkNodes

  //輪循註冊節點裡
  allNetworkNodes.forEach(networkNodeUrl => {
    //該節點url沒有註用過?
    const nodeNotAlreadyPresent = !chain.networkNodes.includes(networkNodeUrl)

    //現在的url跟該節點的url不一樣？
    const notCurrentNode = chain.currentNodeUrl !== networkNodeUrl

    //條件都成立才加入新的節點
    if (nodeNotAlreadyPresent && notCurrentNode) {
      chain.networkNodes.push(networkNodeUrl)
    }
  })

  res.json({ note: 'Bulk registered successful.' })
})

/**
 * 取得共識資料..
 * 因為節點多，每個節點的交易跟鏈也許會有不同，所以區塊中長度最長且驗證無誤的鏈資料就是共識，
 * 各節點要以共識的資料為主
 */
app.get('/consensus', (req, res) => {

  //取得每一節點的區塊資料
  const requestPromises = []

  chain.networkNodes.forEach(networkNodeUrl => {
    const requestOptions = {
      uri: networkNodeUrl + '/blockchain',
      method: 'GET',
      json: true
    }
    requestPromises.push(rp(requestOptions))
  })

  Promise.all(requestPromises)
    .then(blockchains => {
      let maxChainLength = chain.chain.length //設定最大的長度，就是本節點的區塊鏈長度
      let newLongerChain = null //初最更長的鏈，預設為null
      let newPendingTransaction = null //初使等待中的交易，預設為null

      /*--------------------------------
       | 輪循各個區塊，判斷長度
       |--------------------------------
       | 以最長的鏈當主要判斷依據，所以如果有比本機更大長度的鏈，
       | 就賦值給 newLongerChain & newPendingTransaction
       | 整輪下來就能取得取長的鏈資料
       */
      blockchains.forEach(blockchain => {
        //如果長度大於本機的長度，就將值設為
        if (blockchain.chain.length > maxChainLength) {
          maxChainLength = blockchain.chain.length
          newLongerChain = blockchain.chain
          newPendingTransaction = blockchain.pendingTransactions
        }
      })

      //如果沒有更長的鏈，或是有新長度的資料，但是驗證不過，說明鏈並沒有更換
      if (!newLongerChain || (newLongerChain && !chain.chainIsValid(newLongerChain))) {
        res.json({
          note: 'Current chain has not been replaced. ',
          chain: chain.chain
        })
      } else if (newLongerChain && chain.chainIsValid(newLongerChain)) { //如果有新長度的資料也驗證過了，就更換本機鏈的資料
        chain.chain = newLongerChain
        chain.pendingTransactions = newPendingTransaction
        res.json({
          note: 'This chain has been replaced.',
          chain: chain.chain
        })
      }
    })
})

/**
 * 透過hash值取得block資料
 */
app.get('/block/:blockHash', (req, res) => {
  const correctBlock = chain.getBlock(req.params.blockHash)

  res.json({
    block: correctBlock
  })
})

/**
 * 透過交易id取得交易資料
 */
app.get('/transaction/:transactionId', (req, res) => {
  const { transaction, block } = chain.getTransaction(req.params.transactionId)

  res.json({
    transaction,
    block
  })
})

/**
 * 透過錢包地址取得交易資料
 */
app.get('/address/:address', (req, res) => {
  const addressData = chain.getAddressData(req.params.address)

  res.json({
    addressData
  })
})

app.get('/block-explorer', (req, res) => {
  res.sendfile('./block-explorer/index.html', {root: __dirname})
})

app.listen(port, () => {
  console.log(`Listen on port ${port}...`,)
})
