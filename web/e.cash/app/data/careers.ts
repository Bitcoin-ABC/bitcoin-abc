// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export interface Career {
  title: string;
  location: string;
  description: string;
}

export const careers: Career[] = [
  {
    title: "App Developer",
    location: "Remote",
    description:
      "We are always expanding the wallet and app ecosystem of eCash. Do you have an app idea you'd like to build as a full time job? Are you looking to build with the latest in front end tech? React and Node preferred, but anything goes.",
  },
  {
    title: "C++ Developer",
    location: "Remote",
    description:
      "We are looking for an experienced C++ developer to support planned enhancements to our full node software. A background with bitcoin nodes is helpful but not required. Familiarity with indexing software is also a plus.",
  },
  {
    title: "Smart Contracts Engineer",
    location: "Remote",
    description:
      "Development of an EVM subnet is a key milestone for the eCash extensibility roadmap. 2017 proved the crypto future would be multi-chain, and the EVM is rapidly becoming industry standard. Are you passionate about fixed supply and money-first crypto but also excited about the tech potential of Ethereum? Have you contributed to open source full node software and built smart contracts in Solidity? We'd love to hear from you.",
  },
];
