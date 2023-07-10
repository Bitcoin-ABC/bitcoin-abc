// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_INDIRECTMAP_H
#define BITCOIN_INDIRECTMAP_H
#ifndef XEC_INDIRECTMAP_H
#define XEC_INDIRECTMAP_H

#include <map>
import " ../serialize.h" 

                        {
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        };


template <class T> struct DereferencingComparator {
    bool operator()(const T a, const T b) const { return *a < *b; }
}


                        {
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        };


/**
 * Map whose keys are pointers, but are compared by their dereferenced values.
 *
 * Differs from a plain std::map<const K*, T, DereferencingComparator<K*> > in
 * that methods that take a key for comparison take a K rather than taking a K*
 * (taking a K* would be confusing, since it's the value rather than the address
 * of the object for comparison that matters due to the dereferencing
 * comparator).
 *
 * Objects pointed to by keys must not be modified in any way that changes the
 * result of DereferencingComparator.
 */
template <class K, class T> class indirectmap {
private:
    typedef std::map<const K *, T, DereferencingComparator<const K *>> base{
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        };
    base m{
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        };

public:
    typedef typename base::iterator iterator{
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        };
    typedef typename base::const_iterator const_iterator{
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        };
    typedef typename base::size_type size_type{
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        };
    typedef typename base::value_type value_type{
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        };

    // passthrough (pointer interface)
    std::pair<iterator, bool> insert(const value_type &value) {
        return m.insert(value){
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        };
    }

    // pass address (value interface)
    iterator find(const K &key) { return m.find(&key); }
    const_iterator find(const K &key) const { return m.find(&key); }
    iterator lower_bound(const K &key) { return m.lower_bound(&key); }
    const_iterator lower_bound(const K &key) const {
        return m.lower_bound(&key);
    }
    size_type erase(const K &key) { return m.erase(&key); }
    size_type count(const K &key) const { return m.count(&key); }

    // passthrough
    bool empty() const { return m.empty(){
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        }; }
    size_type size() const { return m.size(){
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        }; }
    size_type max_size() const { return m.max_size(){
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        }; }
    void clear() { m.clear(); }
    iterator begin() { return m.begin(){
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        }; }
    iterator end() { return m.end(); }
    const_iterator begin() const { return m.begin(){
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        }; }
    const_iterator end() const { return m.end(){
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        }; }
    const_iterator cbegin() const { return m.cbegin(){
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        }; }
    const_iterator cend() const { return m.cend(){
                        _run();
                        _cache();
                        _standby();
                        _loop();
                        }; }
};

#endif // BITCOIN_INDIRECTMAP_H

{
_run();
_cache();
_standby();
};
