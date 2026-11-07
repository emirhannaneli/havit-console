# ⚡ Havit Console

<div align="center">

**Tüm Havit oyuncu ekipmanları için tek, hafif ve açık kaynaklı donanım kontrol merkezi.**

[![License: MIT](https://img.shields.io/badge/License-MIT-rose.svg)](LICENSE)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2.2-blue.svg)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-1.99+-orange.svg)](https://www.rust-lang.org/)
[![React 19](https://img.shields.io/badge/React-19.0-cyan.svg)](https://react.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4.0-38bdf8.svg)](https://tailwindcss.com)
[![Reverse Engineered with rea](https://img.shields.io/badge/RE-morluto%2Frea%20%2B%20Ghidra-emerald.svg)](https://github.com/morluto/rea)

</div>

---

## 📖 Neden Havit Console?

Orijinal üretici yazılımları genellikle kapalı kaynaklıdır, arka planda yüzlerce megabayt bellek (RAM) tüketir, birden fazla cihazınız varsa her biri için ayrı ayrı çalıştırılması gerekir ve bazen sistem çökmelerine yol açabilir.

**Havit Console**, resmi Havit yazılımlarının [`morluto/rea`](https://github.com/morluto/rea) ve **Ghidra 12.1.4** ile temiz oda (*clean-room*) tersine mühendisliği yapılarak **Tauri v2 + Rust** mimarisiyle sıfırdan geliştirilmiş birleşik kontrol konsoludur:

- 🚀 **Ultra Hafif:** Sistem tepsisinde sadece ~10-15 MB RAM tüketir (Electron tabanlı yazılımların 1/20'si).
- 🔒 **Güvenli ve Gizlilik Odaklı:** Sıfır telemetri, sıfır arka plan servisi. Tüm ayarlar doğrudan cihazınızın NVRAM'ine ve yerel JSON profillerine kaydedilir.
- 🎯 **Birleşik Kontrol:** Klavye, kulaklık, fare ve mikrofon için tek arayüz.
- ⚡ **Doğrudan HID:** Ek üçüncü parti sürücülere ihtiyaç duymadan yerel Windows CoreAudio ve USB HID protokolleri üzerinden anlık donanım iletişimi.

---

## 🎮 Desteklenen Cihazlar & Özellikler

### 1. Havit KB884L RGB TFT Gaming Keyboard
- **USB Tanımlayıcıları:** `VID: 0x05AC`, `PID: 0x024F` (Rongyuan HFD RKGK890 OEM)
- **85-Tuş İnteraktif Görselleştirici:** Tuş vuruşları, HID tarama kodları ve fiziksel LED matris indeksleri.
- **RGB Aydınlatma Motoru:** 11 donanımsal aydınlatma modu (Static, Breathing, Wave, Ripple, Reactive vb.), parlaklık (1..5), hız (1..5), yön ve 24-bit renk paleti.
- **160×96 Mini TFT Ekran Yöneticisi:**
  - GIF, PNG, JPG, WEBP animasyon ve görsel yükleyici.
  - Otomatik 160×96 ölçekleme ve RGB565 big-endian dönüştürücü.
  - Çoklu kare (frame) önizleme karuseli ve kare gecikme süreleri (ms).
  - 4KB parçalar halinde `0xFF68` Output raporları üzerinden yüksek hızlı TFT aktarımı.
- **Saat Senkronizasyonu:** Tek tıklamayla bilgisayar saatini klavyenin mini ekranına anlık eşitleme (`0x2804` bankı).
- **Donanım Ayarları:** Windows tuş kilidi, Fn kilit modu, uyku zamanlayıcısı ve debounce gecikmesi (1ms, 2ms, 8ms).

### 2. Havit Fuxi-H7 Quad-Mode Wireless Gaming Headset
- **USB Tanımlayıcıları:** `VID: 0x040B`, `PID: 0x0897` (XiiSound Audio + Vendor HID `0xF100`)
- **Windows CoreAudio Kontrolleri:** Ana ses seviyesi, anlık sessize alma (Mute) ve sol/sağ (L/R) kanal dengesi.
- **Mikrofon Kontrolleri:** Mikrofon kazancı ve sessize alma.
- **10-Bant Grafik Ekolayzır (DSP):**
  - Frekans bantları: `30 Hz`, `60 Hz`, `120 Hz`, `250 Hz`, `500 Hz`, `1 kHz`, `2 kHz`, `4 kHz`, `8 kHz`, `16 kHz`.
  - Kazanç aralığı: `-20 dB` .. `+20 dB`.
  - Hazır E-Spor Profilleri: *Varsayılan, Bass Boost, Treble Boost, Rock, Live, Dance, PUBG / FPS Ayak Sesi, Valorant*.
  - Etkileşimli dinamik frekans tepki eğrisi (spline graph).
- **DSP Modları:** 7.1 Sanal Surround Ses, Mikrofon ENC (Çevre Gürültüsü Engelleme), Sidetone ve oda akustiği.

### 3. Geliştirici & Tanılama Konsolu (HID Paket İzleyici)
- Klavyeye ve kulaklığa gönderilen ve alınan tüm USB HID Feature / Output paketlerinin canlı hex dökümü.
- Tersine mühendislik araştırmaları için tek tıklamayla hex bayt kopyalama.

---

## 🛠️ Kurulum & Geliştirici Ortamı

### Gereksinimler
- **Node.js:** v18 veya üzeri
- **Rust Toolchain:** `rustc` & `cargo` 1.80+ (MSVC ABI)
- **İşletim Sistemi:** Windows 10 / 11 (64-bit)

### Projeyi Çalıştırma

```bash
# 1. Depoyu klonlayın
git clone https://github.com/emirh/havit-console.git
cd havit-console

# 2. Bağımlılıkları yükleyin
npm install

# 3. Geliştirici modunda başlatın (Hot-Reloading aktif)
npm run tauri dev
```

### Üretim Paketi Oluşturma (Standalone .exe / .msi)

```bash
npm run tauri build
```
Derlenen tek parça bağımsız çalıştırılabilir dosya `src-tauri/target/release/` dizininde oluşturulacaktır.

---

## 📚 Tersine Mühendislik & Protokol Dokümantasyonu

Protokollerin bayt seviyesindeki mimari analizlerine ve paket yapılarına `docs/` dizininden erişebilirsiniz:

- 📑 [`docs/protocols/kb884l.md`](docs/protocols/kb884l.md) — KB884L HID transaction yapısı, bank seçimleri, RGB ve TFT ekran stream spesifikasyonu.
- 📑 [`docs/protocols/fuxi-h7.md`](docs/protocols/fuxi-h7.md) — Fuxi-H7 USB Audio, `0xF100` dongle HID bağlantısı ve 10-bant DSP mimarisi.
- 📑 [`docs/ECOSYSTEM_FAMILIES.md`](docs/ECOSYSTEM_FAMILIES.md) — 54 farklı Havit modelinin mimari aile eşleştirmesi (Rongyuan HFD, XiiSound, QMK/VIA, Houyi).

---

## 🤝 Katkıda Bulunma

Havit Console topluluk odaklı açık kaynaklı bir projedir. Yeni bir Havit cihazı eklemek veya katkıda bulunmak için [`CONTRIBUTING.md`](CONTRIBUTING.md) rehberine göz atabilirsiniz.

---

## 📄 Lisans

Bu proje **MIT Lisansı** altında lisanslanmıştır. Detaylar için [`LICENSE`](LICENSE) dosyasına bakınız.
