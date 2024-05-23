// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_RADIX_H
#define BITCOIN_RADIX_H

#include <common/system.h>
#include <rcu.h>

#include <array>
#include <atomic>
#include <cstdint>
#include <memory>
#include <type_traits>

template <typename T> struct PassthroughAdapter {
    auto &&getId(const T &e) const { return e.getId(); }
};

/**
 * This is a radix tree storing values identified by a unique key.
 *
 * The tree is composed of nodes (RadixNode) containing an array of
 * RadixElement. The key is split into chunks of a few bits that serve as an
 * index into that array. RadixElement is a discriminated union of either a
 * RadixNode* representing the next level in the tree, or a T* representing a
 * leaf. New RadixNode are added lazily when two leaves would go in the same
 * slot.
 *
 * Reads walk the tree using sequential atomic loads, and insertions are done
 * using CAS, which ensures both can be executed lock free. Removing any
 * elements from the tree can also be done using CAS, but requires waiting for
 * other readers before being destroyed. The tree uses RCU to track which thread
 * is reading the tree, which allows deletion to wait for other readers to be up
 * to speed before destroying anything. It is therefore crucial that the lock be
 * taken before reading anything in the tree.
 */
template <typename T, typename Adapter = PassthroughAdapter<T>>
struct RadixTree : private Adapter {
private:
    static const int BITS = 4;
    static const int MASK = (1 << BITS) - 1;
    static const size_t CHILD_PER_LEVEL = 1 << BITS;

    using KeyType =
        typename std::remove_reference<decltype(std::declval<Adapter &>().getId(
            std::declval<T &>()))>::type;
    static const size_t KEY_BITS = 8 * sizeof(KeyType);
    static const uint32_t TOP_LEVEL = (KEY_BITS - 1) / BITS;

    struct RadixElement;
    struct RadixNode;

    std::atomic<RadixElement> root;

public:
    RadixTree() : root(RadixElement()) {}
    ~RadixTree() { root.load().decrementRefCount(); }

    /**
     * Copy semantic.
     */
    RadixTree(const RadixTree &src) : RadixTree() {
        {
            RCULock lock;
            RadixElement e = src.root.load();
            e.incrementRefCount();
            root = e;
        }

        // Make sure we the writes in the tree are behind us so
        // this copy won't mutate behind our back.
        RCULock::synchronize();
    }

    RadixTree &operator=(const RadixTree &rhs) {
        {
            RCULock lock;
            RadixElement e = rhs.root.load();
            e.incrementRefCount();
            root.load().decrementRefCount();
            root = e;
        }

        // Make sure we the writes in the tree are behind us so
        // this copy won't mutate behind our back.
        RCULock::synchronize();

        return *this;
    }

    /**
     * Move semantic.
     */
    RadixTree(RadixTree &&src) : RadixTree() { *this = std::move(src); }
    RadixTree &operator=(RadixTree &&rhs) {
        {
            RCULock lock;
            RadixElement e = rhs.root.load();
            rhs.root = root.load();
            root = e;
        }

        return *this;
    }

    /**
     * Insert a value into the tree.
     * Returns true if the value was inserted, false if it was already present.
     */
    bool insert(const RCUPtr<T> &value) { return insert(getId(*value), value); }

    /**
     * Get the value corresponding to a key.
     * Returns the value if found, nullptr if not.
     */
    RCUPtr<T> get(const KeyType &key) {
        uint32_t level = TOP_LEVEL;

        RCULock lock;
        RadixElement e = root.load();

        // Find a leaf.
        while (e.isNode()) {
            e = e.getNode()->get(level--, key)->load();
        }

        T *leaf = e.getLeaf();
        if (leaf == nullptr || getId(*leaf) != key) {
            // We failed to find the proper element.
            return RCUPtr<T>();
        }

        // The leaf is non-null and the keys match. We have our guy.
        return RCUPtr<T>::copy(leaf);
    }

