const ethUtil = require('ethereumjs-util');
const utils = require('./utils');

const erc725CoreInterfaceID = '0xd202158d';
const erc725InterfaceID = '0xdc3d2a7b';

module.exports = class MockContract {
  constructor(options) {
    this.authorizedKey = options.authorizedKey;
    this.address = options.address;
    this.errorIsValidSignature = options.errorIsValidSignature;
  }

  static _true() {
    return '0x20c13b0b00000000000000000000000000000000000000000000000000000000';
  }

  static _false(callback) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  run(methodCall, methodParams) {
    switch (methodCall) {
      case '20c13b0b':
        const hash = `0x${methodParams.substring(96 * 2, 128 * 2)}`;
        const signature = `0x${methodParams.substring(160 * 2, 225 * 2)}`;
        return this._20c13b0b(hash, signature);
      default:
        throw new Error(`Unexpected method ${methodCall}`);
    }
  }

  // "isValidSignature" method call
  _20c13b0b(hash, signature) {
    if (this.errorIsValidSignature) {
      throw new Error('isValidSignature call returned an error');
    }

    // Get the address of whoever signed this message
    const { v, r, s } = ethUtil.fromRpcSig(signature);
    const erc191MessageHash = utils.erc191MessageHash(
      ethUtil.toBuffer(hash),
      this.address,
    );
    const recoveredKey = ethUtil.ecrecover(erc191MessageHash, v, r, s);
    const recoveredAddress = ethUtil.publicToAddress(recoveredKey);

    const expectedAddress = ethUtil.publicToAddress(this.authorizedKey);

    if (recoveredAddress.toString() === expectedAddress.toString()) {
      return MockContract._true();
    }

    return MockContract._false();
  }
};
