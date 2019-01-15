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
      title: 'External wallets should be authorized signers over their address',
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyA,
      authAddr: keyToAddress(keyA),
      mockContract: {
        authorizedKey: null,
        errorIsValidSignature: false,
      },
      expectedAuthorizedSignerError: false,
      expectedAuthorizedSigner: true,
    },

    {
      title:
        'External wallets should NOT be authorized signers when signing the wrong challenge',
      challenge: 'foo',
      challengeSign: 'bar',
      signingKey: keyA,
      authAddr: keyToAddress(keyA),
      mockContract: {
        authorizedKey: ethUtil.privateToPublic(keyC),
        errorIsValidSignature: false,
      },
      expectedAuthorizedSignerError: false,
      expectedAuthorizedSigner: false,
    },
    {
      title:
        'External wallets should NOT be authorized signers over OTHER addresses',
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyA,
      authAddr: keyToAddress(keyB),
      mockContract: {
        authorizedKey: ethUtil.privateToPublic(keyC),
        errorIsValidSignature: false,
      },
      expectedAuthorizedSignerError: false,
      expectedAuthorizedSigner: false,
    },
    {
      title:
        'Smart-contract wallets with a 1-of-1 correct internal key should be authorized signers over their address',
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyB,
      authAddr: keyToAddress(keyA),
      mockContract: {
        authorizedKey: ethUtil.privateToPublic(keyB),
        errorIsValidSignature: false,
      },
      expectedAuthorizedSignerError: false,
      expectedAuthorizedSigner: true,
    },
    {
      title:
        'Smart-contract wallets with a 1-of-1 incorrect internal key should NOT be authorized signers over their address',
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyB,
      authAddr: keyToAddress(keyA),
      mockContract: {
        authorizedKey: ethUtil.privateToPublic(keyC),
        errorIsValidSignature: false,
      },
      expectedAuthorizedSignerError: false,
      expectedAuthorizedSigner: false,
    },
    {
      title: 'isAuthorizedSigner should error when smart-contract call errors',
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyB,
      authAddr: keyToAddress(keyA),
      mockContract: {
        authorizedKey: ethUtil.privateToPublic(keyB),
        errorIsValidSignature: true,
      },
      expectedAuthorizedSignerError: true,
      expectedAuthorizedSigner: false,
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
      let isAuthorizedSigner = false;
      try {
        isAuthorizedSigner = await dappAuth.isAuthorizedSigner(
          test.challenge,
          signature,
          test.authAddr,
        );
      } catch (error) {
        isError = true;
      }

      assert.equal(isError, test.expectedAuthorizedSignerError);
      assert.equal(isAuthorizedSigner, test.expectedAuthorizedSigner);
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
