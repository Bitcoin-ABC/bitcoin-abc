# Proof Manager CLI

A secure command-line tool for managing Avalanche proofs, stakes, and delegations with automatic type detection and secure signing workflows.

## Features

-   **Decode/Convert**: Convert between hex and JSON formats with automatic type detection
-   **Secure Signing**: Sign unsigned configurations without storing private keys
-   **Validate**: Verify the integrity of proofs, stakes, and delegations
-   **Auto-Detection**: Automatically detect object types from input format
-   **Batch Stakes Signing**: Sign multiple stakes with the same private key in one command
-   **ID Extraction**: Extract proof IDs, stake IDs, and delegation IDs from hex data
-   **Delegation Creation**: Create unsigned delegations from proofs or existing delegations
-   **Keypair Generation**: Generate secure random keypairs with both hex and WIF formats
-   **JSON ↔ Hex Conversion**: Full bidirectional conversion with stakes outputting one hex per line
-   **Stdout-First**: Output to stdout by default for easy redirection

## Building

### Prerequisites

-   **Rust**: Latest stable version (1.70+)
-   **Cargo**: Comes with Rust installation

### Build from Source

```bash
# Navigate to the proof-manager-cli directory
cd apps/proof-manager-cli

# Build the binary
cargo build --release

# The binary will be available at:
# target/release/proof-manager
```

### Development Build

```bash
# Build for development (faster compilation, includes debug info)
cargo build

# Run directly with cargo
cargo run -- --help

# The development binary will be at:
# target/debug/proof-manager
```

### Dependencies

The CLI depends on the `avalanche-lib-wasm` library which must be built first:

```bash
# From the repository root
cd modules/avalanche-lib-wasm
cargo build --release

# Then build the CLI
cd ../../apps/proof-manager-cli
cargo build --release
```

### Installation

```bash
# Install globally (optional)
cargo install --path .

# Or copy the binary to your PATH
cp target/release/proof-manager /usr/local/bin/
```

## Security Design

Private keys are never stored in JSON files. Instead, the CLI uses a secure signing workflow where:

-   Unsigned configurations contain only public data
-   Private keys are provided securely via stdin or command-line argument (hex or WIF format)
-   The wrapped JSON format (`{"proof": {...}}`, `{"stakes": [...]}`) makes type detection unambiguous and prevents type confusion
-   Stakes are signed individually first, then unsigned proofs contain already-signed stakes
-   All cryptographic operations use the `avalanche-lib-wasm` library's public API (ProofBuilder, DelegationBuilder) for consistency with other applications

### Automatic History Cleanup

The CLI automatically attempts to remove commands containing private keys from your shell history when using the `--private-key` option. This feature:

-   Works with bash, zsh, and other common shells
-   Attempts multiple cleanup strategies (shell commands, direct file manipulation)
-   Operates silently in the background without user feedback
-   Can be disabled with `--no-history-cleanup` flag (not recommended)
-   May not work in all environments or with complex command pipelines

**Security Best Practices for Automation:**

-   **Preferred**: Use environment variables or process substitution to avoid keys in command line
-   Disable shell history temporarily with `set +o history` when using direct key input
-   Use `history -d $((HISTCMD-1))` to remove the last command from bash history
-   Store keys in files with restrictive permissions (600) and secure locations
-   Use secrets management systems (HashiCorp Vault, AWS Secrets Manager, etc.) in production
-   Consider using hardware security modules (HSMs) for high-value operations

## ID Extraction

The `get-id` command extracts unique identifiers from Avalanche objects:

### Stake ID

-   **stake_id**: Unique identifier for the stake based on UTXO and stake data

### Proof IDs

-   **proof_id**: Complete proof identifier (includes master public key)
-   **limitedid**: Limited proof identifier (excludes master public key)

### Delegation ID

-   **delegation_id**: Unique identifier for the delegation chain

Example output:

```json
{
    "proof_id": "abc123...",
    "limitedid": "def456..."
}
```

