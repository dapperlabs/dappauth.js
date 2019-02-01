const ethUtil = require('ethereumjs-util');
const Buffer = require('safe-buffer').Buffer;
const assert = require('assert');
const DappAuth = require('..');
const ProviderMock = require('./provider-mock');
const ContractMock = require('./contract-mock');
const utils = require('./utils');

describe('dappauth', function() {
  const keyA = utils.generateRandomKey();
  const keyB = utils.generateRandomKey();
  const keyC = utils.generateRandomKey();

  const testCases = [
    {
      title: 'External wallets should be authorized signers over their address',
      isEOA: true,
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyA,
      authAddr: utils.keyToAddress(keyA),
      mockContract: {
        authorizedKey: null,
        address: null,
        errorIsValidSignature: false,
      },
      expectedAuthorizedSignerError: false,
      expectedAuthorizedSigner: true,
    },

    {
      title:
        'External wallets should NOT be authorized signers when signing the wrong challenge',
      isEOA: true,
      challenge: 'foo',
      challengeSign: 'bar',
      signingKey: keyA,
      authAddr: utils.keyToAddress(keyA),
      mockContract: {
        authorizedKey: ethUtil.privateToPublic(keyC),
        address: utils.keyToAddress(keyA),
        errorIsValidSignature: false,
      },
      expectedAuthorizedSignerError: false,
      expectedAuthorizedSigner: false,
    },
    {
      title:
        'External wallets should NOT be authorized signers over OTHER addresses',
      isEOA: true,
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyA,
      authAddr: utils.keyToAddress(keyB),
      mockContract: {
        authorizedKey: ethUtil.privateToPublic(keyC),
        address: utils.keyToAddress(keyB),
        errorIsValidSignature: false,
      },
      expectedAuthorizedSignerError: false,
      expectedAuthorizedSigner: false,
    },
    {
      title:
        'Smart-contract wallets with a 1-of-1 correct internal key should be authorized signers over their address',
      isEOA: false,
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyB,
      authAddr: utils.keyToAddress(keyA),
      mockContract: {
        authorizedKey: ethUtil.privateToPublic(keyB),
        address: utils.keyToAddress(keyA),
        errorIsValidSignature: false,
      },
      expectedAuthorizedSignerError: false,
      expectedAuthorizedSigner: true,
    },
    {
      title:
        'Smart-contract wallets with a 1-of-1 incorrect internal key should NOT be authorized signers over their address',
      isEOA: false,
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyB,
      authAddr: utils.keyToAddress(keyA),
      mockContract: {
        authorizedKey: ethUtil.privateToPublic(keyC),
        address: utils.keyToAddress(keyA),
        errorIsValidSignature: false,
      },
      expectedAuthorizedSignerError: false,
      expectedAuthorizedSigner: false,
    },
    {
      title: 'isAuthorizedSigner should error when smart-contract call errors',
      isEOA: false,
      challenge: 'foo',
      challengeSign: 'foo',
      signingKey: keyB,
      authAddr: utils.keyToAddress(keyA),
      mockContract: {
        authorizedKey: ethUtil.privateToPublic(keyB),
        address: utils.keyToAddress(keyA),
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

      const signatureFunc = test.isEOA
        ? utils.signEOAPersonalMessage
        : utils.signERC1654PersonalMessage;

      const signature = signatureFunc(
        test.challengeSign,
        test.signingKey,
        test.authAddr,
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
