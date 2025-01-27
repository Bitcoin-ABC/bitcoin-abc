---
layout: specification
title: Restore disabled script opcodes, May 2018
category: spec
date: 2018-04-05
activation: 1526400000
version: 0.4
updated: 2018-05-23
---

## Introduction

In 2010 and 2011 the discovery of serious bugs prompted the deactivation of many opcodes in the Bitcoin script language.
It is our intention to restore the functionality that some of these opcodes provided in Bitcoin Cash. Rather than simply
re-enable the opcodes, the functionality that they provide has been re-examined and in some cases the opcodes have been
re-designed or new opcodes have been added to address specific issues.

This document contains the specifications for the opcodes that are to be added in the May 2018 protocol upgrade. We
anticipate that additional opcodes will be proposed for the November 2018, or later, protocol upgrades.

The opcodes that are to be added are:

|Word       |OpCode |Hex |Input         |Output  | Description                                                      |
|-----------|-------|----|--------------|--------|------------------------------------------------------------------|
|OP_CAT     |126    |0x7e|x1 x2         |out     |Concatenates two byte sequences                                   |
|OP_SPLIT   |127    |0x7f|x n           |x1 x2   |Split byte sequence *x* at position *n*                           |
|OP_AND     |132    |0x84|x1 x2         |out     |Boolean *AND* between each bit of the inputs                      |
|OP_OR      |133    |0x85|x1 x2         |out     |Boolean *OR* between each bit of the inputs                       |
|OP_XOR     |134    |0x86|x1 x2         |out     |Boolean *EXCLUSIVE OR* between each bit of the inputs             |
|OP_DIV     |150    |0x96|a b           |out     |*a* is divided by *b*                                             |
|OP_MOD     |151    |0x97|a b           |out     |return the remainder after *a* is divided by *b*                  |
|OP_NUM2BIN |128    |0x80|a b           |out     |convert numeric value *a* into byte sequence of length *b*        |
|OP_BIN2NUM |129    |0x81|x             |out     |convert byte sequence *x* into a numeric value                    |

Splice operations: `OP_CAT`, `OP_SPLIT`**

Bitwise logic: `OP_AND`, `OP_OR`, `OP_XOR`

Arithmetic: `OP_DIV`, `OP_MOD`

New operations:
* `x OP_BIN2NUM -> n`, convert a byte sequence `x` into a numeric value
* `n m OP_NUM2BIN -> out`, convert a numeric value `n` into a byte sequence of length `m`

Further discussion of the purpose of these new operations can be found below under *bitwise operations*.

** A new operation, `OP_SPLIT`, has been designed as a replacement for `OP_SUBSTR`, `OP_LEFT`and `OP_RIGHT`.
The original operations can be implemented with varying combinations of `OP_SPLIT`, `OP_SWAP` and `OP_DROP`.


## <a name="data-types"></a>Script data types

It should be noted that in script operation data values on the stack are interpreted as either byte sequences 
or numeric values.  **All data on the stack is interpreted as a byte sequence unless specifically stated as being interpreted
as a numeric value.**

For accuracy in this specification, a byte sequences is presented as {0x01, 0x02, 0x03}. This sequence is three bytes long, it begins
with a byte of value 1 and ends with a byte of value 3.

The numeric value type has specific limitations:
1. The used encoding is little endian with an explicit sign bit (the highest bit of the last byte).
2. They cannot exceed 4 bytes in length.
3. They must be encoded using the shortest possible byte length (no zero padding)
  1. There is one exception to rule 3: if there is more than one byte and the most significant bit of the
        second-most-significant-byte is set it would conflict with the sign bit. In this case a single 0x00 or 0x80 byte is allowed
        to the left.
4. Zero is encoded as a zero length byte sequence. Single byte positive or negative zero (0x00 or 0x80) are not allowed.
   
The new opcode `x OP_BIN2NUM -> out` can be used convert a byte sequence into a numeric value where required.

The new opcode `x n OP_NUM2BIN` can be used to convert a numeric value into a zero padded byte sequence of length `n`
whilst preserving the sign bit.

## Definitions

* *Stack memory use*. This is the sum of the size of the elements on the stack. It gives an indication of impact on
  memory use by the interpreter.
* *Operand order*. In keeping with convention where multiple operands are specified the top most stack item is the
  last operand.  e.g. `x1 x2 OP_CAT` --> `x2` is the top stack item and `x1` is the next from the top.
* *empty byte sequence*. Throughout this document `OP_0` is used as a convenient representation of an empty byte
  sequence.  Whilst it is a push data op code, its effect is to push an empty byte sequence on to the stack.

## Specification

Global conditions apply to all operations. These conditions must be checked by the implementation when
it is possible that they will occur:
* for all e : elements on the stack, `0 <= len(e) <= MAX_SCRIPT_ELEMENT_SIZE`
* for each operator, the required number of operands are present on the stack when the operand is executed

