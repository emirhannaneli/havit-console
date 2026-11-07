# 🤝 Havit Console'a Katkıda Bulunma Rehberi

Havit Console açık kaynaklı bir topluluk projesidir. Yeni Havit çevre birimleri eklemek, hata bildirmek veya arayüzü geliştirmek isteyen herkesin katkılarına açığız!

---

## 🏗️ Mimari Yapı

Proje iki ana katmandan oluşur:

1. **Rust Çekirdeği (`src-tauri/src/`):**
   - `transport/hid.rs`: USB HID cihazları ile iletişim (Feature Reports, Output Reports, Overlapped I/O).
   - `device_registry.rs`: Bağlı USB aygıtlarının tespiti ve yetenek haritası.
   - `devices/`: Cihazlara özel protokol sürücüleri (`kb884l`, `fuxi_h7`).
   - `packet_log.rs`: Geliştirici hata ayıklama ve canlı HID paket kayıt sistemi.
   - `profiles.rs`: Kullanıcı yapılandırmalarının yerel JSON saklama motoru.
2. **Kullanıcı Arayüzü (`src/`):**
   - React 19 + TypeScript + Tailwind CSS v4.
   - Modüler bileşenler (`components/kb884l`, `components/fuxi`, `components/profiles`, `components/diagnostics`).

---

## 🔌 Yeni Bir Havit Cihazı Nasıl Eklenir?

`docs/ECOSYSTEM_FAMILIES.md` dosyasında listelendiği gibi, Havit çevre birimleri 4 ana OEM ailesine dayanmaktadır:

1. **Rongyuan / HFD Ailesi (Klavyeler):** `0xFF13` Feature report transaction lifecycle kullanır.
2. **XiiSound Ailesi (Kulaklıklar):** Windows CoreAudio + `0xF100` dongle HID linki kullanır.
3. **QMK / VIA Ailesi:** Açık standart raw HID (`0xFF60`) protokolü kullanır.
4. **Houyi / VS Ailesi (Fareler):** 64-baytlık sensör ve DPI paketleri kullanır.

### Adım Adım Cihaz Ekleme:

1. **VID / PID Tespiti:**
   Cihazınızı bilgisayara takın ve PowerShell üzerinden VID/PID değerlerini öğrenin:
   ```powershell
   Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -like "*VID_*" }
   ```

2. **Protokol Analizi:**
   Resmi üretici yazılımını `morluto/rea` ve Ghidra ile inceleyerek HID rapor kimliklerini (Report ID) ve paket formatını belirleyin.

3. **Cihaz Kaydının Eklenmesi (`src-tauri/src/device_registry.rs`):**
   `discover_havit_devices()` fonksiyonuna yeni cihazınızın VID/PID ve yetenek (`DeviceCapabilities`) tanımını ekleyin.

4. **Sürücü Modülü (`src-tauri/src/devices/<cihaz_adi>/`):**
   Gereken donanım komutlarını (RGB aydınlatma, DPI, tuş haritası vb.) yazın.

5. **Arayüz Bileşeni (`src/components/<cihaz_adi>/`):**
   Kullanıcının donanımı yönetebileceği React bileşenini tasarlayın ve `src/App.tsx` içine sekmeyi ekleyin.

---

## 🧪 Test ve Doğrulama

Değişikliklerinizi göndermeden önce mutlaka derleme ve testleri çalıştırın:

```bash
# Frontend derleme kontrolü
npm run build

# Rust çekirdek derleme ve test kontrolü
cd src-tauri
cargo check
cargo test
```

---

## 📜 Çekme İstekleri (Pull Request)

1. Depoyu forklayın ve yeni bir dal (branch) açın: `git checkout -b feature/yeni-cihaz`
2. Anlaşılır commit mesajları kullanın.
3. PR açıklamasında test ettiğiniz fiziksel cihaz modelini ve çalışma kanıtını (ekran görüntüsü veya HID log) belirtin.
