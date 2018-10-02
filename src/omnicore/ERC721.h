#ifndef WORMHOLE_ERC721_H
#define WORMHOLE_ERC721_H

#include "omnicore/persistence.h"

#include "uint256.h"
#include "arith_uint256.h"
#include "serialize.h"

#include <boost/filesystem.hpp>

#include <stdint.h>
#include <stdio.h>
#include <string>
#include <vector>
#include <map>

enum Flags{
    FRESH = (1 << 0),
    DIRTY = (1 << 1),
};

extern uint256 UINT256ONE;

class CMPSPERC721Info : public CDBBase {
public:
    struct PropertyInfo{
        std::string         issuer;
        std::string         name;
        std::string         symbol;
        std::string         url;
        std::string         data;
        uint64_t            maxTokens;
        uint64_t            haveIssuedNumber;
        uint64_t            currentValidIssuedNumer;
        uint64_t            autoNextTokenID;
        uint256             txid;
        uint256             creationBlock;
        uint256             updateBlock;

        PropertyInfo();

        ADD_SERIALIZE_METHODS;

        template <typename Stream, typename Operation>
        inline void SerializationOp(Stream& s, Operation ser_action) {
            READWRITE(issuer);
            READWRITE(name);
            READWRITE(symbol);
            READWRITE(url);
            READWRITE(data);
            READWRITE(maxTokens);
            READWRITE(haveIssuedNumber);
            READWRITE(currentValidIssuedNumer);
            READWRITE(autoNextTokenID);
            READWRITE(creationBlock);
            READWRITE(updateBlock);
        }
    };
private:

    uint256 next_erc721spid;

    // map from propertyID to the property, the Flags indicate whether write the property info to database.
    std::map<uint256, std::pair<PropertyInfo, Flags> > cacheMapPropertyInfo;

public:

    CMPSPERC721Info(const boost::filesystem::path& path, bool fWipe);
    virtual ~CMPSPERC721Info();

    void init(const uint256& nextSPID = UINT256ONE);
    uint256 peekNextSPID() const;
    void clear();

    // When create a valid property, will call this function write property data to cacheMapPropertyInfo
    // return: the new property ID
    uint256 putSP(const PropertyInfo& info);

    bool existSP(const uint256& propertyID);

    // Get the special property's info.
    bool getAndUpdateSP(const uint256& propertyID, std::pair<PropertyInfo, Flags>** info);

    // get water block hash
    bool getWatermark(uint256& watermark) const;

    // Flush flush cacheMapPropertyInfo struct data with DIRTY flag to database.
    // Then clear the cacheMapPropertyInfo struct.
    bool flush(const uint256& watermark);

    // Delete database data with the param block hash. Then rollback the latest information
    // and historical information of all properties to the previous status.
    bool popBlock(const uint256& block_hash);

    bool findERCSPByTX(const uint256& txhash, uint256& propertyid);

};

class ERC721TokenInfos : public CDBBase{
public:
    struct TokenInfo{
        std::string owner;
        std::string url;
        uint256  attributes;
        uint256  txid;
        uint256  updateBlockHash;
        uint256  creationBlockHash;

        ADD_SERIALIZE_METHODS;
        template <typename Stream, typename Operation>
        inline void SerializationOp(Stream& s, Operation ser_action) {
            READWRITE(owner);
            READWRITE(url);
            READWRITE(attributes);
            READWRITE(txid);
            READWRITE(updateBlockHash);
            READWRITE(creationBlockHash);
        }
    };

    struct ERC721Token{
        // Map from Tokenid to the TokenInfo, and the flags identify whether the
        // TokenInfo data should write to database.
        std::map<uint256, std::pair<TokenInfo, Flags> > cacheTokenOwner;

        // The propertyID of these Tokens.
        // uint256 propertyID;
    };
private:

    // Map from the propertyID to its' Tokens.
    std::map<uint256, ERC721Token> cacheTokens;
public:

    ERC721TokenInfos(const boost::filesystem::path& path, bool fWipe);
    virtual ~ERC721TokenInfos();

    void clear(){
        cacheTokens.clear();
        // wipe database via parent class
        CDBBase::Clear();
    }
    // Indicates whether the special token exists or not.
    // params:
    //      propertyID : the property ID with the token
    //      tokenID : the special tokenID
    // return: true, the special token exist. otherwise..
    bool existToken(const uint256& propertyID, const uint256& tokenID);

    // When a new token is created, will call this function to put the newToken into
    // the property cacheMap struct.
    // Params:
    //      propertyID : the token inside property.
    //      tokenID : the created TokenID .
    //      info : the created tokenInfo.
    // return : true, the new created token is placed the property cache.
    bool putToken(const uint256& propertyID, const uint256& tokenID, const TokenInfo& info);

    // Get the special Token info, and possible will be changed outside.
    bool getAndUpdateToken(const uint256& propertyID, const uint256& tokenID, std::pair<TokenInfo, Flags>** info);

    // get water block hash.
    bool getWatermark(uint256& watermark) const;

    // Flush all tokens info of all property to the database. And write success will clear these cacheMap.
    bool flush(const uint256& block_hash);

    // // Delete database data with the param block hash. Then rollback the latest information
    // and historical information of all properties's tokens to the previous status.
    bool popBlock(const uint256& block_hash);

    bool findTokenByTX(const uint256& txhash, uint256& propertyid, uint256& tokenid);
};

namespace mastercore{
    extern CMPSPERC721Info *my_erc721sps;
    extern ERC721TokenInfos *my_erc721tokens;

    bool IsERC721TokenValid(const uint256& propertyid, const uint256& tokenid);
    bool IsERC721PropertyIdValid(const uint256& propertyid);
}



#endif //WORMHOLE_ERC721_H
