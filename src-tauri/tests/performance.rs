use havit_console_lib::device_registry::discover_havit_devices;
use havit_console_lib::devices::fuxi_h7::windows_audio::query_peaks;
use havit_console_lib::devices::kb884l::image_codec::{rgba_to_rgb565_bytes, LCD_HEIGHT, LCD_WIDTH};
use image::{Rgba, RgbaImage};
use std::time::Instant;

#[test]
fn run_performance_benchmarks() {
    println!("\n=======================================================");
    println!("           HAVIT CONSOLE PERFORMANCE BENCHMARKS         ");
    println!("=======================================================\n");

    // 1. Audio Peak Meter Query Latency
    println!("[1/4] Benchmarking WASAPI Audio Peak Meter (`query_peaks`)...");
    let warm_up = query_peaks();
    let _ = warm_up;
    std::thread::sleep(std::time::Duration::from_millis(50));

    let audio_iterations = 2_000;
    let start_audio = Instant::now();
    for _ in 0..audio_iterations {
        let _ = query_peaks();
    }
    let audio_duration = start_audio.elapsed();
    let avg_audio_us = audio_duration.as_micros() as f64 / audio_iterations as f64;
    let audio_qps = (audio_iterations as f64 / audio_duration.as_secs_f64()).round();

    println!("  -> Iterations: {}", audio_iterations);
    println!("  -> Total time: {:.2?}", audio_duration);
    println!("  -> Average latency: {:.2} µs / query", avg_audio_us);
    println!("  -> Max theoretical throughput: {} queries/sec", audio_qps);

    // 2. KB884L LCD Frame Processing (160x96 RGBA -> RGB565)
    println!("\n[2/4] Benchmarking 160x96 LCD RGB565 Frame Encoding...");
    let mut test_img = RgbaImage::new(LCD_WIDTH, LCD_HEIGHT);
    for (x, y, pixel) in test_img.enumerate_pixels_mut() {
        *pixel = Rgba([((x * 7) % 256) as u8, ((y * 11) % 256) as u8, 128, 255]);
    }

    let dither_iterations = 1_000;
    let start_dither = Instant::now();
    for _ in 0..dither_iterations {
        let _ = rgba_to_rgb565_bytes(&test_img, true);
    }
    let dither_duration = start_dither.elapsed();
    let avg_dither_us = dither_duration.as_micros() as f64 / dither_iterations as f64;
    let fps = dither_iterations as f64 / dither_duration.as_secs_f64();

    println!("  -> Iterations: {}", dither_iterations);
    println!("  -> Resolution: 160x96 ({} pixels)", LCD_WIDTH * LCD_HEIGHT);
    println!("  -> Average frame encode time: {:.2} µs ({:.4} ms)", avg_dither_us, avg_dither_us / 1000.0);
    println!("  -> Encoding throughput: {:.0} frames/sec", fps);

    // 3. USB HID Device Discovery
    println!("\n[3/4] Benchmarking USB HID Device Enumeration & Discovery...");
    let disc_iterations = 50;
    let start_disc = Instant::now();
    for _ in 0..disc_iterations {
        let _ = discover_havit_devices();
    }
    let disc_duration = start_disc.elapsed();
    let avg_disc_ms = disc_duration.as_secs_f64() * 1000.0 / disc_iterations as f64;

    println!("  -> Iterations: {}", disc_iterations);
    println!("  -> Average scan latency: {:.2} ms", avg_disc_ms);

    println!("\n=======================================================\n");
}