These unit tests should be included for every operation:
1. executing the operation with an input element of length greater than `MAX_SCRIPT_ELEMENT_SIZE` will fail
2. executing the operation with an insufficient number of operands on the stack causes a failure


Operand consumption:

In all cases where not explicitly stated otherwise the operand stack elements are consumed by the operation and replaced with the output.

## Splice operations

### OP_CAT

    Opcode (decimal): 126
    Opcode (hex): 0x7e

Concatenates two operands.

    x1 x2 OP_CAT -> out
       
Examples:
* `{Ox11} {0x22, 0x33} OP_CAT -> 0x112233`
   
The operator must fail if `len(out) > MAX_SCRIPT_ELEMENT_SIZE`. The operation cannot output elements that violate the constraint on the element size.

Note that the concatenation of a zero length operand is valid.

Impact of successful execution:
* stack memory use is constant
* number of elements on stack is reduced by one

The limit on the length of the output prevents the memory exhaustion attack and results in the operation having less
impact on stack size than existing OP_DUP operators.

Unit tests:
1. `maxlen_x y OP_CAT -> failure`. Concatenating any operand except an empty vector, including a single byte value
   (e.g. `OP_1`), onto a maximum sized array causes failure
3. `large_x large_y OP_CAT -> failure`. Concatenating two operands, where the total length is greater than
   `MAX_SCRIPT_ELEMENT_SIZE`, causes failure
4. `OP_0 OP_0 OP_CAT -> OP_0`. Concatenating two empty arrays results in an empty array
5. `x OP_0 OP_CAT -> x`. Concatenating an empty array onto any operand results in the operand, including when
   `len(x) = MAX_SCRIPT_ELEMENT_SIZE`
6. `OP_0 x OP_CAT -> x`. Concatenating any operand onto an empty array results in the operand, including when
   `len(x) = MAX_SCRIPT_ELEMENT_SIZE`
7. `x y OP_CAT -> concat(x,y)`. Concatenating two operands generates the correct result

### OP_SPLIT

*`OP_SPLIT` replaces `OP_SUBSTR` and uses it's opcode.*

    Opcode (decimal): 127
    Opcode (hex): 0x7f


Split the operand at the given position.  This operation is the exact inverse of OP_CAT

    x n OP_SPLIT -> x1 x2

    where n is interpreted as a numeric value

Examples:
* `{0x00, 0x11, 0x22} 0 OP_SPLIT -> OP_0 {0x00, 0x11, 0x22}`
* `{0x00, 0x11, 0x22} 1 OP_SPLIT -> {0x00} {0x11, 0x22}`
* `{0x00, 0x11, 0x22} 2 OP_SPLIT -> {0x00, 0x11} {0x22}`
* `{0x00, 0x11, 0x22} 3 OP_SPLIT -> {0x00, 0x11, 0x22} OP_0`

Notes:
* this operator has been introduced as a replacement for the previous `OP_SUBSTR`, `OP_LEFT`and `OP_RIGHT`. All three operators can be
simulated with varying combinations of `OP_SPLIT`, `OP_SWAP` and `OP_DROP`.  This is in keeping with the minimalist philosophy where a single
primitive can be used to simulate multiple more complex operations.
* `x` is split at position `n`, where `n` is the number of bytes from the beginning
* `x1` will be the first `n` bytes of `x` and `x2` will be the remaining bytes
* if `n == 0`, then `x1` is the empty array and `x2 == x`
* if `n == len(x)` then `x1 == x` and `x2` is the empty array.
* if `n > len(x)`, then the operator must fail.
* `x n OP_SPLIT OP_CAT -> x`, for all `x` and for all `0 <= n <= len(x)`
   
The operator must fail if:
* `!isnum(n)`. Fail if `n` is not a numeric value.
* `n < 0`. Fail if `n` is negative.
* `n > len(x)`. Fail if `n` is too high.

Impact of successful execution:
* stack memory use is constant (slight reduction by `len(n)`)
* number of elements on stack is constant

Unit tests:
* `OP_0 0 OP_SPLIT -> OP_0 OP_0`. Execution of OP_SPLIT on empty array results in two empty arrays.
* `x 0 OP_SPLIT -> OP_0 x`
* `x len(x) OP_SPLIT -> x OP_0`
* `x (len(x) + 1) OP_SPLIT -> FAIL`
* include successful unit tests

## Bitwise logic

The bitwise logic operators expect 'byte sequence' operands. The operands must be the same length.
* In the case of 'byte sequence' operands `OP_CAT` can be used to pad a shorter byte sequence to an appropriate length.
* In the case of 'byte sequence' operands where the length of operands is not known until runtime a sequence of 0x00 bytes
  (for use with `OP_CAT`) can be produced using `OP_0 n OP_NUM2BIN`
