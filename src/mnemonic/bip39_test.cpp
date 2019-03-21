#include "dictionary.h"
#include "mnemonic.h"
#include "utilstrencodings.h"
#include <array>
#include <assert.h>
#include <iostream>
#include <numeric>
#include <vector>

#include <algorithm>
#include <iterator>
#include <sstream>

std::vector<uint8_t> from_hex(const std::string &str) {
  size_t bias = (str.size() % 2) == 0 ? 0 : 1;
  assert((str.size() + bias) % 2 == 0);
  std::vector<uint8_t> res((str.size() + bias) >> 1);

  for (size_t i = 0; i < str.size(); ++i) {
    auto c = str[i];
    size_t j = (i + bias) >> 1;
    res[j] <<= 4;
    if (c >= '0' && c <= '9') {
      res[j] += (c - '0');
    } else if (c >= 'a' && c <= 'f') {
      res[j] += 10 + (c - 'a');
    } else if (c >= 'A' && c <= 'F') {
      res[j] += 10 + (c - 'A');
    } else {
      break;
    }
  }
  return res;
}

using namespace mnemonic;

namespace {
struct MnemonicData {
  std::string entropy;
  std::string mnemonic;
  std::string seed;
  const Dictionary &language;
};

typedef std::vector<MnemonicData> MnemonicDataList;

const MnemonicDataList mnemonicTestData = {
    {{"00000000000000000000000000000000",
      "abandon,abandon,abandon,abandon,abandon,abandon,abandon,abandon,abandon,abandon,abandon,about",
      "5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d"
      "8d48b2d2ce9e38e4",
      language::en},
     {"7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f", "legal,winner,thank,year,wave,sausage,worth,useful,legal,winner,thank,yellow",
      "878386efb78845b3355bd15ea4d39ef97d179cb712b77d5c12b6be415fffeffe5f377ba02bf3f8544ab800b955e51fbff09828f682052a20"
      "faa6addbbddfb096",
      language::en},
     {"80808080808080808080808080808080",
      "letter,advice,cage,absurd,amount,doctor,acoustic,avoid,letter,advice,cage,above",
      "77d6be9708c8218738934f84bbbb78a2e048ca007746cb764f0673e4b1812d176bbb173e1a291f31cf633f1d0bad7d3cf071c30e98cd0688"
      "b5bcce65ecaceb36",
      language::en},
     {"ffffffffffffffffffffffffffffffff", "zoo,zoo,zoo,zoo,zoo,zoo,zoo,zoo,zoo,zoo,zoo,wrong",
      "b6a6d8921942dd9806607ebc2750416b289adea669198769f2e15ed926c3aa92bf88ece232317b4ea463e84b0fcd3b53577812ee449ccc44"
      "8eb45e6f544e25b6",
      language::en},
     {"77c2b00716cec7213839159e404db50d",
      "jelly,better,achieve,collect,unaware,mountain,thought,cargo,oxygen,act,hood,bridge",
      "c7b8fbb38c1abe38dfc0fea9797804558dfac244cd7737ae3a1b619991e0ad520155d982f906629639dc39e440520f98f820bea4f886a63a"
      "45923a63441f25ef",
      language::en},
     {"0460ef47585604c5660618db2e6a7e7f", "afford,alter,spike,radar,gate,glance,object,seek,swamp,infant,panel,yellow",
      "3ddfd060236156416f8915ed6ced01c3316292aec7250434f7e32cda2338e76399874787257acad15618c81bcddd88714f8c0d316140dad8"
      "09f0ca8b1a971679",
      language::en},
     {"eaebabb2383351fd31d703840b32e9e2", "turtle,front,uncle,idea,crush,write,shrug,there,lottery,flower,risk,shell",
      "4ef6e8484a846392f996b15283906b73be4ec100859ce68689d5a0fad7f761745b86d70ea5f5c43e4cc93ce4b82b3d9aeed7f85d503fac00"
      "b10ebbc150399100",
      language::en},
     {"18ab19a9f54a9274f03e5209a2ac8a91", "board,flee,heavy,tunnel,powder,denial,science,ski,answer,betray,cargo,cat",
      "22087755f76d6fb93ddd19e71106d4d4146f48424a241c0eda88787227827166223f61860d53652b635f360b5a37dd26c8aed3fa10b6f8e9"
      "5be18f1913f4ca88",
      language::en},
     {"baadf00dbaadf00dbaadf00dbaadf00d",
      "previo,humilde,actuar,jarabe,tabique,ahorro,tope,pulpo,anís,señal,lavar,bahía",
      "9cc236d5fa28c39e835bd6f7d66b51056c3a2f56208da1c1c2997a3741fe60bb0645d849ecacff0a29f2e26977ae42b12b97a5a3a8cc78d7"
      "113b536ff069352e",
      language::es},
     {"baadf00dbaadf00dbaadf00dbaadf00d",
      "ねんかん,すずしい,あひる,せたけ,ほとんど,あんまり,めいあん,のべる,いなか,ふとる,ぜんりゃく,えいせい",
      "7080e13e2e306aa2f92b56c0a2d66de62c616c4d5a3bee9c026c37172c93e4aac47d6a16c9ddc28132f5a037862c0cfc747e6f272f55016d"
      "dbf8b8206d331237",
      language::ja},
     {"baadf00dbaadf00dbaadf00dbaadf00d", "博,肉,地,危,惜,多,陪,荒,因,患,伊,基",
      "a7d6aa4f8e23bb666ad8d5ee58df85824a93d69a306547433bd047173d45ddaf7595d98b00386af5b8ddfce2666792961cfa70bbe71b97cb"
      "211811a7512b8d2b",
      language::zh_Hans},
     {"baadf00dbaadf00dbaadf00dbaadf00d", "博,肉,地,危,惜,多,陪,荒,因,患,伊,基",
      "a7d6aa4f8e23bb666ad8d5ee58df85824a93d69a306547433bd047173d45ddaf7595d98b00386af5b8ddfce2666792961cfa70bbe71b97cb"
      "211811a7512b8d2b",
      language::zh_Hant}}};
}

int main() {
  for (const auto &testData : mnemonicTestData) {
    auto bits = from_hex(testData.entropy);
    WordList wordList = mapBitsToMnemonic(bits, testData.language);
    std::cout << "entropy = " << testData.entropy << "\n";
    std::cout << "Wordlist = " << join(wordList,",") << "\n";
    std::cout << "mnemonic = " << testData.mnemonic << "\n";
    assert(testData.mnemonic == join(wordList, ","));

    std::vector<uint8_t> hash = decodeMnemonic(wordList);
    auto hex_data = HexStr(hash);
    std::cout << "hex_data= " << hex_data << "\n";
    std::cout << "ref hex_data= " << testData.seed << "\n";
    assert(testData.seed == HexStr(hash));
  }
}
