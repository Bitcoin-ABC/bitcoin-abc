use std::collections::HashMap;

use bitcoinsuite_chronik_client::proto::{OutPoint, Token, TokenInfo};
use bitcoinsuite_core::Script;
use chrono::DateTime;
use chrono_humanize::HumanTime;
use humansize::{file_size_opts as options, FileSize};
use maud::{html, PreEscaped};
use num_format::{Locale, ToFormattedString};
use regex::bytes::Regex;

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

pub fn render_miner(coinbase_data: &[u8]) -> askama::Result<String> {
    // Miners identified exactly by utf8 string in coinbase data
    let self_identified_miners = [
        "Mining-Dutch",
        "ZULUPooL",
        "zpool.ca",
        "molepool.com",
        "CoinMinerz.com",
        "zergpool.com",
        "solopool.org",
        "p2p-spb.xyz",
        "Cminors-Pools",
        "with Om Power",
        "nodeStratum",
    ];

    for &str_to_match in &self_identified_miners {
        if contains_subslice(coinbase_data, str_to_match.as_bytes()) {
            return Ok(str_to_match.to_string());
        }
    }

    // Miners with identifying coinbase data substring that must be clarified
    // for the user
    let partial_string_miners = [("Hath", "Hathor-MM")];

    for &(str_to_match, str_to_show) in &partial_string_miners {
        if contains_subslice(coinbase_data, str_to_match.as_bytes()) {
            return Ok(str_to_show.to_string());
        }
    }

    // Pools with identifiable miners

    // ViaBTC
    let reg_viabtc =
        Regex::new(r"ViaBTC(.*/Mined by (?P<mined_by>\w+)/)?").unwrap();
    if let Some(captures) = reg_viabtc.captures(coinbase_data) {
        if let Some(mined_by) = captures.name("mined_by") {
            return Ok(format!(
                "ViaBTC | Mined by {}",
                String::from_utf8_lossy(mined_by.as_bytes())
            ));
        };
        return Ok("ViaBTC".to_string());
    };

    // CK Pool
    // Note: CK Pool software is used by solo miners
    // Parse as solo miners unless CK Pool is the only identifier
    let reg_ckpool =
        Regex::new(r"ckpool(.*/mined by (?P<mined_by>\w+)/)?").unwrap();
    if let Some(captures) = reg_ckpool.captures(coinbase_data) {
        if let Some(mined_by) = captures.name("mined_by") {
            return Ok(format!(
                "{}",
                String::from_utf8_lossy(mined_by.as_bytes())
            ));
        };
        return Ok("CK Pool".to_string());
    };

    // Miner not recognized, return "Unknown"
    return Ok("Unknown".to_string());
}