    RCUPtr<const T> get(const KeyType &key) const {
        T const *ptr = const_cast<RadixTree *>(this)->get(key).release();
        return RCUPtr<const T>::acquire(ptr);
    }

    template <typename Callable> bool forEachLeaf(Callable &&func) const {
        RCULock lock;
        return forEachLeaf(root.load(), std::move(func));
    }

#define SEEK_LEAF_LOOP()                                                       \
    RadixElement e = eptr->load();                                             \
                                                                               \
    /* Walk down the tree until we find a leaf for our node. */                \
    do {                                                                       \
        while (e.isNode()) {                                                   \
        Node:                                                                  \
            auto nptr = e.getNode();                                           \
            if (!nptr->isShared()) {                                           \
                eptr = nptr->get(level--, key);                                \
                e = eptr->load();                                              \
                continue;                                                      \
            }                                                                  \
                                                                               \
            auto copy = std::make_unique<RadixNode>(*nptr);                    \
            if (!eptr->compare_exchange_strong(e, RadixElement(copy.get()))) { \
                /* We failed to insert our subtree, just try again. */         \
                continue;                                                      \
            }                                                                  \
                                                                               \
            /* We have a subtree, resume normal operations from there. */      \
            e.decrementRefCount();                                             \
            eptr = copy->get(level--, key);                                    \
            e = eptr->load();                                                  \
            copy.release();                                                    \
        }                                                                      \
    } while (0)

    /**
     * Remove an element from the tree.
     * Returns the removed element, or nullptr if there isn't one.
     */
    RCUPtr<T> remove(const KeyType &key) {
        uint32_t level = TOP_LEVEL;

        RCULock lock;
        std::atomic<RadixElement> *eptr = &root;

        SEEK_LEAF_LOOP();

        T *leaf = e.getLeaf();
        if (leaf == nullptr || getId(*leaf) != key) {
            // We failed to find the proper element.
            return RCUPtr<T>();
        }

        // We have the proper element, try to delete it.
        if (eptr->compare_exchange_strong(e, RadixElement())) {
            return RCUPtr<T>::acquire(leaf);
        }

        // The element was replaced, either by a subtree or another element.
        if (e.isNode()) {
            goto Node;
        }

        // The element in the slot is not the one we are looking for.
        return RCUPtr<T>();
    }

private:
    KeyType getId(const T &value) const { return Adapter::getId(value); }

    bool insert(const KeyType &key, RCUPtr<T> value) {
        uint32_t level = TOP_LEVEL;

        RCULock lock;
        std::atomic<RadixElement> *eptr = &root;

        while (true) {
            SEEK_LEAF_LOOP();

            // If the slot is empty, try to insert right there.
            if (e.getLeaf() == nullptr) {
                if (eptr->compare_exchange_strong(e,
                                                  RadixElement(value.get()))) {
                    value.release();
                    return true;
                }

                // CAS failed, we may have a node in there now.
                if (e.isNode()) {
                    goto Node;
                }
            }

            // The element was already in the tree.
            const KeyType &leafKey = getId(*e.getLeaf());
            if (key == leafKey) {
                return false;
            }

            // There is an element there, but it isn't a subtree. We need to
            // convert it into a subtree and resume insertion into that subtree.
            auto newChild = std::make_unique<RadixNode>(level, leafKey, e);
            if (eptr->compare_exchange_strong(e,
                                              RadixElement(newChild.get()))) {
                // We have a subtree, resume normal operations from there.
                newChild.release();
            } else {
                // We failed to insert our subtree, clean it before it is freed.
                newChild->get(level, leafKey)->store(RadixElement());
            }
        }
    }

#undef SEEK_LEAF_LOOP

