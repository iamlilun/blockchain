const Blockchain = require('./blockchain')

const chain = new Blockchain()

const bc1 = {
  chain: [
    {
      index: 1,
      timestamp: 1584932812686,
      transactions: [],
      nonce: 100,
      hash: '0',
      previousBlockHash: '0'
    },
    {
      index: 2,
      timestamp: 1584932853824,
      transactions: [],
      nonce: 18140,
      hash: '0000b9135b054d1131392c9eb9d03b0111d4b516824a03c35639e12858912100',
      previousBlockHash: '0'
    },
    {
      index: 3,
      timestamp: 1584933000835,
      transactions: [
        {
          amount: 12.5,
          sender: '00',
          recipient: '586f33d06cb311eaaa4edb69e43e4034',
          transactionId: '7105e9206cb311eaaa4edb69e43e4034'
        },
        {
          amount: 300,
          sender: 'AAA',
          recipient: 'BBB'
        }
      ],
      nonce: 24539,
      hash: '0000564881215e0b0890d0759c5eaa5bc55a9fd917bd70cfdc5aafe80e553635',
      previousBlockHash: '0000b9135b054d1131392c9eb9d03b0111d4b516824a03c35639e12858912100'
    },
    {
      index: 4,
      timestamp: 1584933114174,
      transactions: [
        {
          amount: 12.5,
          sender: '00',
          recipient: '586f33d06cb311eaaa4edb69e43e4034',
          transactionId: 'c8964ae06cb311eaaa4edb69e43e4034'
        },
        {
          amount: 100,
          sender: 'CCC',
          recipient: 'DDD'
        },
        {
          amount: 10,
          sender: 'EEE',
          recipient: 'FFF'
        }
      ],
      nonce: 90587,
      hash: '00004150fcd5821928c9de8adf03503bc8b60dd46f5a92a23b0a5ea05f8c31e8',
      previousBlockHash: '0000564881215e0b0890d0759c5eaa5bc55a9fd917bd70cfdc5aafe80e553635'
    }
  ],
  pendingTransactions: [
    {
      amount: 12.5,
      sender: '00',
      recipient: '586f33d06cb311eaaa4edb69e43e4034',
      transactionId: '0c24e8c06cb411eaaa4edb69e43e4034'
    }
  ],
  currentNodeUrl: 'http://localhost:3001',
  networkNodes: []
}

console.log('Valid : ' + chain.chainIsValid(bc1.chain))
// const previousHash = "20333166be7a2583b3c136d799a17acce2b2308fac700ab5672b2e6866fba575";

// const currentBlockData = [
//   {
//     amount: 20,
//     sender: "kenneth",
//     recipient: "Jen"
//   },
//   {
//     amount: 20000,
//     sender: "Allen",
//     recipient: "Kenneth"
//   },
//   {
//     amount: 500000,
//     sender: "Dan",
//     recipient: "Kenneth"
//   }
// ];

// chain.createNewBlock(123, 'asdfasdfasd', 'asdfasdfasdfasd');
//
// chain.createNewTransaction(29, "kenneth", "Jen");
//
// chain.createNewBlock(125, 'asdfasdfasdfasd', 'qazwsxedc');
//
// chain.createNewTransaction(20, "kenneth", "Jen");
// chain.createNewTransaction(20000, "Allen", "Kenneth");
// chain.createNewTransaction(500000, "Dan", "Kenneth");
//
// chain.createNewBlock(126, 'qazwsxedc', 'tgbyhnujmikm');
// const nonce = 2000;

// console.log(chain.hashBlock(previousHash, currentBlockData, 19734));
// console.log(chain.proofOfWork(previousHash, currentBlockData));

// console.log(chain);
