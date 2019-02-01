const Web3 = require('web3');
const ethUtil = require('ethereumjs-util');
const ERC1271 = require('./ABIs/ERC1271');

const ERC1271_MAGIC_VALUE = '0x1626ba7e';

module.exports = class DappAuth {
  constructor(web3Provider) {
    this.web3 = new Web3(web3Provider);
  }

  async isAuthorizedSigner(challenge, signature, address) {
    const challengeHash = ethUtil.hashPersonalMessage(
      ethUtil.toBuffer(challenge),
    );

    // Get the address of whoever signed this message
    const { v, r, s } = ethUtil.fromRpcSig(signature);
    const recoveredKey = ethUtil.ecrecover(challengeHash, v, r, s);
    const recoveredAddress = ethUtil.publicToAddress(recoveredKey);

    // try direct-keyed wallet
    if (
      address.toLowerCase() ===
      ethUtil.bufferToHex(recoveredAddress).toLowerCase()
    ) {
      return true;
    }

    // try smart-contract wallet
    const erc1271CoreContract = new this.web3.eth.Contract(ERC1271, address);

    const magicValue = await erc1271CoreContract.methods
      .isValidSignature(ethUtil.keccak(challenge), signature) // we send just a regular hash, which then the smart contract hashes ontop to an erc191
      .call();

    return magicValue === ERC1271_MAGIC_VALUE;
  }
};