pub fn contains_subslice(haystack: &[u8], needle: &[u8]) -> bool {
    haystack
        .windows(needle.len())
        .any(|window| window == needle)
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

pub fn string_to_i128(value: &String) -> askama::Result<i128> {
    Ok(value.parse::<i128>().unwrap())
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

#[cfg(test)]
mod tests {
    use crate::templating::filters::{contains_subslice, render_miner};

    #[test]
    fn test_contains_subslice() {
        // Returns true if substring is present
        assert_eq!(contains_subslice(b"abcdefViaBTCghijk", b"ViaBTC"), true);
        // Returns false if substring is not present
        assert_eq!(
            contains_subslice(b"abcdefViaBTCghijk", b"Mining-Dutch"),
            false
        );
        // Returns true if substring matches whole string
        assert_eq!(
            contains_subslice(b"abcdefViaBTCghijk", b"abcdefViaBTCghijk"),
            true
        );
        // Returns true if substring occurs more than once
        assert_eq!(contains_subslice(b"abcabcabc", b"abc"), true);
    }
    #[test]
    fn test_render_miner() {
        // ViaBTC 791160 (mined by 260786)

        // Note: To build mocks using coinbase hex as bytes:
        // 1 - In python, run bytes.fromhex("<coinbase_hex_of_block>")
        // 2 - Use double quotes to wrap output, not single quotes ("" not '')
        // 3 - Manually format across multiple lines by adding '\' before
        //     line breaks
        // 4 - Any double quotes inside the bytes string must be escaped with
        // '\'

        let via_coinbase_hex = b"\x03x\x12\x0c\x18/ViaBTC/Mined by \
        260786/\x10;o\xa2\x0f\xf3d\x8ai\xac\xc3\x1e\xd9\xb4\x94l\x00";
        assert_eq!(
            render_miner(via_coinbase_hex).unwrap(),
            "ViaBTC | Mined by 260786"
        );

        // ViaBTC 852373 (mined by zuberjawan)
        let via_zuberjawan_coinbase_hex = b"\x03\x95\x01\r\x1c/ViaBTC\
        /Mined by zuberjawan/\x10\xbf\xde\xb8\x0bV\xe4=\xed\xd0\x03PN\
        \xa2\xaa\x0f\x00";
        assert_eq!(
            render_miner(via_zuberjawan_coinbase_hex).unwrap(),
            "ViaBTC | Mined by zuberjawan"
        );

        // Mining-Dutch 854964
        let md_coinbase_hex = b"\x03\xb4\x0b\r\x04\xca\xa4\xa3f\x08\xfa\
        \xbemmU\xa9\x8co\xaa\xf7\xa7ta\xd5\xe7/\x05d'\x8akl\x94\xe8x\
        \x8bJy\x1a\x01\x90\xc3\xbc\x8e\x04\x8c\x00\x01\x00\x00\x00\x00\
        \x00\x00\x04\xe2H\xcb]A\x00\x00Z\x00\x12/Mining-Dutch/-114";
        assert_eq!(render_miner(md_coinbase_hex).unwrap(), "Mining-Dutch");

        // Hathor-MM 823276
        let hathor_coinbase_hex = b"\x03\xec\x8f\x0cHath=\xec\";v5D\xf2\
        \x88\x19\xdf\x8b\xa9W\x94K\xba\xc2\xe3\\\xb8\xde\x15\x1b\x03\
        \x0e\xde\xe8\x8a\x90\x13Ps\xe0/\x19\x1d\x00\x00\x00";
        assert_eq!(render_miner(hathor_coinbase_hex).unwrap(), "Hathor-MM");

        // Zulu Pool 785677
        // A block with both Hathor and Zulu hex strings is returned as Zulu
        let zulu_coinbase_hex = b"\x03\r\xfd\x0bHath\xa8\x81\xa5K_\xbc(\
        \xb2~\xb3\xedY\xfcI$\xa3\xb9\x91\x03?\xeezx\xb9\x19\x17\n\x92\xd9\
        \xb7\xbe\xafZULUPooL-XEC\x00\x00\x11\xd8\xe9\xbb\x1b\x00";
        assert_eq!(render_miner(zulu_coinbase_hex).unwrap(), "ZULUPooL");

        // CK Pool specified miner TinyChipHub
        // 854770
        let ck_tinychiphub_coinbase_hex = b"\x03\xf2\n\r\x00\x04\xfa\xe1\
        \xa1f\x04Z\x8c\xe5\x02\x0c,^\x9ffX\xe1o>\x86\xee^\x00\nckpool\
        \x16/mined by TinyChipHub/";
        assert_eq!(
            render_miner(ck_tinychiphub_coinbase_hex).unwrap(),
            "TinyChipHub"
        );

        // CK Pool unspecified miner
        // 788631
        let ck_unspecified_coinbase_hex = b"\x03\x97\x08\x0c\x04\x18\
        \x16x\xa1\x04d\x98Ad\x04\xbbg\xca\r\x0c6\x92Adwc\x01\x00\x00\
        \x00\x00\x00\nckpool";
        assert_eq!(
            render_miner(ck_unspecified_coinbase_hex).unwrap(),
            "CK Pool"
        );

        // zpool 790863
        let zpool_coinbase_hex = b"\x03O\x11\x0c\x04`*Wd\x08B\x00\x07\
        \x90wB+\x01zpool.ca\x00\xfa\xbemm\xa8!)D&e.\xbd\x8c\xff\x8d\xf5\
        \xe0/\xfc\xbb\xdc\x1b\x1d\x9e\x90\"\x83*\xcfM\x07\x1e\x9b\xfa-\
        \x95 \x00\x00\x00\x00\x00\x00\x00";
        assert_eq!(render_miner(zpool_coinbase_hex).unwrap(), "zpool.ca");

        // molepool.com 796646
        let molepool_coinbase_hex = b"\x03\xe6'\x0c\x04}%\x8cd\x00\x18\
        \x96 \xe6\xfe\xe4\xe2\x17\x0e/molepool.com/";
        assert_eq!(
            render_miner(molepool_coinbase_hex).unwrap(),
            "molepool.com"
        );

        // CoinMinerz.com 787515
        let coinminerz_coinbase_hex = b"\x03;\x04\x0c\x04\x92\x9a7d\
        \x08b\xc9\xc3\x13\x19\x1b\x1e\x00\x10/CoinMinerz.com/";
        assert_eq!(
            render_miner(coinminerz_coinbase_hex).unwrap(),
            "CoinMinerz.com"
        );

        // zergpool.com 806676
        let zergpool_coinbase_hex = b"\x03\x14O\x0c\x04\xb0\x1e\xe7d\
        \x08\x81\x06\t\x08-\xc3\x06\x00zergpool.com\x00\xfa\xbemm'@\
        \x1f=\xb7\xd7\xaf\x86Z\xfe\xba\xb8\r|\xb55~}\xf5\xaa\xe8b\
        \x1eF\xc2\xaa|\x90\xbb\xfc\xdb\xca\x02\x00\x00\x00\x00\x00\
        \x00\x00";
        assert_eq!(
            render_miner(zergpool_coinbase_hex).unwrap(),
            "zergpool.com"
        );

        // solopool.org 806713
        let solopool_coinbase_hex = b"\x039O\x0c\x04R\x9e\xe7d\x08\
        \xf5\x1e\xec\xb6Q\xd0I\x04\x0csolopool.org";
        assert_eq!(
            render_miner(solopool_coinbase_hex).unwrap(),
            "solopool.org"
        );

        // p2p-spb 821556
        let p2pspb_coinbase_hex = b"\x034\x89\x0c,\xfa\xbemm*5\x7f\
        \xe8\xc5f\x8c\x1e\xddX\xa4.\xaa\xa1\x81\xf4\x9a\xfc\xf3\x97\
        \xcdj\xe2GS\x93\xec\x06\xcf\xcab\xf0\x10\x00\x00\x00\x00\
        \x00\x00\x00p2p-spb.xyz";
        assert_eq!(render_miner(p2pspb_coinbase_hex).unwrap(), "p2p-spb.xyz");

        // Cminors-Pools 827550
        let cminors_coinbase_hex = b"\x03\x9e\xa0\x0c\x04)\xc1\xa7e\
        \x08\x81\x00\x00\x1f\xa1Zh\x00Cminors-Pools\x00\xfa\xbemm\
        \xf3o<\xed\x97\xaa\xc3c\xe4\xf5 .K9\xd59EM\x9d!\xc4\x08\xdf\
        \x8a\xc4\xbe\x8e\xb96`B\x0b\x01\x00\x00\x00\x00\x00\x00\x00";
        assert_eq!(
            render_miner(cminors_coinbase_hex).unwrap(),
            "Cminors-Pools"
        );

        // AnandrajSingh Pool 840619
        let anandra_coinbase_hex = b"\x03\xab\xd3\x0c\x00\x04j6!f\x04\
        i\x94\xe2\x10\x0c`\x1f!f\x88hD\x00\x00\x00\x00\
        \x00 Mined by with Om Power /AnandrajSingh Pool/\r \xf0\x9f\
        \x8f\x86\xf0\x9f\x8f\x86\xf0\x9f\x8f\x86";
        assert_eq!(
            render_miner(anandra_coinbase_hex).unwrap(),
            "with Om Power"
        );

        // nodeStratum 856227
        let nodestratum_coinbase_hex = b"\x03\xa3\x10\r\x04\xabF\xaef\x08\
        \xfa\xbemm\x1dYZ\xdbWv\x91,y\xed)d\xf6<\x8a\xdd\x8b7\xdb\x9e=\
        pR\xaf>+PIpW\xfe\xb5\x04\x00\x00\x00\x00\x00\x00\x00\xb1V\xdbd`\
        \x14\x00\x00\r/nodeStratum/";
        assert_eq!(
            render_miner(nodestratum_coinbase_hex).unwrap(),
            "nodeStratum"
        );

        // Unknown miner
        // genesis block 0
        let unknown_coinbase_hex = b"\x04\xff\xff\x00\x1d\x01\x04\
        EThe Times 03/Jan/2009 Chancellor on brink of second \
        bailout for banks";
        assert_eq!(render_miner(unknown_coinbase_hex).unwrap(), "Unknown");
    }
}
