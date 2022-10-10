// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_SHORTIDPROCESSOR_H
#define BITCOIN_SHORTIDPROCESSOR_H

#include <cassert>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <unordered_map>
#include <utility>
#include <vector>

template <typename PrefilledItemType, typename Adapter, typename ItemCompare>
class ShortIdProcessor : Adapter, ItemCompare {
    using ItemType = typename std::remove_reference<
        decltype(std::declval<Adapter &>().getItem(
            std::declval<PrefilledItemType &>()))>::type;

    bool evenlyDistributed = true;
    bool shortIdCollision = false;
    bool outOfBoundIndex = false;

    std::vector<ItemType> itemsAvailable;
    std::vector<bool> haveItem;
    std::unordered_map<uint64_t, uint32_t> shortIdIndexMap;

    int addItem(uint32_t index, const ItemType &item) {
        if (index >= itemsAvailable.size()) {
            outOfBoundIndex = true;
            return 0;
        }

        if (!haveItem[index]) {
            haveItem[index] = true;
            itemsAvailable[index] = item;
            return 1;
        }

        // If we find two items that collides for the same index, just request
        // this index. This should be rare enough that the extra bandwidth
        // doesn't matter. Due to the way the compact messages are encoded, this
        // can only occur in the event of a shortid collision.
        if (itemsAvailable[index] && !(*this)(itemsAvailable[index], item)) {
            itemsAvailable[index] = ItemType();
            return -1;
        }

        return 0;
    }

public:
    ShortIdProcessor(const std::vector<PrefilledItemType> &prefilledItems,
                     const std::vector<uint64_t> &shortids,
                     size_t maxShortIdPerBucket)
        : itemsAvailable(prefilledItems.size() + shortids.size()),
          haveItem(prefilledItems.size() + shortids.size()),
          shortIdIndexMap(shortids.size()) {
        for (const auto &prefilledItem : prefilledItems) {
            addItem(Adapter::getIndex(prefilledItem),
                    Adapter::getItem(prefilledItem));
        }

        uint32_t index_offset = 0;
        for (size_t i = 0; i < shortids.size(); i++) {
            while (itemsAvailable[i + index_offset]) {
                index_offset++;
            }

            shortIdIndexMap[shortids[i]] = i + index_offset;

            // Because well-formed compact messages will have a (relatively)
            // uniform distribution of short IDs, any highly-uneven distribution
            // of elements can be safely treated as an error.
            if (shortIdIndexMap.bucket_size(shortIdIndexMap.bucket(
                    shortids[i])) > maxShortIdPerBucket) {
                evenlyDistributed = false;
            }
        }

        shortIdCollision = shortIdIndexMap.size() != shortids.size();
    }

    /** Status accessors */
    bool isEvenlyDistributed() const { return evenlyDistributed; }
    bool hasShortIdCollision() const { return shortIdCollision; }
    bool hasOutOfBoundIndex() const { return outOfBoundIndex; }

    /** Total item count */
    size_t getItemCount() const { return itemsAvailable.size(); }
    /** Unique shortid count */
    size_t getShortIdCount() const { return shortIdIndexMap.size(); }

    /**
     * Attempts to add a known item by matching its shortid with the supplied
     * ones. The shortids must be processed prior from calling this method.
     *
     * @param[in] shortid The shortid of the item
     * @param[in] item    The item to be added, whose index is retrieved from
     *                    its shortid
     *
     * @return int The number of added items:
     *  * 0 if it was not added (e.g. index out of bounds).
     *  * +1 if added successfully.
     *  * -1 if an existing item was removed due to collision.
     */
    int matchKnownItem(uint64_t shortid, const ItemType &item) {
        auto idit = shortIdIndexMap.find(shortid);
        if (idit == shortIdIndexMap.end()) {
            return 0;
        }

        return addItem(idit->second, item);
    }

    const ItemType &getItem(size_t index) const {
        assert(index < itemsAvailable.size());

        return itemsAvailable[index];
    }
};

#endif // BITCOIN_SHORTIDPROCESSOR_H
