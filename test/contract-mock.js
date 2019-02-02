const ethUtil = require('ethereumjs-util');
const ethAbi = require('ethereumjs-abi');
const Buffer = require('safe-buffer').Buffer;
const utils = require('./utils');

// bytes4(keccak256("isValidSignature(bytes32,bytes)")
const ERC1271_METHOD_SIG = '1626ba7e';

module.exports = class MockContract {
  constructor(options) {
    this.authorizedKey = options.authorizedKey;
    this.address = options.address;
    this.errorIsValidSignature = options.errorIsValidSignature;
  }

  static _true() {
    return `0x${ERC1271_METHOD_SIG}00000000000000000000000000000000000000000000000000000000`; // a.k.a the "magic value".
  }

  static _false(callback) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  // @param {String} methodCall
  // @param {String} methodParams
  // @return {String}
  run(methodCall, methodParams) {
    switch (methodCall) {
      case ERC1271_METHOD_SIG:
        const [hash, signature] = ethAbi.rawDecode(
          ['bytes32', 'bytes'],
          Buffer.from(methodParams, 'hex'),
        );

        return this._1626ba7e(hash, signature);
      default:
        throw new Error(`Unexpected method ${methodCall}`);
    }
  }

  // "isValidSignature" method call
  // @param {Buffer} hash
  // @param {Buffer} signature
  // @return {String}
  _1626ba7e(hash, signature) {
    if (this.errorIsValidSignature) {
      throw new Error('isValidSignature call returned an error');
    }

    // Get the address of whoever signed this message
    const { v, r, s } = ethUtil.fromRpcSig(signature);
    const erc191MessageHash = utils.erc191MessageHash(hash, this.address);
    const recoveredKey = ethUtil.ecrecover(erc191MessageHash, v, r, s);
    const recoveredAddress = ethUtil.publicToAddress(recoveredKey);

    const expectedAddress = ethUtil.publicToAddress(this.authorizedKey);

    if (recoveredAddress.toString() === expectedAddress.toString()) {
      return MockContract._true();
    }

    return MockContract._false();
  }
};
