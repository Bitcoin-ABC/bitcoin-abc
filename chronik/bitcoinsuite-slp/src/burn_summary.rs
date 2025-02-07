// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use itertools::Itertools;

use crate::token_tx::TokenTxEntry;

impl TokenTxEntry {
    /// Whether the entry unintentionally burns tokens or mint batons.
    pub fn has_unintentional_burn(&self) -> bool {
        if self.burns_mint_batons {
            // Burning MINT batons can never be intentional
            return true;
        }
        if let Some(intentional_burn_atoms) = self.intentional_burn_atoms {
            intentional_burn_atoms as u128 != self.actual_burn_atoms
        } else {
            self.actual_burn_atoms > 0
        }
    }

    /// Whether the entry doesn't burn anything unexpected and doesn't have any
    /// errors.
    pub fn is_normal(&self) -> bool {
        if self.is_invalid || self.has_unintentional_burn() {
            return false;
        }
        if !self.failed_colorings.is_empty() || self.burn_error.is_some() {
            return false;
        }
        true
    }

    /// Create a human-readable summary of the burns of this entry.
    pub fn burn_summary(&self) -> String {
        if self.is_normal() {
            if let Some(burn_atoms) = self.intentional_burn_atoms {
                return format!("OK: Intentional burn of {burn_atoms} atoms");
            } else {
                return "OK: No burn".to_string();
            }
        }
        let any_actual_burn =
            self.burns_mint_batons || self.actual_burn_atoms != 0;
        if !any_actual_burn
            && (self.burn_error.is_some() || !self.failed_colorings.is_empty())
        {
            return self
                .failed_colorings
                .iter()
                .map(|coloring| {
                    format!(
                        "Invalid coloring at pushdata idx {}: {}",
                        coloring.pushdata_idx, coloring.error,
                    )
                })
                .chain(
                    self.burn_error
                        .iter()
                        .map(|err| format!("Validation error: {err}")),
                )
                .join(". ");
        }
        let mut s = "Unexpected burn: ".to_string();
        if self.burns_mint_batons {
            s.push_str("Burns mint baton(s)");
            if self.actual_burn_atoms > 0 {
                s.push_str(&format!(" and {} atoms", self.actual_burn_atoms,));
            }
        } else if self.actual_burn_atoms > 0 {
            s.push_str(&format!("Burns {} atoms", self.actual_burn_atoms,));
        }
        if let Some(intentional_burn_atoms) = self.intentional_burn_atoms {
            if self.actual_burn_atoms > 0 {
                s.push_str(&format!(
                    ", but intended to burn {intentional_burn_atoms}"
                ));
                let intentional_burn_atoms = intentional_burn_atoms as u128;
                if intentional_burn_atoms > self.actual_burn_atoms {
                    s.push_str(&format!(
                        "; burned {} too few",
                        intentional_burn_atoms - self.actual_burn_atoms
                    ));
                } else {
                    s.push_str(&format!(
                        "; burned {} too many",
                        self.actual_burn_atoms - intentional_burn_atoms
                    ));
                }
            } else if self.burns_mint_batons {
                s.push_str(&format!(
                    "; expected {intentional_burn_atoms} atoms to be burned \
                     instead"
                ));
            } else {
                s.push_str(&format!(
                    "Expected {intentional_burn_atoms} atoms to be burned, \
                     but none found"
                ));
            }
        }
        if self.failed_colorings.is_empty() && self.burn_error.is_none() {
            return s;
        }
        s.push_str(". Reason(s):");
        for coloring in &self.failed_colorings {
            s.push_str(&format!(
                " Invalid coloring at pushdata idx {}: {}.",
                coloring.pushdata_idx, coloring.error,
            ));
        }
        if let Some(err) = &self.burn_error {
            s.push(' ');
            s.push_str(&err.to_string());
        }
        s
    }
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_str_eq;

    use crate::{
        alp::{burn_section, sections_opreturn, send_section},
        test_helpers::{
            empty_entry, meta_alp, spent_atoms, spent_baton, verify, TOKEN_ID1,
        },
        token_tx::TokenTxEntry,
        token_type::AlpTokenType::*,
    };

    #[test]
    fn test_burn_summary_ok() {
        assert_str_eq!(empty_entry().burn_summary(), "OK: No burn");
        assert_str_eq!(
            TokenTxEntry {
                actual_burn_atoms: 1234,
                intentional_burn_atoms: Some(1234),
                ..empty_entry()
            }
            .burn_summary(),
            "OK: Intentional burn of 1234 atoms",
        );
    }

