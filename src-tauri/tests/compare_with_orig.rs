use opentelugu_lib::converter::convert;
use std::collections::HashMap;
use std::fs;

#[test]
fn test_exhaustive_against_original_js() {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let json_path = std::path::Path::new(manifest_dir)
        .join("tests")
        .join("fixtures")
        .join("exhaustive_js_results.json");
    let content = fs::read_to_string(&json_path)
        .unwrap_or_else(|e| panic!("Failed to read test fixture at {:?}: {}", json_path, e));
    let test_map: HashMap<String, String> = serde_json::from_str(&content).expect("Invalid JSON");

    let mut matches = 0;
    let mut mismatches = Vec::new();

    for (input, expected_pua) in test_map {
        let actual = convert(&input);
        if actual.pua_text == expected_pua {
            matches += 1;
        } else {
            mismatches.push((input, expected_pua, actual.pua_text));
        }
    }

    println!("Total Keys Tested: {}", matches + mismatches.len());
    println!("Matched: {}", matches);
    println!("Mismatched: {}", mismatches.len());

    for (inp, exp, act) in &mismatches {
        println!("MISMATCH on '{}':", inp);
        println!("  Expected (orig JS): {:?}", exp.chars().map(|c| format!("{:x}", c as u32)).collect::<Vec<_>>());
        println!("  Actual (Rust):     {:?}", act.chars().map(|c| format!("{:x}", c as u32)).collect::<Vec<_>>());
    }

    assert!(mismatches.is_empty(), "Mismatches found: {}", mismatches.len());
}
