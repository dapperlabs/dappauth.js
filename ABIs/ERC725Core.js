/* eslint-disable */

module.exports = [
  {
    constant: true,
    inputs: [
      {
        name: "_key",
        type: "bytes32"
      },
      {
        name: "_purpose",
        type: "uint256"
      }
    ],
    name: "keyHasPurpose",
    outputs: [
      {
        name: "exists",
        type: "bool"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  }
];