* In the case of numeric value operands `x n OP_NUM2BIN` can be used to pad a numeric value to length `n` whilst preserving
  the sign bit.

### OP_AND

    Opcode (decimal): 132
    Opcode (hex): 0x84

Boolean *and* between each bit in the operands.

	x1 x2 OP_AND -> out

Notes:
* where `len(x1) == 0` and `len(x2) == 0` the output will be an empty array.

The operator must fail if:
1. `len(x1) != len(x2)`. The two operands must be the same size.

Impact of successful execution:
* stack memory use reduced by `len(x1)`
* number of elements on stack is reduced by one

Unit tests:

1. `x1 x2 OP_AND -> failure`, where `len(x1) != len(x2)`. The two operands must be the same size.
2. `x1 x2 OP_AND -> x1 & x2`. Check valid results.

### OP_OR

    Opcode (decimal): 133
    Opcode (hex): 0x85

Boolean *or* between each bit in the operands.

	x1 x2 OP_OR -> out
	
The operator must fail if:
1. `len(x1) != len(x2)`. The two operands must be the same size.

Impact of successful execution:
* stack memory use reduced by `len(x1)`
* number of elements on stack is reduced by one

Unit tests:
1. `x1 x2 OP_OR -> failure`, where `len(x1) != len(x2)`. The two operands must be the same size.
2. `x1 x2 OP_OR -> x1 | x2`. Check valid results.

### OP_XOR

    Opcode (decimal): 134
    Opcode (hex): 0x86

Boolean *xor* between each bit in the operands.

	x1 x2 OP_XOR -> out
	
The operator must fail if:
1. `len(x1) != len(x2)`. The two operands must be the same size.

Impact of successful execution:
* stack memory use reduced by `len(x1)`
* number of elements on stack is reduced by one

Unit tests:
1. `x1 x2 OP_XOR -> failure`, where `len(x1) != len(x2)`. The two operands must be the same size.
2. `x1 x2 OP_XOR -> x1 xor x2`. Check valid results.
   
## Arithmetic

#### Note about canonical form and floor division