    #[test]
    fn test_burn_summary_no_actual_burn() {
        assert_str_eq!(
            verify::<2>(
                sections_opreturn(vec![
                    send_section(&TOKEN_ID1, Standard, [1, 2, 3]),
                    send_section(&TOKEN_ID1, Standard, [1, 2, 3, 4, 5]),
                    send_section(&TOKEN_ID1, Standard, [1, 2]),
                ]),
                &[],
            )
            .entries[0]
                .burn_summary(),
            "Invalid coloring at pushdata idx 0: Too few outputs, expected 4 \
             but got 3. Invalid coloring at pushdata idx 1: Too few outputs, \
             expected 6 but got 3. Validation error: Insufficient token input \
             output sum: 0 < 3",
        );
    }

    #[test]
    fn test_burn_summary_burns_mint_batons() {
        assert_str_eq!(
            TokenTxEntry {
                burns_mint_batons: true,
                ..empty_entry()
            }
            .burn_summary(),
            "Unexpected burn: Burns mint baton(s)",
        );
        assert_str_eq!(
            TokenTxEntry {
                actual_burn_atoms: 1234,
                burns_mint_batons: true,
                ..empty_entry()
            }
            .burn_summary(),
            "Unexpected burn: Burns mint baton(s) and 1234 atoms",
        );
    }

    #[test]
    fn test_burn_summary_burns_tokens() {
        assert_str_eq!(
            TokenTxEntry {
                actual_burn_atoms: 1234,
                ..empty_entry()
            }
            .burn_summary(),
            "Unexpected burn: Burns 1234 atoms",
        );
    }

    #[test]
    fn test_burn_summary_wrong_intentional_burn() {
        assert_str_eq!(
            TokenTxEntry {
                actual_burn_atoms: 1000,
                intentional_burn_atoms: Some(3000),
                ..empty_entry()
            }
            .burn_summary(),
            "Unexpected burn: Burns 1000 atoms, but intended to burn 3000; \
             burned 2000 too few",
        );
        assert_str_eq!(
            TokenTxEntry {
                actual_burn_atoms: 3000,
                intentional_burn_atoms: Some(1000),
                ..empty_entry()
            }
            .burn_summary(),
            "Unexpected burn: Burns 3000 atoms, but intended to burn 1000; \
             burned 2000 too many",
        );
        assert_str_eq!(
            TokenTxEntry {
                intentional_burn_atoms: Some(1000),
                ..empty_entry()
            }
            .burn_summary(),
            "Unexpected burn: Expected 1000 atoms to be burned, but none found",
        );
        assert_str_eq!(
            TokenTxEntry {
                intentional_burn_atoms: Some(1000),
                burns_mint_batons: true,
                ..empty_entry()
            }
            .burn_summary(),
            "Unexpected burn: Burns mint baton(s); expected 1000 atoms to be \
             burned instead",
        );
        assert_str_eq!(
            TokenTxEntry {
                actual_burn_atoms: 3000,
                intentional_burn_atoms: Some(1000),
                burns_mint_batons: true,
                ..empty_entry()
            }
            .burn_summary(),
            "Unexpected burn: Burns mint baton(s) and 3000 atoms, but \
             intended to burn 1000; burned 2000 too many",
        );
    }

    #[test]
    fn test_burn_summary_actual_burn_reasons() {
        assert_str_eq!(
            verify::<2>(
                sections_opreturn(vec![
                    send_section(&TOKEN_ID1, Standard, [1, 2, 3]),
                    send_section(&TOKEN_ID1, Standard, [1, 2, 3, 4, 5]),
                    send_section(&TOKEN_ID1, Standard, [1, 2]),
                ]),
                &[spent_atoms(meta_alp(TOKEN_ID1), 2)],
            )
            .entries[0]
                .burn_summary(),
            "Unexpected burn: Burns 2 atoms. Reason(s): Invalid coloring at \
             pushdata idx 0: Too few outputs, expected 4 but got 3. Invalid \
             coloring at pushdata idx 1: Too few outputs, expected 6 but got \
             3. Insufficient token input output sum: 2 < 3",
        );
        assert_str_eq!(
            verify::<2>(
                sections_opreturn(vec![
                    send_section(&TOKEN_ID1, Standard, [1, 2, 3]),
                    send_section(&TOKEN_ID1, Standard, [1, 2]),
                    burn_section(&TOKEN_ID1, Standard, 5),
                ]),
                &[
                    spent_atoms(meta_alp(TOKEN_ID1), 2),
                    spent_baton(meta_alp(TOKEN_ID1)),
                ],
            )
            .entries[0]
                .burn_summary(),
            "Unexpected burn: Burns mint baton(s) and 2 atoms, but intended \
             to burn 5; burned 3 too few. Reason(s): Invalid coloring at \
             pushdata idx 0: Too few outputs, expected 4 but got 3. \
             Insufficient token input output sum: 2 < 3",
        );
    }
}
