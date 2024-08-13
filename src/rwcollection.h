// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RWCOLLECTION_H
#define BITCOIN_RWCOLLECTION_H

#include <threadsafety.h>

#include <boost/range/iterator.hpp>

#include <iterator>
#include <shared_mutex>
#include <type_traits>
#include <utility>

template <typename T, typename L> class RWCollectionView {
private:
    L lock;
    T *collection;

    template <typename I> struct BracketType {
        using type = decltype(std::declval<T &>()[std::declval<I>()]);
    };

public:
    RWCollectionView(L l, T &c) : lock(std::move(l)), collection(&c) {}
    RWCollectionView(RWCollectionView &&other)
        : lock(std::move(other.lock)), collection(other.collection) {}

    RWCollectionView(const RWCollectionView &) = delete;
    const RWCollectionView &operator=(const RWCollectionView) = delete;

    T *operator->() { return collection; }
    const T *operator->() const { return collection; }

    /**
     * Iterator mechanics.
     */
    using iterator = typename boost::range_iterator<T>::type;
    iterator begin() { return std::begin(*collection); }
    iterator end() { return std::end(*collection); }
    std::reverse_iterator<iterator> rbegin() {
        return std::rbegin(*collection);
    }
    std::reverse_iterator<iterator> rend() { return std::rend(*collection); }

    using const_iterator = typename boost::range_iterator<const T>::type;
    const_iterator begin() const { return std::begin(*collection); }
    const_iterator end() const { return std::end(*collection); }
    std::reverse_iterator<const_iterator> rbegin() const {
        return std::rbegin(*collection);
    }
    std::reverse_iterator<const_iterator> rend() const {
        return std::rend(*collection);
    }

    /**
     * Forward bracket operator.
     */
    template <typename I> typename BracketType<I>::type operator[](I &&index) {
        return (*collection)[std::forward<I>(index)];
    }
};

template <typename T> class RWCollection {
private:
    T collection;
    mutable std::shared_mutex rwmutex;

public:
    RWCollection() : collection() {}

    using ReadView =
        RWCollectionView<const T, std::shared_lock<std::shared_mutex>>;
    ReadView getReadView() const {
        return ReadView(std::shared_lock<std::shared_mutex>(rwmutex),
                        collection);
    }

    using WriteView = RWCollectionView<T, std::unique_lock<std::shared_mutex>>;
    WriteView getWriteView() {
        return WriteView(std::unique_lock<std::shared_mutex>(rwmutex),
                         collection);
    }
};

#endif // BITCOIN_RWCOLLECTION_H
