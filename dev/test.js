const Blockchain = require('./blockchain');

const chain = new Blockchain();

console.log(chain);
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
