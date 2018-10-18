const Web3 = require("web3");
const ethUtil = require("ethereumjs-util");
const erc165 = require("./ABIs/ERC165");
const erc725Core = require("./ABIs/ERC725Core");

const erc725CoreInterfaceID = "0xd202158d";
const erc725InterfaceID = "0xdc3d2a7b";
const erc725ActionPurpose = 2;

module.exports = class DappAuth {
  constructor(web3Provider) {
    this.web3 = new Web3(web3Provider);
  }

  async isSignerActionableOnAddress(challenge, signature, address) {
    const challengeHash = ethUtil.hashPersonalMessage(
      ethUtil.toBuffer(challenge)
    );

    // Get the address of whoever signed this message
    const signatureParams = ethUtil.fromRpcSig(signature);
    const recoveredKey = ethUtil.ecrecover(
      challengeHash,
      signatureParams.v,
      signatureParams.r,
      signatureParams.s
    );
    const recoveredAddress = ethUtil.publicToAddress(recoveredKey);

    // try direct-keyed wallet
    if (
      address.toLowerCase() ===
      ethUtil.bufferToHex(recoveredAddress).toLowerCase()
    ) {
      return true;
    }

    // try smart-contract wallet
    const isSupportedContract = await this.isSupportedContract(address);
    if (!isSupportedContract) {
      return false;
    }

    const keyHasActionPurpose = await this.keyHasActionPurpose(
      address,
      recoveredKey
    );

    return keyHasActionPurpose;
  }

  async keyHasActionPurpose(contractAddr, key) {
    const erc725CoreContract = new this.web3.eth.Contract(
      erc725Core,
      contractAddr
    );
    const keyHash = ethUtil.keccak(key);

    return erc725CoreContract.methods
      .keyHasPurpose(keyHash, erc725ActionPurpose)
      .call();
  }

  async isSupportedContract(contractAddr) {
    const erc165Contract = new this.web3.eth.Contract(erc165, contractAddr);

    const isSupportsERC725CoreInterface = await erc165Contract.methods
      .supportsInterface(erc725CoreInterfaceID)
      .call();

    if (isSupportsERC725CoreInterface) {
      return true;
    }

    const isSupportsERC725Interface = await erc165Contract.methods
      .supportsInterface(erc725InterfaceID)
      .call();

    if (isSupportsERC725Interface) {
      return true;
    }

    return false;
  }
};
