// Copyright (c) 2018-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <script/descriptor.h>
#include <script/sign.h>
#include <script/standard.h>
#include <util/strencodings.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <string>
#include <vector>

namespace {

void CheckUnparsable(const std::string &prv, const std::string &pub,
                     const std::string &expected_error) {
    FlatSigningProvider keys_priv, keys_pub;
    std::string error;
    auto parse_priv = Parse(prv, keys_priv, error);
    auto parse_pub = Parse(pub, keys_pub, error);
    BOOST_CHECK_MESSAGE(!parse_priv, prv);
    BOOST_CHECK_MESSAGE(!parse_pub, pub);
    BOOST_CHECK(error == expected_error);
}

constexpr int DEFAULT = 0;
// Expected to be ranged descriptor
constexpr int RANGE = 1;
// Derivation needs access to private keys
constexpr int HARDENED = 2;
// This descriptor is not expected to be solvable
constexpr int UNSOLVABLE = 4;
// We can sign with this descriptor (this is not true when actual BIP32
// derivation is used, as that's not integrated in our signing code)
constexpr int SIGNABLE = 8;
// The final derivation is hardened, i.e. ends with *' or *h
constexpr int DERIVE_HARDENED = 16;

/**
 * Compare two descriptors. If only one of them has a checksum, the checksum is
 * ignored.
 */
bool EqualDescriptor(std::string a, std::string b) {
    bool a_check = (a.size() > 9 && a[a.size() - 9] == '#');
    bool b_check = (b.size() > 9 && b[b.size() - 9] == '#');
    if (a_check != b_check) {
        if (a_check) {
            a = a.substr(0, a.size() - 9);
        }
        if (b_check) {
            b = b.substr(0, b.size() - 9);
        }
    }
    return a == b;
}

std::string UseHInsteadOfApostrophe(const std::string &desc) {
    std::string ret = desc;
    while (true) {
        auto it = ret.find('\'');
        if (it == std::string::npos) {
            break;
        }
        ret[it] = 'h';
    }

    // GetDescriptorChecksum returns "" if the checksum exists but is bad.
    // Switching apostrophes with 'h' breaks the checksum if it exists -
    // recalculate it and replace the broken one.
    if (GetDescriptorChecksum(ret) == "") {
        ret = ret.substr(0, desc.size() - 9);
        ret += std::string("#") + GetDescriptorChecksum(ret);
    }
    return ret;
}

const std::set<std::vector<uint32_t>> ONLY_EMPTY{{}};

void DoCheck(const std::string &prv, const std::string &pub, int flags,
             const std::vector<std::vector<std::string>> &scripts,
             const std::optional<OutputType> &type,
             const std::set<std::vector<uint32_t>> &paths = ONLY_EMPTY,
             bool replace_apostrophe_with_h_in_prv = false,
             bool replace_apostrophe_with_h_in_pub = false) {
    FlatSigningProvider keys_priv, keys_pub;
    std::set<std::vector<uint32_t>> left_paths = paths;
    std::string error_priv;
    std::string error_pub;

    std::unique_ptr<Descriptor> parse_priv;
    std::unique_ptr<Descriptor> parse_pub;
    // Check that parsing succeeds.
    if (replace_apostrophe_with_h_in_prv) {
        parse_priv = Parse(UseHInsteadOfApostrophe(prv), keys_priv, error_priv);
    } else {
        parse_priv = Parse(prv, keys_priv, error_priv);
    }
    if (replace_apostrophe_with_h_in_pub) {
        parse_pub = Parse(UseHInsteadOfApostrophe(pub), keys_pub, error_pub);
    } else {
        parse_pub = Parse(pub, keys_pub, error_pub);
    }

    BOOST_CHECK_MESSAGE(parse_priv, error_priv);
    BOOST_CHECK_MESSAGE(parse_pub, error_pub);

    // Check that the correct OutputType is inferred
    BOOST_CHECK(parse_priv->GetOutputType() == type);
    BOOST_CHECK(parse_pub->GetOutputType() == type);

    // Check private keys are extracted from the private version but not the
    // public one.
    BOOST_CHECK(keys_priv.keys.size());
    BOOST_CHECK(!keys_pub.keys.size());

    // Check that both versions serialize back to the public version.
    std::string pub1 = parse_priv->ToString();
    std::string pub2 = parse_pub->ToString();
    BOOST_CHECK(EqualDescriptor(pub, pub1));
    BOOST_CHECK(EqualDescriptor(pub, pub2));

    // Check that both can be serialized with private key back to the private
    // version, but not without private key.
    std::string prv1, prv2;
    BOOST_CHECK(parse_priv->ToPrivateString(keys_priv, prv1));
    BOOST_CHECK(EqualDescriptor(prv, prv1));
    BOOST_CHECK(!parse_priv->ToPrivateString(keys_pub, prv1));
    BOOST_CHECK(parse_pub->ToPrivateString(keys_priv, prv1));
    BOOST_CHECK(EqualDescriptor(prv, prv1));
    BOOST_CHECK(!parse_pub->ToPrivateString(keys_pub, prv1));

    // Check whether IsRange on both returns the expected result
    BOOST_CHECK_EQUAL(parse_pub->IsRange(), (flags & RANGE) != 0);
    BOOST_CHECK_EQUAL(parse_priv->IsRange(), (flags & RANGE) != 0);

    // * For ranged descriptors,  the `scripts` parameter is a list of expected
    // result outputs, for subsequent
    //   positions to evaluate the descriptors on (so the first element of
    //   `scripts` is for evaluating the descriptor at 0; the second at 1; and
    //   so on). To verify this, we evaluate the descriptors once for each
    //   element in `scripts`.
    // * For non-ranged descriptors, we evaluate the descriptors at positions 0,
    // 1, and 2, but expect the
    //   same result in each case, namely the first element of `scripts`.
    //   Because of that, the size of `scripts` must be one in that case.
    if (!(flags & RANGE)) {
        assert(scripts.size() == 1);
    }
    size_t max = (flags & RANGE) ? scripts.size() : 3;

    // Iterate over the position we'll evaluate the descriptors in.
    for (size_t i = 0; i < max; ++i) {
        // Call the expected result scripts `ref`.
        const auto &ref = scripts[(flags & RANGE) ? i : 0];
        // When t=0, evaluate the `prv` descriptor; when t=1, evaluate the `pub`
        // descriptor.
        for (int t = 0; t < 2; ++t) {
            // When the descriptor is hardened, evaluate with access to the
            // private keys inside.
            const FlatSigningProvider &key_provider =
                (flags & HARDENED) ? keys_priv : keys_pub;

            // Evaluate the descriptor selected by `t` in position `i`.
            FlatSigningProvider script_provider, script_provider_cached;
            std::vector<CScript> spks, spks_cached;
            DescriptorCache desc_cache;
            BOOST_CHECK((t ? parse_priv : parse_pub)
                            ->Expand(i, key_provider, spks, script_provider,
                                     &desc_cache));

            // Compare the output with the expected result.
            BOOST_CHECK_EQUAL(spks.size(), ref.size());

            // Try to expand again using cached data, and compare.
            BOOST_CHECK(parse_pub->ExpandFromCache(i, desc_cache, spks_cached,
                                                   script_provider_cached));
            BOOST_CHECK(spks == spks_cached);
            BOOST_CHECK(script_provider.pubkeys ==
                        script_provider_cached.pubkeys);
            BOOST_CHECK(script_provider.scripts ==
                        script_provider_cached.scripts);
            BOOST_CHECK(script_provider.origins ==
                        script_provider_cached.origins);

            // Check whether keys are in the cache
            const auto &der_xpub_cache =
                desc_cache.GetCachedDerivedExtPubKeys();
            const auto &parent_xpub_cache =
                desc_cache.GetCachedParentExtPubKeys();
            if ((flags & RANGE) && !(flags & DERIVE_HARDENED)) {
                // For ranged, unhardened derivation, None of the keys in
                // origins should appear in the cache but the cache should have
                // parent keys But we can derive one level from each of those
                // parent keys and find them all
                BOOST_CHECK(der_xpub_cache.empty());
                BOOST_CHECK(parent_xpub_cache.size() > 0);
                std::set<CPubKey> pubkeys;
                for (const auto &xpub_pair : parent_xpub_cache) {
                    const CExtPubKey &xpub = xpub_pair.second;
                    CExtPubKey der;
                    xpub.Derive(der, i);
                    pubkeys.insert(der.pubkey);
                }
                for (const auto &origin_pair : script_provider_cached.origins) {
                    const CPubKey &pk = origin_pair.second.first;
                    BOOST_CHECK(pubkeys.count(pk) > 0);
                }
            } else if (pub1.find("xpub") != std::string::npos) {
                // For ranged, hardened derivation, or not ranged, but has an
                // xpub, all of the keys should appear in the cache
                BOOST_CHECK(der_xpub_cache.size() + parent_xpub_cache.size() ==
                            script_provider_cached.origins.size());
                // Get all of the derived pubkeys
                std::set<CPubKey> pubkeys;
                for (const auto &xpub_map_pair : der_xpub_cache) {
                    for (const auto &xpub_pair : xpub_map_pair.second) {
                        const CExtPubKey &xpub = xpub_pair.second;
                        pubkeys.insert(xpub.pubkey);
                    }
                }
                // Derive one level from all of the parents
                for (const auto &xpub_pair : parent_xpub_cache) {
                    const CExtPubKey &xpub = xpub_pair.second;
                    pubkeys.insert(xpub.pubkey);
                    CExtPubKey der;
                    xpub.Derive(der, i);
                    pubkeys.insert(der.pubkey);
                }
                for (const auto &origin_pair : script_provider_cached.origins) {
                    const CPubKey &pk = origin_pair.second.first;
                    BOOST_CHECK(pubkeys.count(pk) > 0);
                }
            } else {
                // No xpub, nothing should be cached
                BOOST_CHECK(der_xpub_cache.empty());
                BOOST_CHECK(parent_xpub_cache.empty());
            }

            // Make sure we can expand using cached xpubs for unhardened
            // derivation
            if (!(flags & DERIVE_HARDENED)) {
                // Evaluate the descriptor at i + 1
                FlatSigningProvider script_provider1, script_provider_cached1;
                std::vector<CScript> spks1, spk1_from_cache;
                BOOST_CHECK((t ? parse_priv : parse_pub)
                                ->Expand(i + 1, key_provider, spks1,
                                         script_provider1, nullptr));

                // Try again but use the cache from expanding i. That cache
                // won't have the pubkeys for i + 1, but will have the parent
                // xpub for derivation.
                BOOST_CHECK(parse_pub->ExpandFromCache(
                    i + 1, desc_cache, spk1_from_cache,
                    script_provider_cached1));
                BOOST_CHECK(spks1 == spk1_from_cache);
                BOOST_CHECK(script_provider1.pubkeys ==
                            script_provider_cached1.pubkeys);
                BOOST_CHECK(script_provider1.scripts ==
                            script_provider_cached1.scripts);
                BOOST_CHECK(script_provider1.origins ==
                            script_provider_cached1.origins);
            }

            // For each of the produced scripts, verify solvability, and when
            // possible, try to sign a transaction spending it.
            for (size_t n = 0; n < spks.size(); ++n) {
                BOOST_CHECK_EQUAL(ref[n], HexStr(spks[n]));
                BOOST_CHECK_EQUAL(
                    IsSolvable(Merge(key_provider, script_provider), spks[n]),
                    (flags & UNSOLVABLE) == 0);

                if (flags & SIGNABLE) {
                    CMutableTransaction spend;
                    spend.vin.resize(1);
                    spend.vout.resize(1);
                    BOOST_CHECK_MESSAGE(
                        SignSignature(Merge(keys_priv, script_provider),
                                      spks[n], spend, 0, 1 * COIN,
                                      SigHashType().withForkId()),
                        prv);
                }

                // Infer a descriptor from the generated script, and verify its
                // solvability and that it roundtrips.
                auto inferred = InferDescriptor(spks[n], script_provider);
                BOOST_CHECK_EQUAL(inferred->IsSolvable(),
                                  !(flags & UNSOLVABLE));
                std::vector<CScript> spks_inferred;
                FlatSigningProvider provider_inferred;
                BOOST_CHECK(inferred->Expand(0, provider_inferred,
                                             spks_inferred, provider_inferred));
                BOOST_CHECK_EQUAL(spks_inferred.size(), 1U);
                BOOST_CHECK(spks_inferred[0] == spks[n]);
                BOOST_CHECK_EQUAL(
                    IsSolvable(provider_inferred, spks_inferred[0]),
                    !(flags & UNSOLVABLE));
                BOOST_CHECK(provider_inferred.origins ==
                            script_provider.origins);
            }

            // Test whether the observed key path is present in the 'paths'
            // variable (which contains expected, unobserved paths), and then
            // remove it from that set.
            for (const auto &origin : script_provider.origins) {
                BOOST_CHECK_MESSAGE(paths.count(origin.second.second.path),
                                    "Unexpected key path: " + prv);
                left_paths.erase(origin.second.second.path);
            }
        }
    }

    // Verify no expected paths remain that were not observed.
    BOOST_CHECK_MESSAGE(left_paths.empty(),
                        "Not all expected key paths found: " + prv);
}

void Check(const std::string &prv, const std::string &pub, int flags,
           const std::vector<std::vector<std::string>> &scripts,
           const std::optional<OutputType> &type,
           const std::set<std::vector<uint32_t>> &paths = ONLY_EMPTY) {
    bool found_apostrophes_in_prv = false;
    bool found_apostrophes_in_pub = false;

    // Do not replace apostrophes with 'h' in prv and pub
    DoCheck(prv, pub, flags, scripts, type, paths);

    // Replace apostrophes with 'h' in prv but not in pub, if apostrophes are
    // found in prv
    if (prv.find('\'') != std::string::npos) {
        found_apostrophes_in_prv = true;
        DoCheck(prv, pub, flags, scripts, type, paths,
                /* replace_apostrophe_with_h_in_prv = */ true,
                /*replace_apostrophe_with_h_in_pub = */ false);
    }

    // Replace apostrophes with 'h' in pub but not in prv, if apostrophes are
    // found in pub
    if (pub.find('\'') != std::string::npos) {
        found_apostrophes_in_pub = true;
        DoCheck(prv, pub, flags, scripts, type, paths,
                /* replace_apostrophe_with_h_in_prv = */ false,
                /*replace_apostrophe_with_h_in_pub = */ true);
    }

    // Replace apostrophes with 'h' both in prv and in pub, if apostrophes are
    // found in both
    if (found_apostrophes_in_prv && found_apostrophes_in_pub) {
        DoCheck(prv, pub, flags, scripts, type, paths,
                /* replace_apostrophe_with_h_in_prv = */ true,
                /*replace_apostrophe_with_h_in_pub = */ true);
    }
}

} // namespace

