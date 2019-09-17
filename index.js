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
    const eoaChallengeHash = this._hashEOAPersonalMessage(challenge);
    let isAuthorizedDirectKey;
    let errEOA;

    // try direct-keyed wallet
    try {
      // Get the address of whoever signed this message
      const { v, r, s } = ethUtil.fromRpcSig(signature);
      const recoveredKey = ethUtil.ecrecover(eoaChallengeHash, v, r, s);
      const recoveredAddress = ethUtil.publicToAddress(recoveredKey);

      if (
        address.toLowerCase() ===
        ethUtil.bufferToHex(recoveredAddress).toLowerCase()
      ) {
        isAuthorizedDirectKey = true;
      }
    } catch (err) {
      errEOA = err;
      // if either direct-keyed auth flow threw an error, or it did not conclude to be authorized, proceed to try smart-contract wallet.
    }
    try {
      if (isAuthorizedDirectKey === true) return isAuthorizedDirectKey;
      // try smart-contract wallet
      const erc1271CoreContract = new this.web3.eth.Contract(ERC1271, address);

      const magicValue = await erc1271CoreContract.methods
        .isValidSignature(ethUtil.keccak(challenge), signature) // we send just a regular hash, which then the smart contract hashes ontop to an erc191 hash
        .call();

      return magicValue === ERC1271_MAGIC_VALUE;
    } catch (err) {
      throw mergeErrors(errEOA, err);
    }
  }

  _hashEOAPersonalMessage(challenge) {
    return ethUtil.hashPersonalMessage(ethUtil.toBuffer(challenge));
  }
};

function mergeErrors(errEOA, errCA) {
  const msgEOA = errEOA
    ? `errored with: ${errEOA.toString()}`
    : 'returned false';
  return `Authorisation check failed and errored in 2 alternative flows. 'External Owned Account' check ${msgEOA} . 'Contract Account' check errored with: ${errCA.toString()}`;
}
