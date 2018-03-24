# RapidCheck property-based testing for Bitcoin ABC

## Concept

Property-based testing is experimentally being added to Bitcoin ABC with
[RapidCheck](https://github.com/emil-e/rapidcheck), a C++ framework for
property-based testing inspired by the Haskell library
[QuickCheck](https://hackage.haskell.org/package/QuickCheck).

RapidCheck performs random testing of program properties. A specification of the
program is given in the form of properties which functions should satisfy, and
RapidCheck tests that the properties hold in a large number of randomly
generated cases.

If an exception is found, RapidCheck tries to find the smallest case, for some
definition of smallest, for which the property is still false and displays it as
a counter-example. For example, if the input is an integer, RapidCheck tries to
find the smallest integer for which the property is false.

## Setup

The following instructions have been tested with Linux Debian and macOS.

1. Clone the RapidCheck source code and cd into the repository.

    ```shell
    git clone https://github.com/emil-e/rapidcheck.git
    cd rapidcheck
    ```

2. Build RapidCheck.

    ```shell
    mkdir build
    cd build
    cmake -GNinja .. -DCMAKE_POSITION_INDEPENDENT_CODE=ON -DRC_ENABLE_BOOST_TEST=ON
    ninja
    sudo ninja install/strip
    ```

3. Configure Bitcoin ABC with RapidCheck.

    `cd` to the directory of your local Bitcoin ABC repository, create a build
    directory and run cmake:

    ```shell
    mkdir build
    cd build
    cmake -GNinja .. -DENABLE_PROPERTY_BASED_TESTS=ON
    ```

    In the output you should see something similar to:

    ```shell
    [...]
    -- Found Rapidcheck: /usr/local/include
    -- Found Rapidcheck: /usr/local/lib/librapidcheck.a
    [...]
    ```

4. Build Bitcoin ABC with RapidCheck.

    Now you can run `ninja check` to build and run the unit tests, including the
    property-based tests. You can also build and run a single test by using
    `ninja check-bitcoin-<test_name>`.

    Example: `ninja check-bitcoin-key_properties`

That's it! You are now running property-based tests in Bitcoin ABC.