    template <typename Callable>
    bool forEachLeaf(RadixElement e, Callable &&func) const {
        if (e.isLeaf()) {
            T *leaf = e.getLeaf();
            if (leaf != nullptr) {
                return func(RCUPtr<T>::copy(leaf));
            }

            return true;
        }

        return e.getNode()->forEachChild(
            [&](const std::atomic<RadixElement> *pElement) {
                return forEachLeaf(pElement->load(), func);
            });
    }

    struct RadixElement {
    private:
        union {
            RadixNode *node;
            T *leaf;
            uintptr_t raw;
        };

        static const uintptr_t DISCRIMINANT = 0x01;
        bool getDiscriminant() const { return (raw & DISCRIMINANT) != 0; }

    public:
        explicit RadixElement() noexcept : raw(DISCRIMINANT) {}
        explicit RadixElement(RadixNode *nodeIn) noexcept : node(nodeIn) {}
        explicit RadixElement(T *leafIn) noexcept : leaf(leafIn) {
            raw |= DISCRIMINANT;
        }

        /**
         * RadixElement is designed to be a dumb wrapper. This allows any
         * container to release what is held by the RadixElement.
         */
        void incrementRefCount() {
            if (isNode()) {
                RCUPtr<RadixNode>::copy(getNode()).release();
            } else {
                RCUPtr<T>::copy(getLeaf()).release();
            }
        }

        void decrementRefCount() {
            if (isNode()) {
                RadixNode *ptr = getNode();
                RCUPtr<RadixNode>::acquire(ptr);
            } else {
                T *ptr = getLeaf();
                RCUPtr<T>::acquire(ptr);
            }
        }

        /**
         * Node features.
         */
        bool isNode() const { return !getDiscriminant(); }

        RadixNode *getNode() {
            assert(isNode());
            return node;
        }

        const RadixNode *getNode() const {
            assert(isNode());
            return node;
        }

        /**
         * Leaf features.
         */
        bool isLeaf() const { return getDiscriminant(); }

        T *getLeaf() {
            assert(isLeaf());
            return reinterpret_cast<T *>(raw & ~DISCRIMINANT);
        }

        const T *getLeaf() const {
            assert(isLeaf());
            return const_cast<RadixElement *>(this)->getLeaf();
        }
    };

    struct RadixNode {
        IMPLEMENT_RCU_REFCOUNT(uint64_t);

    private:
        union {
            std::array<std::atomic<RadixElement>, CHILD_PER_LEVEL> children;
            std::array<RadixElement, CHILD_PER_LEVEL>
                non_atomic_children_DO_NOT_USE;
        };

    public:
        RadixNode(uint32_t level, const KeyType &key, RadixElement e)
            : non_atomic_children_DO_NOT_USE() {
            get(level, key)->store(e);
        }

        ~RadixNode() {
            for (RadixElement e : non_atomic_children_DO_NOT_USE) {
                e.decrementRefCount();
            }
        }

        RadixNode(const RadixNode &rhs) : non_atomic_children_DO_NOT_USE() {
            for (size_t i = 0; i < CHILD_PER_LEVEL; i++) {
                auto e = rhs.children[i].load();
                e.incrementRefCount();
                non_atomic_children_DO_NOT_USE[i] = e;
            }
        }

        RadixNode &operator=(const RadixNode &) = delete;

        std::atomic<RadixElement> *get(uint32_t level, const KeyType &key) {
            return &children[(key >> uint32_t(level * BITS)) & MASK];
        }

        bool isShared() const { return refcount > 0; }

        template <typename Callable> bool forEachChild(Callable &&func) const {
            for (size_t i = 0; i < CHILD_PER_LEVEL; i++) {
                if (!func(&children[i])) {
                    return false;
                }
            }
            return true;
        }
    };

    // Make sure the alignment works for T and RadixElement.
    static_assert(alignof(T) > 1, "T's alignment must be 2 or more.");
    static_assert(alignof(RadixNode) > 1,
                  "RadixNode alignment must be 2 or more.");
};

#endif // BITCOIN_RADIX_H
