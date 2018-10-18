const ethUtil = require("ethereumjs-util");

const erc725CoreInterfaceID = "0xd202158d";
const erc725InterfaceID = "0xdc3d2a7b";

module.exports = class MockContract {
  constructor(options) {
    this.isSupportsERC725CoreInterface = options.isSupportsERC725CoreInterface;
    this.isSupportsERC725Interface = options.isSupportsERC725Interface;
    this.actionableKey = options.actionableKey;
    this.errorOnIsSupportedContract = options.errorOnIsSupportedContract;
    this.errorOnKeyHasPurpose = options.errorOnKeyHasPurpose;
  }

  static _true() {
    return "0x0000000000000000000000000000000000000000000000000000000000000001";
  }

  static _false(callback) {
    return "0x0000000000000000000000000000000000000000000000000000000000000000";
  }

  run(methodCall, methodParams) {
    switch (methodCall) {
      case "01ffc9a7":
        return this._01ffc9a7(`0x${methodParams.substring(0, 4 * 2)}`);
      case "d202158d":
        return this._d202158d(`0x${methodParams.substring(0, 32 * 2)}`);
      default:
        return nil, fmt.Errorf("Unexpected method %v", methodCall);
    }
  }

  // "isSupportedContract" method call
  _01ffc9a7(interfaceID) {
    if (this.errorOnIsSupportedContract) {
      throw new Error("isSupportedContract call returned an error");
    }

    if (
      this.isSupportsERC725CoreInterface &&
      interfaceID === erc725CoreInterfaceID
    ) {
      return MockContract._true();
    }

    if (this.isSupportsERC725Interface && interfaceID === erc725InterfaceID) {
      return MockContract._true();
    }

    return MockContract._false();
  }

  // "keyHasPurpose" method call
  _d202158d(key) {
    if (this.errorOnKeyHasPurpose) {
      throw new Error("keyHasPurpose call returned an error");
    }

    if (key === ethUtil.bufferToHex(ethUtil.keccak(this.actionableKey))) {
      return MockContract._true();
    }

    return MockContract._false();
  }
};
