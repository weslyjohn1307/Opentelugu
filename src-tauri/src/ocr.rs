// OpenTelugu - 100% Offline Telugu OCR Engine
// Leverages embedded Tesseract 5 LSTM neural network with tel.traineddata
// Supports PNG, JPEG, WebP, BMP, and clipboard screenshot buffers

use std::fs;
use std::path::{Path, PathBuf};

pub fn get_ocr_engine_path() -> Result<(PathBuf, PathBuf), String> {
    // 1. Try relative to current executable directory (production installed path)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let bundled_bin = exe_dir.join("resources").join("ocr").join("bin").join("tesseract.exe");
            let bundled_tessdata = exe_dir.join("resources").join("ocr").join("tessdata");
            if bundled_bin.exists() && bundled_tessdata.exists() {
                return Ok((bundled_bin, bundled_tessdata));
            }

            // Direct subfolder check
            let sub_bin = exe_dir.join("ocr").join("bin").join("tesseract.exe");
            let sub_tessdata = exe_dir.join("ocr").join("tessdata");
            if sub_bin.exists() && sub_tessdata.exists() {
                return Ok((sub_bin, sub_tessdata));
            }

            // Parent dir resources check (e.g. if installed in bin/)
            if let Some(parent) = exe_dir.parent() {
                let p_bundled = parent.join("resources").join("ocr").join("bin").join("tesseract.exe");
                let p_tessdata = parent.join("resources").join("ocr").join("tessdata");
                if p_bundled.exists() && p_tessdata.exists() {
                    return Ok((p_bundled, p_tessdata));
                }
            }
        }
    }

    // 2. Try current working directory (dev mode)
    let dev_bin = PathBuf::from("resources/ocr/bin/tesseract.exe");
    let dev_tessdata = PathBuf::from("resources/ocr/tessdata");
    if dev_bin.exists() && dev_tessdata.exists() {
        return Ok((dev_bin, dev_tessdata));
    }

    // 3. Try standard project structure relative to src-tauri
    let tauri_dev_bin = PathBuf::from("src-tauri/resources/ocr/bin/tesseract.exe");
    let tauri_dev_tessdata = PathBuf::from("src-tauri/resources/ocr/tessdata");
    if tauri_dev_bin.exists() && tauri_dev_tessdata.exists() {
        return Ok((tauri_dev_bin, tauri_dev_tessdata));
    }

    // 4. Try system Tesseract if available
    let sys_bin = PathBuf::from(r"C:\Program Files\Tesseract-OCR\tesseract.exe");
    let sys_tessdata = PathBuf::from(r"C:\Program Files\Tesseract-OCR\tessdata");
    if sys_bin.exists() {
        if tauri_dev_tessdata.exists() {
            return Ok((sys_bin, tauri_dev_tessdata));
        }
        if sys_tessdata.exists() {
            return Ok((sys_bin, sys_tessdata));
        }
    }

    Err("Could not locate local offline OCR engine (tesseract.exe / tel.traineddata).".into())
}

pub fn recognize_image_bytes(image_bytes: &[u8]) -> Result<String, String> {
    if image_bytes.is_empty() {
        return Err("Image buffer is empty.".into());
    }

    let (tesseract_bin, tessdata_dir) = get_ocr_engine_path()?;

    // Create temporary image file
    let temp_dir = std::env::temp_dir();
    let temp_img_path = temp_dir.join(format!("opentelugu_ocr_{}.png", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis()));

    fs::write(&temp_img_path, image_bytes)
        .map_err(|e| format!("Failed to write temporary OCR image: {}", e))?;

    let output = execute_tesseract(&tesseract_bin, &tessdata_dir, &temp_img_path);

    // Clean up temporary file
    let _ = fs::remove_file(&temp_img_path);

    output
}

pub fn recognize_image_file<P: AsRef<Path>>(file_path: P) -> Result<String, String> {
    let path = file_path.as_ref();
    if !path.exists() {
        return Err(format!("Image file does not exist: {}", path.display()));
    }

    let (tesseract_bin, tessdata_dir) = get_ocr_engine_path()?;
    execute_tesseract(&tesseract_bin, &tessdata_dir, path)
}

fn execute_tesseract(tesseract_bin: &Path, tessdata_dir: &Path, input_image: &Path) -> Result<String, String> {
    let mut cmd = std::process::Command::new(tesseract_bin);
    cmd.arg(input_image)
        .arg("stdout")
        .arg("-l")
        .arg("tel+eng")
        .arg("--tessdata-dir")
        .arg(tessdata_dir)
        .arg("--oem")
        .arg("1") // LSTM engine only
        .arg("--psm")
        .arg("3"); // Fully automatic page segmentation

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let output = cmd.output().map_err(|e| format!("Failed to spawn OCR process: {}", e))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("OCR recognition failed (code {:?}): {}", output.status.code(), err_msg));
    }

    let recognized = String::from_utf8_lossy(&output.stdout);
    // Clean form feeds, carriage returns, trailing whitespace
    let cleaned = recognized
        .replace('\x0c', "")
        .replace("\r\n", "\n")
        .trim()
        .to_string();

    Ok(cleaned)
}
