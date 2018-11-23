const ethUtil = require('ethereumjs-util');
const crypto = require('crypto');
const assert = require('assert');
const DappAuth = require('..');
const ProviderMock = require('./provider-mock');
const ContractMock = require('./contract-mock');

describe('dappauth', function() {
  const keyA = generateRandomKey();
  const keyB = generateRandomKey();
  const keyC = generateRandomKey();

  const testCases = [
    {
      title:
        'Direct-keyed wallets should have actionable control over their address',
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyA,
      authAddr: keyToAddress(keyA),
      mockContract: {
        isSupportsERC725CoreInterface: false,
        isSupportsERC725Interface: false,
        actionableKey: null,
        errorOnIsSupportedContract: false,
        errorOnKeyHasPurpose: false,
      },
      expectedIsSignerActionableOnAddressError: false,
      expectedIsSignerActionableOnAddress: true,
    },

    {
      title:
        'Direct-keyed wallets should NOT have actionable control when signing the wrong challenge',
      challenge: 'foo',
      challengeSign: 'bar',
      signingKey: keyA,
      authAddr: keyToAddress(keyA),
      mockContract: {
        isSupportsERC725CoreInterface: false,
        isSupportsERC725Interface: false,
        actionableKey: null,
        errorOnIsSupportedContract: false,
        errorOnKeyHasPurpose: false,
      },
      expectedIsSignerActionableOnAddressError: false,
      expectedIsSignerActionableOnAddress: false,
    },
    {
      title:
        'Direct-keyed wallets should NOT have actionable control over OTHER addresses',
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyA,
      authAddr: keyToAddress(keyB),
      mockContract: {
        isSupportsERC725CoreInterface: false,
        isSupportsERC725Interface: false,
        actionableKey: null,
        errorOnIsSupportedContract: false,
        errorOnKeyHasPurpose: false,
      },
      expectedIsSignerActionableOnAddressError: false,
      expectedIsSignerActionableOnAddress: false,
    },
    {
      title:
        'Smart-contract wallets with support for ERC725Core interface and action key should have actionable control over their address',
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyB,
      authAddr: keyToAddress(keyA),
      mockContract: {
        isSupportsERC725CoreInterface: true,
        isSupportsERC725Interface: false,
        actionableKey: ethUtil.privateToPublic(keyB),
        errorOnIsSupportedContract: false,
        errorOnKeyHasPurpose: false,
      },
      expectedIsSignerActionableOnAddressError: false,
      expectedIsSignerActionableOnAddress: true,
    },
    {
      title:
        'Smart-contract wallets with support for ERC725 interface and action key should have actionable control over their address',
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyB,
      authAddr: keyToAddress(keyA),
      mockContract: {
        isSupportsERC725CoreInterface: false,
        isSupportsERC725Interface: true,
        actionableKey: ethUtil.privateToPublic(keyB),
        errorOnIsSupportedContract: false,
        errorOnKeyHasPurpose: false,
      },
      expectedIsSignerActionableOnAddressError: false,
      expectedIsSignerActionableOnAddress: true,
    },
    {
      title:
        'Smart-contract wallets WITHOUT support for ERC725/ERC725Core interface and action key should NOT have actionable control over their address',
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyB,
      authAddr: keyToAddress(keyA),
      mockContract: {
        isSupportsERC725CoreInterface: false,
        isSupportsERC725Interface: false,
        actionableKey: ethUtil.privateToPublic(keyB),
        errorOnIsSupportedContract: false,
        errorOnKeyHasPurpose: false,
      },
      expectedIsSignerActionableOnAddressError: false,
      expectedIsSignerActionableOnAddress: false,
    },
    {
      title:
        'Smart-contract wallets with support for ERC725 interface and incorrect action key should have NO actionable control over their address',
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyB,
      authAddr: keyToAddress(keyA),
      mockContract: {
        isSupportsERC725CoreInterface: false,
        isSupportsERC725Interface: true,
        actionableKey: ethUtil.privateToPublic(keyC),
        errorOnIsSupportedContract: false,
        errorOnKeyHasPurpose: false,
      },
      expectedIsSignerActionableOnAddressError: false,
      expectedIsSignerActionableOnAddress: false,
    },
    {
      title:
        'isSignerActionableOnAddress should error when smart-contract call errors',
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyB,
      authAddr: keyToAddress(keyA),
      mockContract: {
        isSupportsERC725CoreInterface: true,
        isSupportsERC725Interface: false,
        actionableKey: ethUtil.privateToPublic(keyB),
        errorOnIsSupportedContract: true,
        errorOnKeyHasPurpose: false,
      },
      expectedIsSignerActionableOnAddressError: true,
      expectedIsSignerActionableOnAddress: false,
    },
    {
      title:
        'isSignerActionableOnAddress should error when smart-contract call errors',
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyB,
      authAddr: keyToAddress(keyA),
      mockContract: {
        isSupportsERC725CoreInterface: true,
        isSupportsERC725Interface: false,
        actionableKey: ethUtil.privateToPublic(keyB),
        errorOnIsSupportedContract: false,
        errorOnKeyHasPurpose: true,
      },
      expectedIsSignerActionableOnAddressError: true,
      expectedIsSignerActionableOnAddress: false,
    },
  ];

  testCases.forEach((test) =>
    it(test.title, async function() {
      const dappAuth = new DappAuth(
        new ProviderMock(new ContractMock(test.mockContract)),
      );

      const signature = signPersonalMessage(
        test.challengeSign,
        test.signingKey,
      );

      let isError = false;
      let isSignerActionableOnAddress = false;
      try {
        isSignerActionableOnAddress = await dappAuth.isSignerActionableOnAddress(
          test.challenge,
          signature,
          test.authAddr,
        );
      } catch (error) {
        isError = true;
      }

      assert.equal(isError, test.expectedIsSignerActionableOnAddressError);

      if (!isError) {
        assert.equal(
          isSignerActionableOnAddress,
          test.expectedIsSignerActionableOnAddress,
        );
      }
    }),
  );
});

function generateRandomKey() {
  return ethUtil.toBuffer(`0x${crypto.randomBytes(32).toString('hex')}`);
}

function signPersonalMessage(message, key) {
  const messageHash = ethUtil.hashPersonalMessage(ethUtil.toBuffer(message));
  const signature = ethUtil.ecsign(messageHash, key);
  return ethUtil.toRpcSig(signature.v, signature.r, signature.s);
}

function keyToAddress(key) {
  return ethUtil.bufferToHex(ethUtil.privateToAddress(key));
}