## Signing Workflow

The signing process follows a specific order to ensure security and correctness:

### 1. Sign Stakes First (Batch or Individual)

Stakes must be signed individually with their own private keys and require a commitment (proof configuration) to establish the proof context. You can sign multiple stakes with the same private key in one command:

```bash
# Sign multiple stakes with the same private key (most common case)
proof-manager sign --type stakes --input unsigned_stakes.json --commitment proof_config.json --private-key <stake_private_key>

# Interactive signing (prompted for private key)
proof-manager sign --type stakes --input unsigned_stakes.json --commitment proof_config.json

# You can also provide the proof JSON directly as a string
proof-manager sign --type stakes --input unsigned_stakes.json --commitment '{"proof":{"sequence":1,"expiration":1735689600,"master":"034646ae...","payoutscript":"76a914...","stakes":[]}}' --private-key <stake_private_key>
```

The commitment parameter must be a proof JSON configuration that contains the `expiration` and `master` that the stakes will be committed to. This ensures stakes are signed for the correct proof context.

### 2. Create Unsigned Proof with Signed Stakes

The unsigned proof contains the already-signed stakes from step 1:

```json
{
    "proof": {
        "sequence": 1,
        "expiration": 1735689600,
        "master": "034646ae5047316b4230d0086c8acec687f00b1cd9d1dc634f6cb358ac0a9a8fff",
        "payoutscript": "76a914abcdefabcdefabcdefabcdefabcdefabcdefabcd88ac",
        "stakes": [
            {
                "txid": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "vout": 0,
                "amount": 100000000,
                "height": 100,
                "iscoinbase": false,
                "pubkey": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
                "signature": "a9ecf4ed270ea967aef04e68f41d1f7302b9c1d350513d0711e08aa88a5765a625f081b21766c8a263b3b48d4e79c9330b52ab7b5686bb93cac5030b087edd90"
            }
        ]
    }
}
```

### 3. Sign the Proof with Master Private Key

Finally, sign the proof itself with the master private key:

```bash
# Sign the proof with master private key
proof-manager sign --input unsigned_proof.json --private-key <master_private_key>
```

## Delegation Creation Workflow

Delegations allow you to transfer control of a proof from the master key to other keys, creating a chain of delegation:

### 1. Create Unsigned Delegation from Proof

```bash
# Create delegation from proof hex
proof-manager delegate --hex <proof_hex> --pubkey <pubkey_hex>

# Create delegation from signed proof JSON
proof-manager delegate --input signed_proof.json --pubkey <pubkey_hex>
```

### 2. Sign the Delegation

```bash
# Sign the delegation with the master private key
proof-manager sign --input unsigned_delegation.json --private-key <master_private_key>
```

### 3. Extend Delegation Chain (Optional)

```bash
# Create another delegation level from existing delegation
proof-manager delegate --input signed_delegation.json --pubkey <next_pubkey_hex>

# Sign with the current delegated key
proof-manager sign --input unsigned_delegation_level2.json --private-key <delegated_private_key>
```

## Commands

### Decode/Convert

Decode/convert between hex and JSON formats. Automatically detects type if not specified.

```bash
# Decode hex to JSON (auto-detect type)
proof-manager decode --hex <hex_string>

# Convert JSON to hex format
proof-manager decode --input signed_stakes.json --format hex

# Convert to both JSON and hex
proof-manager decode --input signed_proof.json --format both

# Read from stdin (use "-" as input)
echo '{"proof":{...}}' | proof-manager decode --input -

# Specify type explicitly (optional)
proof-manager decode --type proof --hex <hex_string>

# Output to file
proof-manager decode --input signed_proof.json --output decoded_proof.json
```

### Sign

Sign unsigned configurations securely. Supports batch signing of multiple stakes with the same private key:

