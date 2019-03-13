const Web3 = require('web3');
const ethUtil = require('ethereumjs-util');
const ERC1271 = require('./ABIs/ERC1271');

// bytes4(keccak256("isValidSignature(bytes32,bytes)")
const ERC1271_MAGIC_VALUE = '0x1626ba7e';

module.exports = class DappAuth {
  constructor(web3Provider) {
    this.web3 = new Web3(web3Provider);
  }

  async isAuthorizedSigner(challenge, signature, address) {
    const challengeHash = ethUtil.hashPersonalMessage(
      ethUtil.toBuffer(challenge),
    );

    let isAuthorizedDirectKey;

    // try direct-keyed wallet
    try {
      // Get the address of whoever signed this message
      const { v, r, s } = ethUtil.fromRpcSig(signature);
      const recoveredKey = ethUtil.ecrecover(challengeHash, v, r, s);
      const recoveredAddress = ethUtil.publicToAddress(recoveredKey);

      if (
        address.toLowerCase() ===
        ethUtil.bufferToHex(recoveredAddress).toLowerCase()
      ) {
        isAuthorizedDirectKey = true;
      }
    } catch (e) {
      // if either direct-keyed auth flow threw an error, or it did not conclude to be authorized, proceed to try smart-contract wallet.
    }
    if (isAuthorizedDirectKey === true) return isAuthorizedDirectKey;
    // try smart-contract wallet
    const erc1271CoreContract = new this.web3.eth.Contract(ERC1271, address);

    const magicValue = await erc1271CoreContract.methods
      .isValidSignature(ethUtil.keccak(challenge), signature) // we send just a regular hash, which then the smart contract hashes ontop to an erc191 hash
      .call();

    return magicValue === ERC1271_MAGIC_VALUE;
  }
};
