export const splitBillAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_splitToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createGroup',
    inputs: [
      {
        name: 'name',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'members',
        type: 'address[]',
        internalType: 'address[]',
      },
    ],
    outputs: [
      {
        name: 'groupId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'nextGroupId',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owed',
    inputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
      { name: '', type: 'address', internalType: 'address' },
      { name: '', type: 'address', internalType: 'address' },
    ],
    outputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'recordExpense',
    inputs: [
      { name: 'groupId', type: 'uint256', internalType: 'uint256' },
      { name: 'totalAmount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'settle',
    inputs: [
      { name: 'groupId', type: 'uint256', internalType: 'uint256' },
      { name: 'creditor', type: 'address', internalType: 'address' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'splitToken',
    inputs: [],
    outputs: [
      { name: '', type: 'address', internalType: 'contract SplitToken' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'ExpenseRecorded',
    inputs: [
      { name: 'groupId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'payer', type: 'address', indexed: true, internalType: 'address' },
      { name: 'totalAmount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'sharePerPerson', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'GroupCreated',
    inputs: [
      { name: 'groupId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'name', type: 'string', indexed: false, internalType: 'string' },
      { name: 'members', type: 'address[]', indexed: false, internalType: 'address[]' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Settled',
    inputs: [
      { name: 'groupId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'debtor', type: 'address', indexed: true, internalType: 'address' },
      { name: 'creditor', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  { type: 'error', name: 'EmptyGroup', inputs: [] },
  { type: 'error', name: 'NotAMember', inputs: [] },
  { type: 'error', name: 'NothingOwed', inputs: [] },
  { type: 'error', name: 'TransferFailed', inputs: [] },
  { type: 'error', name: 'WrongPaymentAmount', inputs: [] },
  { type: 'error', name: 'ZeroAmount', inputs: [] },
] as const