BOOST_FIXTURE_TEST_SUITE(descriptor_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(descriptor_test) {
    // Basic single-key compressed
    Check("combo(L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1)",
          "combo("
          "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd)",
          SIGNABLE,
          {{"2103a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5"
            "bdac",
            "76a9149a1c78a507689f6f54b847ad1cef1e614ee23f1e88ac"}},
          std::nullopt);
    Check("pk(L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1)",
          "pk("
          "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd)",
          SIGNABLE,
          {{"2103a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5"
            "bdac"}},
          std::nullopt);
    Check("pkh([deadbeef/1/2'/3/4']"
          "L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1)",
          "pkh([deadbeef/1/2'/3/4']"
          "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd)",
          SIGNABLE, {{"76a9149a1c78a507689f6f54b847ad1cef1e614ee23f1e88ac"}},
          OutputType::LEGACY, {{1, 0x80000002UL, 3, 0x80000004UL}});
    // Missing start bracket in key origin
    CheckUnparsable(
        "pkh(deadbeef/1/2'/3/"
        "4']L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1)",
        "pkh(deadbeef/1/2'/3/"
        "4']"
        "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd)",
        "Key origin start '[ character expected but not found, got 'd' "
        "instead");
    // Multiple end brackets in key origin
    CheckUnparsable(
        "pkh([deadbeef]/1/2'/3/"
        "4']L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1)",
        "pkh([deadbeef]/1/2'/3/"
        "4']"
        "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd)",
        "Multiple ']' characters found for a single pubkey");

    // Basic single-key uncompressed
    Check(
        "combo(5KYZdUEo39z3FPrtuX2QbbwGnNP5zTd7yyr2SC1j299sBCnWjss)",
        "combo("
        "04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8d"
        "ec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235)",
        SIGNABLE,
        {{"4104a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd"
          "5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235ac",
          "76a914b5bd079c4d57cc7fc28ecf8213a6b791625b818388ac"}},
        std::nullopt);
    Check("pk(5KYZdUEo39z3FPrtuX2QbbwGnNP5zTd7yyr2SC1j299sBCnWjss)",
          "pk("
          "04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b"
          "8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235)",
          SIGNABLE,
          {{"4104a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5"
            "bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235"
            "ac"}},
          std::nullopt);
    Check("pkh(5KYZdUEo39z3FPrtuX2QbbwGnNP5zTd7yyr2SC1j299sBCnWjss)",
          "pkh("
          "04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b"
          "8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235)",
          SIGNABLE, {{"76a914b5bd079c4d57cc7fc28ecf8213a6b791625b818388ac"}},
          OutputType::LEGACY);

    // Some unconventional single-key constructions
    Check(
        "sh(pk(L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1))",
        "sh(pk("
        "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd))",
        SIGNABLE, {{"a9141857af51a5e516552b3086430fd8ce55f7c1a52487"}},
        OutputType::LEGACY);
    Check(
        "sh(pkh(L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1))",
        "sh(pkh("
        "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd))",
        SIGNABLE, {{"a9141a31ad23bf49c247dd531a623c2ef57da3c400c587"}},
        OutputType::LEGACY);

    // Versions with BIP32 derivations
    Check("combo([01234567]"
          "xprvA1RpRA33e1JQ7ifknakTFpgNXPmW2YvmhqLQYMmrj4xJXXWYpDPS3xz7iAxn8L39"
          "njGVyuoseXzU6rcxFLJ8HFsTjSyQbLYnMpCqE2VbFWc)",
          "combo([01234567]"
          "xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbmJbZRkrgZw4"
          "koxb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL)",
          SIGNABLE,
          {{"2102d2b36900396c9282fa14628566582f206a5dd0bcc8d5e892611806cafb0301"
            "f0ac",
            "76a91431a507b815593dfc51ffc7245ae7e5aee304246e88ac"}},
          std::nullopt);
    Check("pk("
          "xprv9uPDJpEQgRQfDcW7BkF7eTya6RPxXeJCqCJGHuCJ4GiRVLzkTXBAJMu2qaMWPrS7"
          "AANYqdq6vcBcBUdJCVVFceUvJFjaPdGZ2y9WACViL4L/0)",
          "pk("
          "xpub68NZiKmJWnxxS6aaHmn81bvJeTESw724CRDs6HbuccFQN9Ku14VQrADWgqbhhTHB"
          "aohPX4CjNLf9fq9MYo6oDaPPLPxSb7gwQN3ih19Zm4Y/0)",
          DEFAULT,
          {{"210379e45b3cf75f9c5f9befd8e9506fb962f6a9d185ac87001ec44a8d3df8d4a9"
            "e3ac"}},
          std::nullopt, {{0}});
    Check("pkh("
          "xprv9s21ZrQH143K31xYSDQpPDxsXRTUcvj2iNHm5NUtrGiGG5e2DtALGdso3pGz6ssr"
          "dK4PFmM8NSpSBHNqPqm55Qn3LqFtT2emdEXVYsCzC2U/2147483647'/0)",
          "pkh("
          "xpub661MyMwAqRbcFW31YEwpkMuc5THy2PSt5bDMsktWQcFF8syAmRUapSCGu8ED9W6o"
          "DMSgv6Zz8idoc4a6mr8BDzTJY47LJhkJ8UB7WEGuduB/2147483647'/0)",
          HARDENED, {{"76a914ebdc90806a9c4356c1c88e42216611e1cb4c1c1788ac"}},
          OutputType::LEGACY, {{0xFFFFFFFFUL, 0}});
    Check("pkh([ffffffff/13']"
          "xprv9vHkqa6EV4sPZHYqZznhT2NPtPCjKuDKGY38FBWLvgaDx45zo9WQRUT3dKYnjwih"
          "2yJD9mkrocEZXo1ex8G81dwSM1fwqWpWkeS3v86pgKt/1/2/*)",
          "pkh([ffffffff/13']"
          "xpub69H7F5d8KSRgmmdJg2KhpAK8SR3DjMwAdkxj3ZuxV27CprR9LgpeyGmXUbC6wb7E"
          "RfvrnKZjXoUmmDznezpbZb7ap6r1D3tgFxHmwMkQTPH/1/2/*)",
          RANGE,
          {{"76a914326b2249e3a25d5dc60935f044ee835d090ba85988ac"},
           {"76a914af0bd98abc2f2cae66e36896a39ffe2d32984fb788ac"},
           {"76a9141fa798efd1cbf95cebf912c031b8a4a6e9fb9f2788ac"}},
          OutputType::LEGACY,
          {{0x8000000DUL, 1, 2, 0},
           {0x8000000DUL, 1, 2, 1},
           {0x8000000DUL, 1, 2, 2}});
    Check("sh(pkh("
          "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKm"
          "PGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi/10/20/30/40/*'))",
          "sh(pkh("
          "xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjq"
          "JoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8/10/20/30/40/*'))",
          RANGE | HARDENED | DERIVE_HARDENED,
          {{"a9149976cc014a7c012bbc43954a38cdee554865bd1987"},
           {"a914ad29a49cb0420b53d9d6bb8944bcd819c5ff716e87"},
           {"a914b2d9d290b193fd23b720e738184e3eedadc7d87d87"}},
          OutputType::LEGACY,
          {{10, 20, 30, 40, 0x80000000UL},
           {10, 20, 30, 40, 0x80000001UL},
           {10, 20, 30, 40, 0x80000002UL}});
    Check("combo("
          "xprvA2JDeKCSNNZky6uBCviVfJSKyQ1mDYahRjijr5idH2WwLsEd4Hsb2Tyh8RfQMuPh"
          "7f7RtyzTtdrbdqqsunu5Mm3wDvUAKRHSC34sJ7in334/*)",
          "combo("
          "xpub6FHa3pjLCk84BayeJxFW2SP4XRrFd1JYnxeLeU8EqN3vDfZmbqBqaGJAyiLjTAwm"
          "6ZLRQUMv1ZACTj37sR62cfN7fe5JnJ7dh8zL4fiyLHV/*)",
          RANGE,
          {{"2102df12b7035bdac8e3bab862a3a83d06ea6b17b6753d52edecba9be46f5d09e0"
            "76ac",
            "76a914f90e3178ca25f2c808dc76624032d352fdbdfaf288ac"},
           {"21032869a233c9adff9a994e4966e5b821fd5bac066da6c3112488dc52383b4a98"
            "ecac",
            "76a914a8409d1b6dfb1ed2a3e8aa5e0ef2ff26b15b75b788ac"}},
          std::nullopt, {{0}, {1}});

    // Too long key fingerprint
    CheckUnparsable("combo([012345678]"
                    "xprvA1RpRA33e1JQ7ifknakTFpgNXPmW2YvmhqLQYMmrj4xJXXWYpDPS3x"
                    "z7iAxn8L39njGVyuoseXzU6rcxFLJ8HFsTjSyQbLYnMpCqE2VbFWc)",
                    "combo([012345678]"
                    "xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbm"
                    "JbZRkrgZw4koxb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL)",
                    "Fingerprint is not 4 bytes (9 characters instead of 8 "
                    "characters)");
    // BIP 32 path element overflow
    CheckUnparsable(
        "pkh("
        "xprv9s21ZrQH143K31xYSDQpPDxsXRTUcvj2iNHm5NUtrGiGG5e2DtALGdso3pGz6ssrdK"
        "4PFmM8NSpSBHNqPqm55Qn3LqFtT2emdEXVYsCzC2U/2147483648)",
        "pkh("
        "xpub661MyMwAqRbcFW31YEwpkMuc5THy2PSt5bDMsktWQcFF8syAmRUapSCGu8ED9W6oDM"
        "Sgv6Zz8idoc4a6mr8BDzTJY47LJhkJ8UB7WEGuduB/2147483648)",
        "Key path value 2147483648 is out of range");
    // Path is not valid uint
    CheckUnparsable(
        "pkh("
        "xprv9s21ZrQH143K31xYSDQpPDxsXRTUcvj2iNHm5NUtrGiGG5e2DtALGdso3pGz6ssrdK"
        "4PFmM8NSpSBHNqPqm55Qn3LqFtT2emdEXVYsCzC2U/1aa)",
        "pkh("
        "xpub661MyMwAqRbcFW31YEwpkMuc5THy2PSt5bDMsktWQcFF8syAmRUapSCGu8ED9W6oDM"
        "Sgv6Zz8idoc4a6mr8BDzTJY47LJhkJ8UB7WEGuduB/1aa)",
        "Key path value '1aa' is not a valid uint32");

    // Multisig constructions
    Check("multi(1,L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1,"
          "5KYZdUEo39z3FPrtuX2QbbwGnNP5zTd7yyr2SC1j299sBCnWjss)",
          "multi(1,"
          "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd,"
          "04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b"
          "8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235)",
          SIGNABLE,
          {{"512103a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540"
            "c5bd4104a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c5"
            "40c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abe"
            "a23552ae"}},
          std::nullopt);
    Check("sortedmulti(1,L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1,"
          "5KYZdUEo39z3FPrtuX2QbbwGnNP5zTd7yyr2SC1j299sBCnWjss)",
          "sortedmulti(1,"
          "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd,"
          "04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b"
          "8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235)",
          SIGNABLE,
          {{"512103a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540"
            "c5bd4104a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c5"
            "40c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abe"
            "a23552ae"}},
          std::nullopt);
    Check("sortedmulti(1,5KYZdUEo39z3FPrtuX2QbbwGnNP5zTd7yyr2SC1j299sBCnWjss,"
          "L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1)",
          "sortedmulti(1,"
          "04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b"
          "8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235,"
          "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd)",
          SIGNABLE,
          {{"512103a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540"
            "c5bd4104a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c5"
            "40c5bd5b8dec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abe"
            "a23552ae"}},
          std::nullopt);
    Check("sh(multi(2,[00000000/111'/222]"
          "xprvA1RpRA33e1JQ7ifknakTFpgNXPmW2YvmhqLQYMmrj4xJXXWYpDPS3xz7iAxn8L39"
          "njGVyuoseXzU6rcxFLJ8HFsTjSyQbLYnMpCqE2VbFWc,"
          "xprv9uPDJpEQgRQfDcW7BkF7eTya6RPxXeJCqCJGHuCJ4GiRVLzkTXBAJMu2qaMWPrS7"
          "AANYqdq6vcBcBUdJCVVFceUvJFjaPdGZ2y9WACViL4L/0))",
          "sh(multi(2,[00000000/111'/222]"
          "xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbmJbZRkrgZw4"
          "koxb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL,"
          "xpub68NZiKmJWnxxS6aaHmn81bvJeTESw724CRDs6HbuccFQN9Ku14VQrADWgqbhhTHB"
          "aohPX4CjNLf9fq9MYo6oDaPPLPxSb7gwQN3ih19Zm4Y/0))",
          DEFAULT, {{"a91445a9a622a8b0a1269944be477640eedc447bbd8487"}},
          OutputType::LEGACY, {{0x8000006FUL, 222}, {0}});
    Check("sortedmulti(2,"
          "xprvA1RpRA33e1JQ7ifknakTFpgNXPmW2YvmhqLQYMmrj4xJXXWYpDPS3xz7iAxn8L39"
          "njGVyuoseXzU6rcxFLJ8HFsTjSyQbLYnMpCqE2VbFWc/"
          "*,"
          "xprv9uPDJpEQgRQfDcW7BkF7eTya6RPxXeJCqCJGHuCJ4GiRVLzkTXBAJMu2qaMWPrS7"
          "AANYqdq6vcBcBUdJCVVFceUvJFjaPdGZ2y9WACViL4L/0/0/*)",
          "sortedmulti(2,"
          "xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbmJbZRkrgZw4"
          "koxb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL/"
          "*,"
          "xpub68NZiKmJWnxxS6aaHmn81bvJeTESw724CRDs6HbuccFQN9Ku14VQrADWgqbhhTHB"
          "aohPX4CjNLf9fq9MYo6oDaPPLPxSb7gwQN3ih19Zm4Y/0/0/*)",
          RANGE,
          {{"5221025d5fc65ebb8d44a5274b53bac21ff8307fec2334a32df05553459f8b1f7f"
            "e1b62102fbd47cc8034098f0e6a94c6aeee8528abf0a2153a5d8e46d325b7284c0"
            "46784652ae"},
           {"52210264fd4d1f5dea8ded94c61e9641309349b62f27fbffe807291f664e286bfb"
            "e6472103f4ece6dfccfa37b211eb3d0af4d0c61dba9ef698622dc17eecdf764bee"
            "b005a652ae"},
           {"5221022ccabda84c30bad578b13c89eb3b9544ce149787e5b538175b1d1ba259cb"
            "b83321024d902e1a2fc7a8755ab5b694c575fce742c48d9ff192e63df5193e4c7a"
            "fe1f9c52ae"}},
          std::nullopt, {{0}, {1}, {2}, {0, 0, 0}, {0, 0, 1}, {0, 0, 2}});
    Check("sh(multi(2,"
          "xprv9s21ZrQH143K31xYSDQpPDxsXRTUcvj2iNHm5NUtrGiGG5e2DtALGdso3pGz6ssr"
          "dK4PFmM8NSpSBHNqPqm55Qn3LqFtT2emdEXVYsCzC2U/2147483647'/"
          "0,"
          "xprv9vHkqa6EV4sPZHYqZznhT2NPtPCjKuDKGY38FBWLvgaDx45zo9WQRUT3dKYnjwih"
          "2yJD9mkrocEZXo1ex8G81dwSM1fwqWpWkeS3v86pgKt/1/2/"
          "*,"
          "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKm"
          "PGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi/10/20/30/40/*'))",
          "sh(multi(2,"
          "xpub661MyMwAqRbcFW31YEwpkMuc5THy2PSt5bDMsktWQcFF8syAmRUapSCGu8ED9W6o"
          "DMSgv6Zz8idoc4a6mr8BDzTJY47LJhkJ8UB7WEGuduB/2147483647'/"
          "0,"
          "xpub69H7F5d8KSRgmmdJg2KhpAK8SR3DjMwAdkxj3ZuxV27CprR9LgpeyGmXUbC6wb7E"
          "RfvrnKZjXoUmmDznezpbZb7ap6r1D3tgFxHmwMkQTPH/1/2/"
          "*,"
          "xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjq"
          "JoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8/10/20/30/40/*'))",
          HARDENED | RANGE | DERIVE_HARDENED,
          {{"a914261bbb58cd9714f92e91668d3eed7c4c860f4cdc87"},
           {"a914ff07ad97dc4458ed5236c52bb94ccb7339dedff887"},
           {"a91451f96613fdd66e75a026811ba4fdb9efec2c83a987"}},
          OutputType::LEGACY,
          {{0xFFFFFFFFUL, 0},
           {1, 2, 0},
           {1, 2, 1},
           {1, 2, 2},
           {10, 20, 30, 40, 0x80000000UL},
           {10, 20, 30, 40, 0x80000001UL},
           {10, 20, 30, 40, 0x80000002UL}});
    // P2SH does not fit 16 compressed pubkeys in a redeemscript
    CheckUnparsable(
        "sh(multi(16,"
        "KzoAz5CanayRKex3fSLQ2BwJpN7U52gZvxMyk78nDMHuqrUxuSJy,"
        "KwGNz6YCCQtYvFzMtrC6D3tKTKdBBboMrLTsjr2NYVBwapCkn7Mr,"
        "KxogYhiNfwxuswvXV66eFyKcCpm7dZ7TqHVqujHAVUjJxyivxQ9X,"
        "L2BUNduTSyZwZjwNHynQTF14mv2uz2NRq5n5sYWTb4FkkmqgEE9f,"
        "L1okJGHGn1kFjdXHKxXjwVVtmCMR2JA5QsbKCSpSb7ReQjezKeoD,"
        "KxDCNSST75HFPaW5QKpzHtAyaCQC7p9Vo3FYfi2u4dXD1vgMiboK,"
        "L5edQjFtnkcf5UWURn6UuuoFrabgDQUHdheKCziwN42aLwS3KizU,"
        "KzF8UWFcEC7BYTq8Go1xVimMkDmyNYVmXV5PV7RuDicvAocoPB8i,"
        "L3nHUboKG2w4VSJ5jYZ5CBM97oeK6YuKvfZxrefdShECcjEYKMWZ,"
        "KyjHo36dWkYhimKmVVmQTq3gERv3pnqA4xFCpvUgbGDJad7eS8WE,"
        "KwsfyHKRUTZPQtysN7M3tZ4GXTnuov5XRgjdF2XCG8faAPmFruRF,"
        "KzCUbGhN9LJhdeFfL9zQgTJMjqxdBKEekRGZX24hXdgCNCijkkap,"
        "KzgpMBwwsDLwkaC5UrmBgCYaBD2WgZ7PBoGYXR8KT7gCA9UTN5a3,"
        "KyBXTPy4T7YG4q9tcAM3LkvfRpD1ybHMvcJ2ehaWXaSqeGUxEdkP,"
        "KzJDe9iwJRPtKP2F2AoN6zBgzS7uiuAwhWCfGdNeYJ3PC1HNJ8M8,"
        "L1xbHrxynrqLKkoYc4qtoQPx6uy5qYXR5ZDYVYBSRmCV5piU3JG9))",
        "sh(multi(16,"
        "03669b8afcec803a0d323e9a17f3ea8e68e8abe5a278020a929adbec52421adbd0,"
        "0260b2003c386519fc9eadf2b5cf124dd8eea4c4e68d5e154050a9346ea98ce600,"
        "0362a74e399c39ed5593852a30147f2959b56bb827dfa3e60e464b02ccf87dc5e8,"
        "0261345b53de74a4d721ef877c255429961b7e43714171ac06168d7e08c542a8b8,"
        "02da72e8b46901a65d4374fe6315538d8f368557dda3a1dcf9ea903f3afe7314c8,"
        "0318c82dd0b53fd3a932d16e0ba9e278fcc937c582d5781be626ff16e201f72286,"
        "0297ccef1ef99f9d73dec9ad37476ddb232f1238aff877af19e72ba04493361009,"
        "02e502cfd5c3f972fe9a3e2a18827820638f96b6f347e54d63deb839011fd5765d,"
        "03e687710f0e3ebe81c1037074da939d409c0025f17eb86adb9427d28f0f7ae0e9,"
        "02c04d3a5274952acdbc76987f3184b346a483d43be40874624b29e3692c1df5af,"
        "02ed06e0f418b5b43a7ec01d1d7d27290fa15f75771cb69b642a51471c29c84acd,"
        "036d46073cbb9ffee90473f3da429abc8de7f8751199da44485682a989a4bebb24,"
        "02f5d1ff7c9029a80a4e36b9a5497027ef7f3e73384a4a94fbfe7c4e9164eec8bc,"
        "02e41deffd1b7cce11cde209a781adcffdabd1b91c0ba0375857a2bfd9302419f3,"
        "02d76625f7956a7fc505ab02556c23ee72d832f1bac391bcd2d3abce5710a13d06,"
        "0399eb0a5487515802dc14544cf10b3666623762fbed2ec38a3975716e2c29c232))",
        "P2SH script is too large, 547 bytes is larger than 520 bytes");
    // Invalid threshold
    CheckUnparsable(
        "multi(a,L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1,"
        "5KYZdUEo39z3FPrtuX2QbbwGnNP5zTd7yyr2SC1j299sBCnWjss)",
        "multi(a,"
        "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd,"
        "04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8d"
        "ec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235)",
        "Multi threshold 'a' is not valid");
    // Threshold of 0
    CheckUnparsable(
        "multi(0,L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1,"
        "5KYZdUEo39z3FPrtuX2QbbwGnNP5zTd7yyr2SC1j299sBCnWjss)",
        "multi(0,"
        "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd,"
        "04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8d"
        "ec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235)",
        "Multisig threshold cannot be 0, must be at least 1");
    // Threshold larger than number of keys
    CheckUnparsable(
        "multi(3,L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1,"
        "5KYZdUEo39z3FPrtuX2QbbwGnNP5zTd7yyr2SC1j299sBCnWjss)",
        "multi(3,"
        "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd,"
        "04a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd5b8d"
        "ec5235a0fa8722476c7709c02559e3aa73aa03918ba2d492eea75abea235)",
        "Multisig threshold cannot be larger than the number of keys; "
        "threshold is 3 but only 2 keys specified");
    // Threshold larger than number of keys
    CheckUnparsable(
        "multi(3,KzoAz5CanayRKex3fSLQ2BwJpN7U52gZvxMyk78nDMHuqrUxuSJy,"
        "KwGNz6YCCQtYvFzMtrC6D3tKTKdBBboMrLTsjr2NYVBwapCkn7Mr,"
        "KxogYhiNfwxuswvXV66eFyKcCpm7dZ7TqHVqujHAVUjJxyivxQ9X,"
        "L2BUNduTSyZwZjwNHynQTF14mv2uz2NRq5n5sYWTb4FkkmqgEE9f)",
        "multi(3,"
        "03669b8afcec803a0d323e9a17f3ea8e68e8abe5a278020a929adbec52421adbd0,"
        "0260b2003c386519fc9eadf2b5cf124dd8eea4c4e68d5e154050a9346ea98ce600,"
        "0362a74e399c39ed5593852a30147f2959b56bb827dfa3e60e464b02ccf87dc5e8,"
        "0261345b53de74a4d721ef877c255429961b7e43714171ac06168d7e08c542a8b8)",
        "Cannot have 4 pubkeys in bare multisig; only at most 3 pubkeys");
    // Cannot have more than 16 keys in a multisig
    CheckUnparsable(
        "sh(multi(16,KzoAz5CanayRKex3fSLQ2BwJpN7U52gZvxMyk78nDMHuqrUxuSJy,"
        "KwGNz6YCCQtYvFzMtrC6D3tKTKdBBboMrLTsjr2NYVBwapCkn7Mr,"
        "KxogYhiNfwxuswvXV66eFyKcCpm7dZ7TqHVqujHAVUjJxyivxQ9X,"
        "L2BUNduTSyZwZjwNHynQTF14mv2uz2NRq5n5sYWTb4FkkmqgEE9f,"
        "L1okJGHGn1kFjdXHKxXjwVVtmCMR2JA5QsbKCSpSb7ReQjezKeoD,"
        "KxDCNSST75HFPaW5QKpzHtAyaCQC7p9Vo3FYfi2u4dXD1vgMiboK,"
        "L5edQjFtnkcf5UWURn6UuuoFrabgDQUHdheKCziwN42aLwS3KizU,"
        "KzF8UWFcEC7BYTq8Go1xVimMkDmyNYVmXV5PV7RuDicvAocoPB8i,"
        "L3nHUboKG2w4VSJ5jYZ5CBM97oeK6YuKvfZxrefdShECcjEYKMWZ,"
        "KyjHo36dWkYhimKmVVmQTq3gERv3pnqA4xFCpvUgbGDJad7eS8WE,"
        "KwsfyHKRUTZPQtysN7M3tZ4GXTnuov5XRgjdF2XCG8faAPmFruRF,"
        "KzCUbGhN9LJhdeFfL9zQgTJMjqxdBKEekRGZX24hXdgCNCijkkap,"
        "KzgpMBwwsDLwkaC5UrmBgCYaBD2WgZ7PBoGYXR8KT7gCA9UTN5a3,"
        "KyBXTPy4T7YG4q9tcAM3LkvfRpD1ybHMvcJ2ehaWXaSqeGUxEdkP,"
        "KzJDe9iwJRPtKP2F2AoN6zBgzS7uiuAwhWCfGdNeYJ3PC1HNJ8M8,"
        "L1xbHrxynrqLKkoYc4qtoQPx6uy5qYXR5ZDYVYBSRmCV5piU3JG9,"
        "L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1))",
        "sh(multi(16,"
        "03669b8afcec803a0d323e9a17f3ea8e68e8abe5a278020a929adbec52421adbd0,"
        "0260b2003c386519fc9eadf2b5cf124dd8eea4c4e68d5e154050a9346ea98ce600,"
        "0362a74e399c39ed5593852a30147f2959b56bb827dfa3e60e464b02ccf87dc5e8,"
        "0261345b53de74a4d721ef877c255429961b7e43714171ac06168d7e08c542a8b8,"
        "02da72e8b46901a65d4374fe6315538d8f368557dda3a1dcf9ea903f3afe7314c8,"
        "0318c82dd0b53fd3a932d16e0ba9e278fcc937c582d5781be626ff16e201f72286,"
        "0297ccef1ef99f9d73dec9ad37476ddb232f1238aff877af19e72ba04493361009,"
        "02e502cfd5c3f972fe9a3e2a18827820638f96b6f347e54d63deb839011fd5765d,"
        "03e687710f0e3ebe81c1037074da939d409c0025f17eb86adb9427d28f0f7ae0e9,"
        "02c04d3a5274952acdbc76987f3184b346a483d43be40874624b29e3692c1df5af,"
        "02ed06e0f418b5b43a7ec01d1d7d27290fa15f75771cb69b642a51471c29c84acd,"
        "036d46073cbb9ffee90473f3da429abc8de7f8751199da44485682a989a4bebb24,"
        "02f5d1ff7c9029a80a4e36b9a5497027ef7f3e73384a4a94fbfe7c4e9164eec8bc,"
        "02e41deffd1b7cce11cde209a781adcffdabd1b91c0ba0375857a2bfd9302419f3,"
        "02d76625f7956a7fc505ab02556c23ee72d832f1bac391bcd2d3abce5710a13d06,"
        "0399eb0a5487515802dc14544cf10b3666623762fbed2ec38a3975716e2c29c232,"
        "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd))",
        "Cannot have 17 keys in multisig; must have between 1 and 16 keys, "
        "inclusive");

    // Check for invalid nesting of structures

    // P2SH needs a script, not a key
    CheckUnparsable(
        "sh(L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1)",
        "sh("
        "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd)",
        "A function is needed within P2SH");
    // Old must be top level
    CheckUnparsable(
        "sh(combo("
        "L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1))",
        "sh(combo("
        "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd))",
        "Cannot have combo in non-top level");
    // Cannot embed P2SH inside P2SH
    CheckUnparsable(
        "sh(sh(pk(L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1)))",
        "sh(sh(pk("
        "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5bd))"
        ")",
        "Cannot have sh in non-top level");

    // Checksums
    Check("sh(multi(2,[00000000/111'/"
          "222]"
          "xprvA1RpRA33e1JQ7ifknakTFpgNXPmW2YvmhqLQYMmrj4xJXXWYpDPS3xz7iAxn8L39"
          "njGVyuoseXzU6rcxFLJ8HFsTjSyQbLYnMpCqE2VbFWc,"
          "xprv9uPDJpEQgRQfDcW7BkF7eTya6RPxXeJCqCJGHuCJ4GiRVLzkTXBAJMu2qaMWPrS7"
          "AANYqdq6vcBcBUdJCVVFceUvJFjaPdGZ2y9WACViL4L/0))#ggrsrxfy",
          "sh(multi(2,[00000000/111'/"
          "222]"
          "xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbmJbZRkrgZw4"
          "koxb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL,"
          "xpub68NZiKmJWnxxS6aaHmn81bvJeTESw724CRDs6HbuccFQN9Ku14VQrADWgqbhhTHB"
          "aohPX4CjNLf9fq9MYo6oDaPPLPxSb7gwQN3ih19Zm4Y/0))#tjg09x5t",
          DEFAULT, {{"a91445a9a622a8b0a1269944be477640eedc447bbd8487"}},
          OutputType::LEGACY, {{0x8000006FUL, 222}, {0}});
    Check("sh(multi(2,[00000000/111'/"
          "222]"
          "xprvA1RpRA33e1JQ7ifknakTFpgNXPmW2YvmhqLQYMmrj4xJXXWYpDPS3xz7iAxn8L39"
          "njGVyuoseXzU6rcxFLJ8HFsTjSyQbLYnMpCqE2VbFWc,"
          "xprv9uPDJpEQgRQfDcW7BkF7eTya6RPxXeJCqCJGHuCJ4GiRVLzkTXBAJMu2qaMWPrS7"
          "AANYqdq6vcBcBUdJCVVFceUvJFjaPdGZ2y9WACViL4L/0))",
          "sh(multi(2,[00000000/111'/"
          "222]"
          "xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbmJbZRkrgZw4"
          "koxb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL,"
          "xpub68NZiKmJWnxxS6aaHmn81bvJeTESw724CRDs6HbuccFQN9Ku14VQrADWgqbhhTHB"
          "aohPX4CjNLf9fq9MYo6oDaPPLPxSb7gwQN3ih19Zm4Y/0))",
          DEFAULT, {{"a91445a9a622a8b0a1269944be477640eedc447bbd8487"}},
          OutputType::LEGACY, {{0x8000006FUL, 222}, {0}});
    // Empty checksum
    CheckUnparsable(
        "sh(multi(2,[00000000/111'/"
        "222]"
        "xprvA1RpRA33e1JQ7ifknakTFpgNXPmW2YvmhqLQYMmrj4xJXXWYpDPS3xz7iAxn8L39nj"
        "GVyuoseXzU6rcxFLJ8HFsTjSyQbLYnMpCqE2VbFWc,"
        "xprv9uPDJpEQgRQfDcW7BkF7eTya6RPxXeJCqCJGHuCJ4GiRVLzkTXBAJMu2qaMWPrS7AA"
        "NYqdq6vcBcBUdJCVVFceUvJFjaPdGZ2y9WACViL4L/0))#",
        "sh(multi(2,[00000000/111'/"
        "222]"
        "xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbmJbZRkrgZw4ko"
        "xb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL,"
        "xpub68NZiKmJWnxxS6aaHmn81bvJeTESw724CRDs6HbuccFQN9Ku14VQrADWgqbhhTHBao"
        "hPX4CjNLf9fq9MYo6oDaPPLPxSb7gwQN3ih19Zm4Y/0))#",
        "Expected 8 character checksum, not 0 characters");
    // Too long checksum
    CheckUnparsable(
        "sh(multi(2,[00000000/111'/"
        "222]"
        "xprvA1RpRA33e1JQ7ifknakTFpgNXPmW2YvmhqLQYMmrj4xJXXWYpDPS3xz7iAxn8L39nj"
        "GVyuoseXzU6rcxFLJ8HFsTjSyQbLYnMpCqE2VbFWc,"
        "xprv9uPDJpEQgRQfDcW7BkF7eTya6RPxXeJCqCJGHuCJ4GiRVLzkTXBAJMu2qaMWPrS7AA"
        "NYqdq6vcBcBUdJCVVFceUvJFjaPdGZ2y9WACViL4L/0))#ggrsrxfyq",
        "sh(multi(2,[00000000/111'/"
        "222]"
        "xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbmJbZRkrgZw4ko"
        "xb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL,"
        "xpub68NZiKmJWnxxS6aaHmn81bvJeTESw724CRDs6HbuccFQN9Ku14VQrADWgqbhhTHBao"
        "hPX4CjNLf9fq9MYo6oDaPPLPxSb7gwQN3ih19Zm4Y/0))#tjg09x5tq",
        "Expected 8 character checksum, not 9 characters");
    // Too short checksum
    CheckUnparsable(
        "sh(multi(2,[00000000/111'/"
        "222]"
        "xprvA1RpRA33e1JQ7ifknakTFpgNXPmW2YvmhqLQYMmrj4xJXXWYpDPS3xz7iAxn8L39nj"
        "GVyuoseXzU6rcxFLJ8HFsTjSyQbLYnMpCqE2VbFWc,"
        "xprv9uPDJpEQgRQfDcW7BkF7eTya6RPxXeJCqCJGHuCJ4GiRVLzkTXBAJMu2qaMWPrS7AA"
        "NYqdq6vcBcBUdJCVVFceUvJFjaPdGZ2y9WACViL4L/0))#ggrsrxf",
        "sh(multi(2,[00000000/111'/"
        "222]"
        "xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbmJbZRkrgZw4ko"
        "xb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL,"
        "xpub68NZiKmJWnxxS6aaHmn81bvJeTESw724CRDs6HbuccFQN9Ku14VQrADWgqbhhTHBao"
        "hPX4CjNLf9fq9MYo6oDaPPLPxSb7gwQN3ih19Zm4Y/0))#tjg09x5",
        "Expected 8 character checksum, not 7 characters");
    // Error in payload
    CheckUnparsable(
        "sh(multi(3,[00000000/111'/"
        "222]"
        "xprvA1RpRA33e1JQ7ifknakTFpgNXPmW2YvmhqLQYMmrj4xJXXWYpDPS3xz7iAxn8L39nj"
        "GVyuoseXzU6rcxFLJ8HFsTjSyQbLYnMpCqE2VbFWc,"
        "xprv9uPDJpEQgRQfDcW7BkF7eTya6RPxXeJCqCJGHuCJ4GiRVLzkTXBAJMu2qaMWPrS7AA"
        "NYqdq6vcBcBUdJCVVFceUvJFjaPdGZ2y9WACViL4L/0))#ggrsrxfy",
        "sh(multi(3,[00000000/111'/"
        "222]"
        "xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbmJbZRkrgZw4ko"
        "xb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL,"
        "xpub68NZiKmJWnxxS6aaHmn81bvJeTESw724CRDs6HbuccFQN9Ku14VQrADWgqbhhTHBao"
        "hPX4CjNLf9fq9MYo6oDaPPLPxSb7gwQN3ih19Zm4Y/0))#tjg09x5t",
        "Provided checksum 'tjg09x5t' does not match computed checksum "
        "'d4x0uxyv'");
    // Error in checksum
    CheckUnparsable(
        "sh(multi(2,[00000000/111'/"
        "222]"
        "xprvA1RpRA33e1JQ7ifknakTFpgNXPmW2YvmhqLQYMmrj4xJXXWYpDPS3xz7iAxn8L39nj"
        "GVyuoseXzU6rcxFLJ8HFsTjSyQbLYnMpCqE2VbFWc,"
        "xprv9uPDJpEQgRQfDcW7BkF7eTya6RPxXeJCqCJGHuCJ4GiRVLzkTXBAJMu2qaMWPrS7AA"
        "NYqdq6vcBcBUdJCVVFceUvJFjaPdGZ2y9WACViL4L/0))#ggssrxfy",
        "sh(multi(2,[00000000/111'/"
        "222]"
        "xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbmJbZRkrgZw4ko"
        "xb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL,"
        "xpub68NZiKmJWnxxS6aaHmn81bvJeTESw724CRDs6HbuccFQN9Ku14VQrADWgqbhhTHBao"
        "hPX4CjNLf9fq9MYo6oDaPPLPxSb7gwQN3ih19Zm4Y/0))#tjq09x4t",
        "Provided checksum 'tjq09x4t' does not match computed checksum "
        "'tjg09x5t'");
    // Error in checksum
    CheckUnparsable(
        "sh(multi(2,[00000000/111'/"
        "222]"
        "xprvA1RpRA33e1JQ7ifknakTFpgNXPmW2YvmhqLQYMmrj4xJXXWYpDPS3xz7iAxn8L39nj"
        "GVyuoseXzU6rcxFLJ8HFsTjSyQbLYnMpCqE2VbFWc,"
        "xprv9uPDJpEQgRQfDcW7BkF7eTya6RPxXeJCqCJGHuCJ4GiRVLzkTXBAJMu2qaMWPrS7AA"
        "NYqdq6vcBcBUdJCVVFceUvJFjaPdGZ2y9WACViL4L/0))##ggssrxfy",
        "sh(multi(2,[00000000/111'/"
        "222]"
        "xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhgbmJbZRkrgZw4ko"
        "xb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL,"
        "xpub68NZiKmJWnxxS6aaHmn81bvJeTESw724CRDs6HbuccFQN9Ku14VQrADWgqbhhTHBao"
        "hPX4CjNLf9fq9MYo6oDaPPLPxSb7gwQN3ih19Zm4Y/0))##tjq09x4t",
        "Multiple '#' symbols");

    // Addr and raw tests
    // Invalid address
    CheckUnparsable("", "addr(asdf)", "Address is not valid");
    // Invalid script
    CheckUnparsable("", "raw(asdf)", "Raw script is not hex");
    // Invalid chars
    CheckUnparsable("", "raw(Ü)#00000000", "Invalid characters in payload");
}

BOOST_AUTO_TEST_SUITE_END()