```bash
# Sign multiple stakes with same private key (batch signing) - requires commitment
proof-manager sign --type stakes --input unsigned_stakes.json --commitment proof_config.json --private-key <hex_key>

# Interactive signing (secure stdin input) - requires commitment
proof-manager sign --type stakes --input unsigned_stakes.json --commitment proof_config.json

# Sign proof with master key (no commitment needed)
proof-manager sign --type proof --input unsigned_proof.json --private-key <master_hex_key>

# Read from stdin (use "-" as input) - commitment still required for stakes
echo '{"stakes":[...]}' | proof-manager sign --type stakes --input - --commitment proof_config.json --private-key <hex_key>

# Auto-detect type from JSON structure (commitment required for stakes)
proof-manager sign --input unsigned_config.json --commitment proof_config.json

# Save to file
proof-manager sign --input unsigned_config.json --commitment proof_config.json --output signed_config.json

# Output in hex format instead of JSON
proof-manager sign --input unsigned_proof.json --format hex --private-key <master_hex_key>

# Output both hex and JSON formats
proof-manager sign --input unsigned_proof.json --format both --private-key <master_hex_key>

# Disable automatic history cleanup (not recommended for security)
proof-manager sign --input unsigned_config.json --commitment proof_config.json --private-key <hex_key> --no-history-cleanup
```

**Important**: When signing stakes, the `--commitment` parameter is required and must contain a proof JSON configuration with the `expiration` and `master` that the stakes will be committed to.

**Output Formats**: The `--format` option supports:

-   `json` (default): Pretty-printed JSON format
-   `hex`: Raw hex format (for stakes: one hex string per line, one per stake)
-   `both`: Shows both JSON and hex formats together

### Validate

Validate a proof, stake, or delegation. Automatically detects type if not specified.

```bash
# Validate hex (auto-detect type)
proof-manager validate --hex <hex_string>

# Validate JSON (auto-detect type)
proof-manager validate --input signed_proof.json

# Specify type explicitly (optional)
proof-manager validate --type proof --hex <hex_string>
```

### Delegate

Create unsigned delegation configurations from proofs or existing delegations.

```bash
# Create delegation from proof hex
proof-manager delegate --hex <proof_hex> --pubkey <pubkey_hex>

# Create delegation from proof file
proof-manager delegate --input signed_proof.json --pubkey <pubkey_hex>

# Create delegation from existing delegation (extend chain)
proof-manager delegate --hex <delegation_hex> --pubkey <new_pubkey_hex>

# Save to file
proof-manager delegate --hex <proof_hex> --pubkey <pubkey_hex> --output unsigned_delegation.json
```

### Get ID

Extract IDs from proofs, stakes, or delegations. Automatically detects type if not specified.

```bash
# Get IDs from proof hex (returns proof_id and limitedid)
proof-manager get-id --hex <proof_hex>

# Get ID from stake hex (returns stake_id)
proof-manager get-id --hex <stake_hex>

# Get ID from delegation hex (returns delegation_id)
proof-manager get-id --hex <delegation_hex>

# Get IDs from file
proof-manager get-id --input signed_proof.json

# Specify type explicitly (optional)
proof-manager get-id --type proof --hex <hex_string>

# Save to file
proof-manager get-id --hex <proof_hex> --output ids.json
```

### Generate Keypair

Generate a secure random keypair using avalanche-lib-wasm crypto:

```bash
# Generate keypair and output to stdout
proof-manager generate-keypair

# Save keypair to file
proof-manager generate-keypair --output keypair.json
```

The output includes:

-   `private_key_hex`: Private key in hexadecimal format
-   `private_key_wif`: Private key in WIF (Wallet Import Format)
-   `public_key`: Public key in hexadecimal format

## Commitment Parameter for Stakes Signing

When signing stakes, you must provide a `--commitment` parameter that contains the proof configuration the stakes will be committed to. This ensures stakes are signed for the correct proof context.

### Commitment Format

The commitment must be a proof JSON configuration containing at minimum:

