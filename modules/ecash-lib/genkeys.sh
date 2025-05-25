#!/usr/bin/env bash

# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

export LC_ALL=C

# Test message for signatures
echo -n "eCash" > testkeys/msg.txt

# Test subject for certificate
SUBJ="/C=CA/ST=British Columbia/L=Vancouver/O=eCash Palace/OU=Software/CN=example.e.cash/emailAddress=example@e.cash"

for curve in prime256v1 secp384r1
do
    # Generate curve secret key
    openssl ecparam -genkey -out testkeys/$curve-sk.pem -name $curve
    # Extract curve public key
    openssl ec -pubin -pubout -in testkeys/$curve-sk.pem -noout -text 2>/dev/null \
        | grep '^    ' \
        | tr -d ' ' | tr -d ':' | tr -d '\n' \
        > testkeys/$curve-pk.hex

    for hash in sha256 sha384
    do
        # Sign curve signature
        openssl $hash -sign testkeys/$curve-sk.pem -hex testkeys/msg.txt \
            | sed -r 's/[^=]+= //' \
            | tr -d '\n' \
            > testkeys/$curve-sig-$hash.hex

        # Sign curve cert
        openssl req -x509 -new -$hash \
                    -key testkeys/$curve-sk.pem \
                    -out testkeys/$curve-cert-$hash.pem \
                    -days 36500 -nodes -subj "$SUBJ"
    done
done

for keysize in 2048 3072 4096 8192
do
    # Generate RSA secret key
    openssl genrsa -out testkeys/rsa$keysize-sk.pem $keysize

    # Extract RSA public key:
    # -traditional -RSAPublicKey_out removes the algorithm info,
    # so they are encoded like in X509 certificates
    openssl rsa -in testkeys/rsa$keysize-sk.pem \
        -traditional -RSAPublicKey_out \
        -outform DER \
        -out testkeys/rsa$keysize-pk.der

    for hash in sha256 sha384 sha512
    do
        # Sign RSA signature
        openssl $hash -sign testkeys/rsa$keysize-sk.pem -hex testkeys/msg.txt \
            | sed -r 's/[^=]+= //' \
            | tr -d '\n' \
            > testkeys/rsa$keysize-sig-$hash.hex

        # Sign RSA cert
        openssl req -x509 -new -$hash \
                    -key testkeys/rsa$keysize-sk.pem \
                    -out testkeys/rsa$keysize-cert-$hash.pem \
                    -days 36500 -nodes -subj "$SUBJ"
    done
done
