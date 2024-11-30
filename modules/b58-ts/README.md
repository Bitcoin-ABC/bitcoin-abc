# b58-ts

Base58 en-/decoder, without dependencies.

It's modeled after base58.cpp.

## Installation

`npm install b58-ts`

`yarn add b58-ts`

## Usage

```js
import { encodeBase58, decodeBase58 } from 'b58-ts';

encodeBase58(new Uint8Array([1, 2, 3, 4]));
decodeBase58('1111111111');
```