```json
{
    "proof": {
        "sequence": 1,
        "expiration": 1735689600,
        "master": "034646ae5047316b4230d0086c8acec687f00b1cd9d1dc634f6cb358ac0a9a8fff",
        "payoutscript": "76a914abcdefabcdefabcdefabcdefabcdefabcdefabcd88ac",
        "stakes": []
    }
}
```

### Commitment Usage Examples

```bash
# Using a proof configuration file
proof-manager sign --type stakes --input unsigned_stakes.json --commitment proof_config.json --private-key <hex_key>

# Using direct JSON string
proof-manager sign --type stakes --input unsigned_stakes.json --commitment '{"proof":{"sequence":1,"expiration":1735689600,"master":"034646ae...","payoutscript":"76a914...","stakes":[]}}' --private-key <hex_key>
```

The CLI extracts the `expiration` and `master` from the commitment to create the proper stake commitment for signing.

## Configuration Examples

### Stakes Configurations

#### Unsigned Stakes Configuration (for batch signing)

```json
{
    "stakes": [
        {
            "txid": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "vout": 0,
            "amount": 100000000,
            "height": 100,
            "iscoinbase": false,
            "pubkey": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
        },
        {
            "txid": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            "vout": 1,
            "amount": 200000000,
            "height": 101,
            "iscoinbase": false,
            "pubkey": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
        }
    ]
}
```

#### Signed Stakes Configuration (output from batch signing)

```json
{
    "stakes": [
        {
            "txid": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "vout": 0,
            "amount": 100000000,
            "height": 100,
            "iscoinbase": false,
            "pubkey": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
            "signature": "a9ecf4ed270ea967aef04e68f41d1f7302b9c1d350513d0711e08aa88a5765a625f081b21766c8a263b3b48d4e79c9330b52ab7b5686bb93cac5030b087edd90"
        },
        {
            "txid": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            "vout": 1,
            "amount": 200000000,
            "height": 101,
            "iscoinbase": false,
            "pubkey": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
            "signature": "86f1527b8d16be1397e6f2f328af7f0dd8f988f8797d0e04c7c282791acad89de71a5627f0a8fd1c65cfc16c09c5f590953cc3e74e5a351789d1713d713116c4"
        }
    ]
}
```

### Proof Configurations

#### Unsigned Proof Configuration (contains signed stakes)

```json
{
    "proof": {
        "sequence": 1,
        "expiration": 1735689600,
        "master": "034646ae5047316b4230d0086c8acec687f00b1cd9d1dc634f6cb358ac0a9a8fff",
        "payoutscript": "76a914abcdefabcdefabcdefabcdefabcdefabcdefabcd88ac",
        "stakes": [
            {
                "txid": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "vout": 0,
                "amount": 100000000,
                "height": 100,
                "iscoinbase": false,
                "pubkey": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
                "signature": "a9ecf4ed270ea967aef04e68f41d1f7302b9c1d350513d0711e08aa88a5765a625f081b21766c8a263b3b48d4e79c9330b52ab7b5686bb93cac5030b087edd90"
            }
        ]
    }
}
```

#### Signed Proof Configuration (final result)

```json
{
    "proof": {
        "sequence": 1,
        "expiration": 1735689600,
        "master": "034646ae5047316b4230d0086c8acec687f00b1cd9d1dc634f6cb358ac0a9a8fff",
        "payoutscript": "76a914abcdefabcdefabcdefabcdefabcdefabcdefabcd88ac",
        "stakes": [
            {
                "txid": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "vout": 0,
                "amount": 100000000,
                "height": 100,
                "iscoinbase": false,
                "pubkey": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
                "signature": "a9ecf4ed270ea967aef04e68f41d1f7302b9c1d350513d0711e08aa88a5765a625f081b21766c8a263b3b48d4e79c9330b52ab7b5686bb93cac5030b087edd90"
            }
        ],
        "signature": "41052544c5cb7c48d2874d788cffdad7e9f7163dd3590aedc3cafdafac0450e842e7c679c3f4a7d8bcb3344c20945414d56c405eec24ba7be409770f220f47ed"
    }
}
```

