// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

export interface TeamMember {
  name: string;
  title: string;
  image: string;
  bio: string;
}

export const team: TeamMember[] = [
  {
    name: "Amaury Séchet",
    title: "Founder",
    image: "/amaury.png",
    bio: "Amaury Séchet is the founder of Bitcoin ABC and creator of Bitcoin Cash (BCH) and eCash (XEC). He specialized in scaling large-system architecture and was the lead developer at the Snazzy D Compiler. Amaury worked for Facebook researching digital cash solutions before his direct involvement in crypto in 2016.",
  },
  {
    name: "Fabcien",
    title: "Lead Dev",
    image: "/fabcien.png",
    bio: "Fabcien is an electronics and software engineer with over 15 years of experience. Former lead developer in the medical devices industry, he transitioned to crypto and joined the Bitcoin ABC team to work on Bitcoin Cash and later eCash from 2018.",
  },
  {
    name: "Joey King",
    title: "Dev",
    image: "/joey.png",
    bio: "Joey King is a senior full stack dev for Bitcoin ABC, where he works on JS toolkits and eCash products. He is the lead developer of Cashtab.com. A mechanical engineer, Joey worked for 10 years at ExxonMobil and Samsung before transitioning to crypto full time in 2017.",
  },
  {
    name: "PiRK",
    title: "Dev",
    image: "/pirk.png",
    bio: "PiRK started as a geophysicist in the oil and gas prospection industry with a passion for programming his own data processing tools. He transitioned to software engineering for data analysis in 2016, working at a synchrotron facility on a science toolkit/library. Since 2020, he is maintaining node software and eCash-related open source tools and wallet software as full stack developer.",
  },
  {
    name: "Antony Zegers",
    title: "CEO",
    image: "/antony.png",
    bio: "Antony holds a master's degree in Electrical Engineering and has 12 years of experience in operational research and analysis. He fell down the Bitcoin rabbit hole in 2012. Since 2017, he has been directly involved in crypto, organizing and developing cryptocurrency projects. He is chief executive officer of Bitcoin ABC since 2020.",
  },
  {
    name: "David Klakurka",
    title: "Management & Strategy",
    image: "/david.png",
    bio: "David has 13 years of experience in the software industry. He founded Blockchain Ventures, a software company creating bespoke Bitcoin applications. He and his team have been working with Bitcoin ABC since 2017 and currently maintains a number of services including paybutton.org & coin.dance.",
  },
  {
    name: "Kousha",
    title: "Biz-Dev",
    image: "/kousha.png",
    bio: "Kousha has an education as communications IT specialist and media designer. He began researching Bitcoin in 2013 and has been actively involved in crypto for over 8 years. He has been working as community lead, copywriter, and business developer for Bitcoin ABC since 2023.",
  },
  {
    name: "AK",
    title: "Social Media Manager",
    image: "/ak.png",
    bio: "AK is a freelance digital marketing consultant with 9 years of experience in digital marketing, content creation, and community building. He has been working as a social media manager for Bitcoin ABC since 2022.",
  },
];