Operands for all arithmetic operations are assumed to be numeric values and must be in canonical form. 
See [data types](#data-types) for more information.

**Floor division**

Note that when considering integer division and modulo operations with negative operands, the rules applied in the C language and most
languages (with Python being a notable exception) differ from the strict mathematical definition.  Script follows the C language set of
rules.  Namely:
1. Non-integer quotients are rounded towards zero
2. The equation `(a/b)*b + a%b == a` is satisfied by the results
3. From the above equation it follows that: `a%b == a - (a/b)*b`
4. In practice if `a` is negative for the modulo operator the result will be negative or zero.


### OP_DIV

    Opcode (decimal): 150
    Opcode (hex): 0x96
   
Return the integer quotient of `a` and `b`.  If the result would be a non-integer it is rounded *towards* zero.

    a b OP_DIV -> out
   
    where a and b are interpreted as numeric values
   
The operator must fail if:
1. `!isnum(a) || !isnum(b)`. Fail if either operand is not a numeric value.
1. `b == 0`. Fail if `b` is equal to any type of zero.

Impact of successful execution:
* stack memory use reduced
* number of elements on stack is reduced by one

Unit tests:
1. `a b OP_DIV -> failure` where `!isnum(a)` or `!isnum(b)`. Both operands must be numeric values
2. `a 0 OP_DIV -> failure`. Division by positive zero (all sizes), negative zero (all sizes), `OP_0`
3. `27 7 OP_DIV -> 3`, `27 -7 OP_DIV -> -3`, `-27 7 OP_DIV -> -3`, `-27 -7 OP_DIV -> 3`. Check negative operands.
  *Pay attention to sign*.
4. check valid results for operands of different lengths `0..4`
   
### OP_MOD

    Opcode (decimal): 151
    Opcode (hex): 0x97

Returns the remainder after dividing a by b.  The output will be represented using the least number of bytes required.

	a b OP_MOD -> out
	
	where a and b are interpreted as numeric values
	
The operator must fail if:
1. `!isnum(a) || !isnum(b)`. Fail if either operand is not a numeric value.
1. `b == 0`. Fail if `b` is equal to any type of zero.

Impact of successful execution:
* stack memory use reduced (one element removed)
* number of elements on stack is reduced by one

Unit tests:
1. `a b OP_MOD -> failure` where `!isnum(a)` or `!isnum(b)`. Both operands must be numeric values.
2. `a 0 OP_MOD -> failure`. Division by positive zero (all sizes), negative zero (all sizes), `OP_0`
3. `27 7 OP_MOD -> 6`, `27 -7 OP_MOD -> 6`, `-27 7 OP_MOD -> -6`, `-27 -7 OP_MOD -> -6`. Check negative operands.
  *Pay attention to sign*.
4. check valid results for operands of different lengths `0..4` and returning result zero

## New operations

### OP_NUM2BIN

*`OP_NUM2BIN` replaces `OP_LEFT` and uses it's opcode*

    Opcode (decimal): 128
    Opcode (hex): 0x80

Convert the numeric value into a byte sequence of a certain size, taking account of the sign bit.
The byte sequence produced uses the little-endian encoding.

    a b OP_NUM2BIN -> x
   
where `a` and `b` are interpreted as numeric values. `a` is the value to be converted to a byte sequence,
it can be up to `MAX_SCRIPT_ELEMENT_SIZE` long and does not need to be minimally encoded.
`b` is the desired size of the result, it must be minimally encoded and <= 4 bytes long. It must be possible for the
value `a` to be encoded in a byte sequence of length `b` without loss of data.


See also `OP_BIN2NUM`.

Examples:
* `2 4 OP_NUM2BIN -> {0x02, 0x00, 0x00, 0x00}`
* `-5 4 OP_NUM2BIN -> {0x05, 0x00, 0x00, 0x80}`

The operator must fail if:
1. `b` is not a minimally encoded numeric value.
2. `b < len(minimal_encoding(a))`. `a` must be able to fit into `b` bytes.
3. `b > MAX_SCRIPT_ELEMENT_SIZE`. The result would be too large.

Impact of successful execution:
* stack memory use will be increased by `b - len(a) - len(b)`, maximum increase is when `b = MAX_SCRIPT_ELEMENT_SIZE`
* number of elements on stack is reduced by one

Unit tests:
1. `a b OP_NUM2BIN -> failure` where `!isnum(b)`. `b` must be a minimally encoded numeric value.
2. `256 1 OP_NUM2BIN -> failure`. Trying to produce a byte sequence which is smaller than the minimum size needed to
   contain the numeric value.
3. `1 (MAX_SCRIPT_ELEMENT_SIZE+1) OP_NUM2BIN -> failure`. Trying to produce an array which is too large.
4. other valid parameters with various results

### OP_BIN2NUM

*`OP_BIN2NUM` replaces `OP_RIGHT` and uses it's opcode*

    Opcode (decimal): 129
    Opcode (hex): 0x81

Convert the byte sequence into a numeric value, including minimal encoding. The byte sequence must encode the value in little-endian encoding.

    a OP_BIN2NUM -> x

See also `OP_NUM2BIN`.

Notes:
* if `a` is any form of zero, including negative zero, then `OP_0` must be the result
   
Examples:
* `{0x02, 0x00, 0x00, 0x00, 0x00} OP_BIN2NUM -> 2`. `0x0200000000` in little-endian encoding has value 2.
* `{0x05, 0x00, 0x80} OP_BIN2NUM -> -5` - `0x050080` in little-endian encoding has value -5.

The operator must fail if:
1. the numeric value is out of the range of acceptable numeric values (currently size is limited to 4 bytes)

Impact of successful execution:
* stack memory use is equal or less than before. Minimal encoding of the byte sequence can produce a result which is shorter.
* the number of elements on the stack remains constant

Unit tests:
1. `a OP_BIN2NUM -> failure`, when `a` is a byte sequence whose numeric value is too large to fit into the numeric value
    type, for both positive and negative values.
2. `{0x00} OP_BIN2NUM -> OP_0`. Byte sequences, of various lengths, consisting only of zeros should produce an OP_0 (zero
    length array).
3. `{0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00} OP_BIN2NUM -> 1`. A large byte sequence, whose numeric value would fit in the numeric value
    type, is a valid operand.
4. The same test as above, where the length of the input byte sequence is equal to MAX_SCRIPT_ELEMENT_SIZE.
5. `{0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80} OP_BIN2NUM -> -1`. Same as above, for negative values.
6. `{0x80} OP_BIN2NUM -> OP_0`. Negative zero, in a byte sequence, should produce zero.
7. `{0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80} OP_BIN2NUM -> OP_0`. Large negative zero, in a byte sequence, should produce zero.
8. other valid parameters with various results

## Reference implementation

* OP_AND, OP_OR, OP_XOR: https://reviews.bitcoinabc.org/D1211

* OP_DIV and OP_MOD: https://reviews.bitcoinabc.org/D1212

* OP_CAT: https://reviews.bitcoinabc.org/D1227

* OP_SPLIT: https://reviews.bitcoinabc.org/D1228

* OP_BIN2NUM: https://reviews.bitcoinabc.org/D1220

* OP_NUM2BIN: https://reviews.bitcoinabc.org/D1222


## References

<a name="op_codes">[1]</a> https://en.bitcoin.it/wiki/Script#Opcodes