### Delegation Configurations

#### Unsigned Delegation Configuration

```json
{
    "delegation": {
        "limitedid": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "master": "034646ae5047316b4230d0086c8acec687f00b1cd9d1dc634f6cb358ac0a9a8fff",
        "levels": [
            {
                "pubkey": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
            }
        ]
    }
}
```

#### Signed Delegation Configuration

```json
{
    "delegation": {
        "limitedid": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "master": "034646ae5047316b4230d0086c8acec687f00b1cd9d1dc634f6cb358ac0a9a8fff",
        "levels": [
            {
                "pubkey": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
                "signature": "38a2cad943935ee0916e5e822d035c6874e3f90821fa0e23f56d0733a5b81fdb0431b8a4d9a33838608b3d2b87ee5bedbba6c61f9bfcea9431940187466e3e74"
            }
        ]
    }
}
```

## Output and Redirection

By default, all command outputs are printed to `stdout`. This allows for easy redirection to files or piping to other commands:

```bash
# Redirect output to a file
proof-manager decode --hex <hex_string> > output.json

# Pipe output to another command (e.g., for further processing)
proof-manager sign --type stakes --input unsigned_stakes.json --commitment proof_config.json | jq .
```

## Output Formats

The `decode` command supports multiple output formats:

-   **`json`** (default): Pretty-printed JSON format
-   **`hex`**: Raw hex format (for stakes: one hex string per line, one per stake)
-   **`both`**: Shows both JSON and hex formats together

### Stakes Hex Conversion

When converting JSON stakes to hex format, each stake in the array produces its own hex string on a separate line:

```bash
# Input: {"stakes": [stake1, stake2, stake3]}
# Output:
# <stake1_hex>
# <stake2_hex>
# <stake3_hex>
```

This allows individual processing of each stake while maintaining the array structure in JSON.

## Examples

```bash
# Sign multiple stakes with same private key (batch signing) - requires commitment
proof-manager sign --type stakes --input unsigned_stakes.json --commitment proof_config.json --private-key <hex_key>

# Decode a proof from hex, auto-detecting type, outputting JSON
proof-manager decode --hex <proof_hex_string>

# Convert stakes JSON to hex format (one hex per line)
proof-manager decode --input signed_stakes.json --format hex

# Sign an unsigned proof from a file, providing key via stdin, outputting to stdout
proof-manager sign --type proof --input unsigned_proof.json

# Sign unsigned stakes from stdin, providing key via command line, outputting to stdout
echo '{"stakes":[...]}' | proof-manager sign --type stakes --input - --commitment proof_config.json --private-key <hex_key>

# Validate a signed stakes array from a file, auto-detecting type
proof-manager validate --input signed_stakes.json

# Sign a delegation from a file, providing key via stdin
proof-manager sign --type delegation --input unsigned_delegation.json

# Sign a delegation with private key via command line
proof-manager sign --type delegation --input unsigned_delegation.json --private-key <hex_key>

# Decode a delegation from hex, auto-detecting type
proof-manager decode --hex <delegation_hex_string>

# Validate a delegation from hex
proof-manager validate --hex <delegation_hex_string>

# Create delegation from proof hex
proof-manager delegate --hex <proof_hex> --pubkey 0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798

# Create delegation from existing delegation (extend chain)
proof-manager delegate --input signed_delegation.json --pubkey 03c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5

# Get IDs from proof hex
proof-manager get-id --hex <proof_hex_string>

# Get stake ID from stake hex
proof-manager get-id --hex <stake_hex_string>

# Get delegation ID from delegation hex
proof-manager get-id --hex <delegation_hex_string>

# Generate a new keypair
proof-manager generate-keypair

# Generate keypair and save to file
proof-manager generate-keypair --output my_keypair.json
```
