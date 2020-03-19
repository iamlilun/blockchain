const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const uuid = require('uuid/v1');
const port = process.argv[2];
const rp = require('request-promise');

const nodeAddress = uuid().split('-').join('');

const chain = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

/**
 * 顯示區塊狀態
 */
app.get('/blockchain', (req, res) => {
  res.send(chain);
});

/**
 * 加入一筆交易
 */
app.post('/transaction', (req, res) => {
  const newTransaction = req.body;
  const blockIndex = chain.addTransactionToPendingTransaction(newTransaction);
  res.json({note: `transaction will be created in block ${blockIndex}`})
});

/**
 * 新增一筆交易並廣播給其它node
 */
app.post('/transaction/broadcast', (req, res) => {
  const newTransaction = chain.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
  chain.addTransactionToPendingTransaction(newTransaction);

  /*--------------------------------
   | 通知各個節點有新交易加入了
   |--------------------------------
   | 輪循裝載到promise array裡
   | 然後再用promise all方式一次通知
   |
   */
  const requestPromises = [];

  chain.networkNodes.forEach(networkNodeUrl => {
    const requestOptions = {
      uri: networkNodeUrl + '/transaction', //call各節點的 /transaction
      method: 'POST',
      body: newTransaction,
      json: true
    }
    requestPromises.push(rp(requestOptions));
  })

  Promise.all(requestPromises)
    .then(data => {
      res.json({note: 'Transaction created and broadcast successfully'})
    })
});

/**
 * 礦務
 */
app.get('/mine', (req, res) => {
  const lastBlock = chain.getLastBlock(); //取得最後一個區塊資料
  const previousBlockHash = lastBlock.hash; //chain 取得鏈的雜湊值

  //設定本次區塊資料
  const currentBlockData = {
    transactions: chain.pendingTransactions, //待交易的資料
    index: lastBlock.index + 1 //資料index..因為第1筆index是創世block，所以index都加1才是正確要運算的資料
  }

  const nonce = chain.proofOfWork(previousBlockHash, currentBlockData); //開始運算挖礦

  const blockHash = chain.hashBlock(previousBlockHash, currentBlockData, nonce); //取得hash過後的block

  chain.createNewTransaction(12.5, "00", nodeAddress); //給礦工的

  const newBlock = chain.createNewBlock(nonce, previousBlockHash, blockHash); //建立新的區塊

  res.json({
    note: "New block mined successfully",
    block: newBlock
  });
});

/**
 * 註冊並廣播給其它node
 * 加入一個分散式鏈時使用
 */
app.post('/register-and-broadcast-node', (req, res) => {
  const newNodeUrl = req.body.newNodeUrl; //取得新的nodeUrl
  if(!newNodeUrl){
    res.json({note: 'Error param at newNodeUrl'});
    res.end();
  }

  //如果該節點尚未註冊過才加入節點
  if(!chain.networkNodes.includes(newNodeUrl)){
    chain.networkNodes.push(newNodeUrl);
  }

  /*--------------------------------
   | 通知各個節點有新node加入了
   |--------------------------------
   | 輪循裝載到promise array裡
   | 然後再用promise all方式一次通知
   |
   */
  const regNodePromise = [];

  chain.networkNodes.forEach(networkNodeUrl => {
    const requestOptions = {
      uri: networkNodeUrl + '/register-node', //call各節點的 /register-node
      method: 'POST',
      body: {
        newNodeUrl: newNodeUrl,
      },
      json: true,
    }
    regNodePromise.push(rp(requestOptions));
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
      return rp(bulkRegisterOptions);
    })
    .then(data => {
      res.json({note: 'New node registered with network successfully. '})
    })
});

/**
 * 註冊單一節點
 * 將broadcast發出的其它節點資料，註冊到本節點
 */
app.post('/register-node', (req, res) => {
  const newNodeUrl = req.body.newNodeUrl;

  //新的節點url沒有註用過?
  const nodeNotAlreadyPresent = !chain.networkNodes.includes(newNodeUrl);

  //現在的url跟新的url不一樣？
  const notCurrentNode = chain.currentNodeUrl !== newNodeUrl;

  //條件都成立才加入新的節點
  if(nodeNotAlreadyPresent && notCurrentNode) {
    chain.networkNodes.push(newNodeUrl);
  }

  res.json({note: 'New node registered successfully with node.'})
});

/**
 * 註冊多個節點
 * 加入一個分散式鏈時，會收到各個節點的資料回傳，再一一註冊在本節點裡
 */
app.post('/register-nodes-bulk', (req, res) => {
  const allNetworkNodes = req.body.allNetworkNodes;

  //輪循註冊節點裡
  allNetworkNodes.forEach(networkNodeUrl => {
    //該節點url沒有註用過?
    const nodeNotAlreadyPresent = !chain.networkNodes.includes(networkNodeUrl);

    //現在的url跟該節點的url不一樣？
    const notCurrentNode = chain.currentNodeUrl !== networkNodeUrl;

    //條件都成立才加入新的節點
    if(nodeNotAlreadyPresent && notCurrentNode) {
      chain.networkNodes.push(networkNodeUrl);
    }
  })

  res.json({note: 'Bulk registered successful.'})
});

app.listen(port, () => {
  console.log(`Listen on port ${port}...`,)
});
