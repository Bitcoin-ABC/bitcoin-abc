use std::collections::HashMap;

use bitcoinsuite_chronik_client::proto::{OutPoint, Token, TokenInfo};
use bitcoinsuite_core::Script;
use chrono::DateTime;
use chrono_humanize::HumanTime;
use humansize::{file_size_opts as options, FileSize};
use maud::{html, PreEscaped};
use num_format::{Locale, ToFormattedString};

use crate::blockchain;

fn render_integer_with_small_flag(
    int: i128,
    smallify: bool,
) -> askama::Result<String> {
    let string = int.to_formatted_string(&Locale::en);
    let parts = string.split(',').collect::<Vec<_>>();
    let output = html! {
        @for (idx, part) in parts.iter().enumerate() {
            @if idx >= 2 && smallify {
                small.digit-sep[idx < parts.len() - 1] { (part) }
            } @else {
                span.digit-sep[idx < parts.len() - 1] { (part) }
            }
        }
    };

    Ok(output.into_string())
}

pub fn max(value: &i64, maximum: &i64) -> askama::Result<i64> {
    Ok(*value.max(maximum))
}

pub fn check_is_coinbase(outpoint: &OutPoint) -> askama::Result<bool> {
    Ok(outpoint.txid == [0; 32] && outpoint.out_idx == 0xffff_ffff)
}

pub fn destination_from_script<'a>(
    script: &'a [u8],
    is_token: &bool,
    sats_addr_prefix: &'a str,
    tokens_addr_prefix: &'a str,
) -> askama::Result<blockchain::Destination<'a>> {
    let prefix = if *is_token {
        tokens_addr_prefix
    } else {
        sats_addr_prefix
    };
    Ok(blockchain::destination_from_script(prefix, script))
}

pub fn get_script(signature_script: &[u8]) -> askama::Result<String> {
    let script = Script::from_slice(signature_script);
    Ok(script.to_string())
}

pub fn check_is_token(token: &Option<Token>) -> askama::Result<bool> {
    Ok(token
        .as_ref()
        .map(|slp| slp.amount > 0 || slp.is_mint_baton)
        .unwrap_or(false))
}

pub fn human_time(
    timestamp: &DateTime<chrono::Utc>,
) -> askama::Result<HumanTime> {
    Ok(HumanTime::from(*timestamp))
}

pub fn render_integer(int: &i128) -> askama::Result<String> {
    render_integer_with_small_flag(*int, false)
}

pub fn render_integer_smallify(int: &i128) -> askama::Result<String> {
    render_integer_with_small_flag(*int, true)
}

pub fn render_human_size(value: &u64) -> askama::Result<String> {
    Ok(value.file_size(options::CONVENTIONAL).unwrap())
}

pub fn render_difficulty(difficulty: &f64) -> askama::Result<String> {
    let est_hashrate = difficulty * (0xffffffffu64 as f64) / 600.0;
    let hashrate = if est_hashrate < 1e12 {
        html! { (format!("{:.2} GH/s", est_hashrate / 1e9)) }
    } else if est_hashrate < 1e15 {
        html! { (format!("{:.2} TH/s", est_hashrate / 1e12)) }
    } else if est_hashrate < 1e18 {
        html! { (format!("{:.2} PH/s", est_hashrate / 1e15)) }
    } else {
        html! { (format!("{:.2} EH/s", est_hashrate / 1e18)) }
    };
    let num_digits = difficulty.log10().floor();
    let exponent = (num_digits / 3.0) as u32;
    let difficulty = match exponent {
        0 => html! { (format!("{:.0}", difficulty)) },
        1 => html! { (format!("{:.2}", difficulty / 1e3)) " ×10" sup { "3" } },
        2 => html! { (format!("{:.2}", difficulty / 1e6)) " ×10" sup { "6" } },
        3 => html! { (format!("{:.2}", difficulty / 1e9)) " ×10" sup { "9" } },
        4 => {
            html! { (format!("{:.2}", difficulty / 1e12)) " ×10" sup { "12" } }
        }
        _ => {
            html! { (format!("{:.2}", difficulty / 1e15)) " ×10" sup { "15" } }
        }
    };

    let output = html! {
        (difficulty)
        small {
            " (10 min. blocks = "
            (hashrate)
            ")"
        }
    };
    Ok(output.into_string())
}

pub fn render_integer_with_commas(int: &u64) -> askama::Result<String> {
    let string = int.to_formatted_string(&Locale::en);
    let parts = string.split(',').collect::<Vec<_>>();

    let output = html! {
        @for (idx, part) in parts.iter().enumerate() {
            @if idx != 0 {
                span.non-selectable { "," }
            }
            span { (part) }
        }
    };

    Ok(output.into_string())
}

pub fn render_sats(sats: &i64) -> askama::Result<String> {
    let coins = *sats as f64 / 100.0;
    let fmt = format!("{:.2}", coins);
    let mut parts = fmt.split('.');
    let integer_part: u64 = parts.next().unwrap().parse().unwrap();
    let fract_part = parts.next().unwrap();

    let output = {
        let output = html! {
            (PreEscaped(render_integer_with_commas(&integer_part)?))
            "."
            small {
                (fract_part)
            }
        };
        output.into_string()
    };

    Ok(output)
}

pub fn hexify_u8_vector(value: &[u8]) -> askama::Result<String> {
    Ok(hex::encode(value))
}

pub fn string_from_lossy_utf8(value: &[u8]) -> askama::Result<String> {
    Ok(String::from_utf8_lossy(value).to_string())
}

pub fn to_le_hex(slice: &[u8]) -> askama::Result<String> {
    Ok(blockchain::to_be_hex(slice))
}

pub fn u32_to_u64(value: &u32) -> askama::Result<u64> {
    Ok(*value as u64)
}

pub fn to_i128<T: Into<i128> + Copy>(value: &T) -> askama::Result<i128> {
    Ok((*value).into())
}

pub fn render_token_amount(
    base_amount: &i128,
    decimals: &u32,
) -> askama::Result<String> {
    let decimals = *decimals as usize;
    if decimals == 0 {
        return render_integer(base_amount);
    }
    let base_amount_str =
        format!("{:0digits$}", base_amount, digits = decimals + 1);
    let decimal_idx = base_amount_str.len() - decimals;
    let integer_part: i128 = base_amount_str[..decimal_idx].parse().unwrap();
    let fract_part = &base_amount_str[decimal_idx..];
    let num_fract_sections = (decimals as usize + 2) / 3;
    let mut all_zeros = true;
    let mut rendered = html! {};
    for section_idx in (0..num_fract_sections).rev() {
        let offset = section_idx * 3;
        let section = &fract_part[offset..fract_part.len().min(offset + 3)];
        if !section.chars().all(|c| c == '0') {
            all_zeros = false;
        }
        rendered = html! {
            small.zeros[all_zeros].digit-sep[
                section_idx != num_fract_sections - 1] {
                (section)
            }
            (rendered)
        };
    }
    let output =
        html! { (PreEscaped(render_integer(&integer_part)?)) "." (rendered) };
    Ok(output.into_string())
}

pub fn get_token<'a>(
    tokens: &'a HashMap<String, TokenInfo>,
    token_id: &str,
) -> askama::Result<Option<&'a TokenInfo>> {
    Ok(tokens.get(token_id))
}
