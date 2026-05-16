# FertilAI IoT / Device API

Bu dokümantasyon, FertilAI Advisor v2'ye sensör veya hava istasyonu cihazlarının
veri göndermesi için sağlanan HTTP API'sini açıklar.

Mevcut sistem demo simülasyon verisiyle çalışır. Gerçek bir cihaz (ESP32, Raspberry
Pi, dış hava sağlayıcı, vb.) aşağıdaki endpoint'lere POST yaparak sistemi gerçek
veri ile beslemeye başlayabilir. Veriler `source = DEVICE_API` veya
`source = EXTERNAL_API` olarak işaretlenir ve dashboard'da otomatik olarak
"Gerçek cihaz verisi" / "Harici hava API verisi" rozetiyle görünür.

---

## Güvenlik

Tüm IoT endpoint'leri tek bir paylaşılan API anahtarı ile korunmaktadır.

| Header                     | Değer                                            |
|----------------------------|--------------------------------------------------|
| `x-fertilai-device-key`    | `.env` dosyasındaki `FERTILAI_DEVICE_API_KEY`    |
| `Content-Type`             | `application/json`                               |

Lokal ortamda varsayılan anahtar `dev-device-key`'dir. Üretimde mutlaka uzun ve
rastgele bir değerle değiştirilmelidir. Anahtar yoksa veya yanlışsa endpoint
`401 Unauthorized` döner.

> Not: Bu sürüm tek bir global cihaz anahtarı kullanır. İleride per-device key
> rotasyonu için `apiKeyLabel` alanı schema'da hazır tutulmaktadır.

---

## 1. Sensör Verisi Gönderme

`POST /api/iot/sensor-readings`

### İstek gövdesi

```json
{
  "fieldId":        "seed-field-001",
  "temperature":    27.4,
  "humidity":       65,
  "ph":             6.4,
  "ec":             2.3,
  "lightLevel":     58000,
  "soilMoisture":   62,
  "irrigationOn":   false,
  "ventilationOn":  true,
  "lightingOn":     false,
  "deviceId":       "ESP32-A1"
}
```

| Alan            | Tip       | Zorunlu | Notlar                                           |
|-----------------|-----------|---------|--------------------------------------------------|
| `fieldId`       | string    | ✓       | Hedef seranın ID'si                              |
| `temperature`   | number    |         | °C                                               |
| `humidity`      | number    |         | %                                                |
| `ph`            | number    |         | 0–14                                             |
| `ec`            | number    |         | dS/m                                             |
| `lightLevel`    | number    |         | lux                                              |
| `soilMoisture`  | number    |         | %                                                |
| `irrigationOn`  | boolean   |         | Sulama hattının fiziksel durumu                  |
| `ventilationOn` | boolean   |         | Havalandırmanın fiziksel durumu                  |
| `lightingOn`    | boolean   |         | Aydınlatmanın fiziksel durumu                    |
| `deviceId`      | string    |         | Cihazın seri / yerel adı (dashboard'da gösterilir)|

Sayısal alanlar opsiyoneldir; eksik gelen alan `null` olarak kaydedilir.

### Örnek `curl`

```bash
curl -X POST http://localhost:3000/api/iot/sensor-readings \
  -H "Content-Type: application/json" \
  -H "x-fertilai-device-key: dev-device-key" \
  -d '{
    "fieldId":      "seed-field-001",
    "temperature":  27.4,
    "humidity":     65,
    "ph":           6.4,
    "ec":           2.3,
    "lightLevel":   58000,
    "soilMoisture": 62,
    "deviceId":     "ESP32-A1"
  }'
```

### Başarılı yanıt

```json
{
  "ok": true,
  "id": "ckxyz...",
  "fieldId": "seed-field-001",
  "createdAt": "2026-05-12T10:00:00.000Z",
  "source": "DEVICE_API"
}
```

---

## 2. Hava Durumu Verisi Gönderme

`POST /api/iot/weather-readings`

### İstek gövdesi

```json
{
  "fieldId":            "seed-field-001",
  "outsideTemperature": 24.5,
  "outsideHumidity":    42,
  "rainChance":         10,
  "windSpeed":          15,
  "solarRadiation":     720,
  "condition":          "SUNNY",
  "provider":           "OpenWeatherMap"
}
```

| Alan                 | Tip     | Notlar                                                        |
|----------------------|---------|---------------------------------------------------------------|
| `fieldId`            | string  | Zorunlu. Hedef sera                                           |
| `outsideTemperature` | number  | °C                                                            |
| `outsideHumidity`    | number  | %                                                             |
| `rainChance`         | number  | %                                                             |
| `windSpeed`          | number  | km/h                                                          |
| `solarRadiation`     | number  | W/m²                                                          |
| `condition`          | string  | `SUNNY` \| `CLOUDY` \| `RAINY` \| `WINDY` \| `STORMY`         |
| `provider`           | string  | Veri sağlayıcının adı (dashboard'da görünür)                  |

### Örnek `curl`

```bash
curl -X POST http://localhost:3000/api/iot/weather-readings \
  -H "Content-Type: application/json" \
  -H "x-fertilai-device-key: dev-device-key" \
  -d '{
    "fieldId":            "seed-field-001",
    "outsideTemperature": 24.5,
    "outsideHumidity":    42,
    "rainChance":         10,
    "windSpeed":          15,
    "solarRadiation":     720,
    "condition":          "SUNNY",
    "provider":           "OpenWeatherMap"
  }'
```

---

## 3. Veri Kaynağı Ayrımı

`SensorReading` ve `WeatherReading` modelleri artık `source` alanına sahip:

| Sensör kaynağı | Anlamı                                          | Dashboard rozeti        |
|----------------|-------------------------------------------------|-------------------------|
| `SIMULATION`   | Seed / demo üretici                             | "Demo simülasyon verisi"|
| `MANUAL`       | İleride manuel form üzerinden girilecek değer   | "Manuel"                |
| `DEVICE_API`   | `/api/iot/sensor-readings` üzerinden gelen veri | "Gerçek cihaz verisi"   |

| Hava kaynağı   | Anlamı                                          | Dashboard rozeti        |
|----------------|-------------------------------------------------|-------------------------|
| `SIMULATION`   | Seed / demo üretici                             | "Demo hava verisi"      |
| `MANUAL`       | Manuel giriş                                    | "Manuel"                |
| `EXTERNAL_API` | `/api/iot/weather-readings` üzerinden harici API| "Harici hava API verisi"|

Mevcut simülasyon mantığı (`runAutomation`, `generateAssistantOutput`,
`runFertigation`) kaynaktan bağımsız çalışır — yani gerçek cihaz verisi
geldiğinde de tüm öneri/otomasyon zinciri aynı şekilde tetiklenir.

---

## 4. ESP32 / Donanım Entegrasyonu

Genel akış:

1. ESP32 sıcaklık + nem + EC + pH + toprak nemi sensörlerini okur.
2. WiFi üzerinden FertilAI sunucusuna HTTP POST yapar:
   - URL: `https://<sunucu>/api/iot/sensor-readings`
   - Header: `x-fertilai-device-key: <prod_key>`
   - Body: yukarıdaki JSON şeması
3. Cihaz ID'sini `deviceId` alanına yazar (ör. `"GH-A1-NODE-3"`).
4. 5–15 dakika aralıklarla periyodik gönderim yapar.

### Minimum ESP32 (Arduino) iskeleti

```c
#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "...";
const char* WIFI_PASS = "...";
const char* ENDPOINT  = "https://fertilai.example.com/api/iot/sensor-readings";
const char* DEVICE_KEY = "prod-secret-key";
const char* FIELD_ID   = "seed-field-001";
const char* DEVICE_ID  = "GH-A1-NODE-3";

void sendReading(float temp, float hum, float ph, float ec, float soil) {
  HTTPClient http;
  http.begin(ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-fertilai-device-key", DEVICE_KEY);

  String body = "{";
  body += "\"fieldId\":\""    + String(FIELD_ID)   + "\",";
  body += "\"deviceId\":\""   + String(DEVICE_ID)  + "\",";
  body += "\"temperature\":"  + String(temp)       + ",";
  body += "\"humidity\":"     + String(hum)        + ",";
  body += "\"ph\":"           + String(ph)         + ",";
  body += "\"ec\":"           + String(ec)         + ",";
  body += "\"soilMoisture\":" + String(soil);
  body += "}";

  int code = http.POST(body);
  Serial.printf("POST %d\n", code);
  http.end();
}
```

---

## 5. Yol Haritası (sonraki adımlar)

- Per-device API anahtarı tablosu + `apiKeyLabel` üzerinden rotasyon
- Cihaz kayıt akışı (`/dashboard/farmer/devices`) ile pairing kodu
- Cihazlardan komut alma (downstream) için MQTT veya SSE kanalı
- Rate limiting / quota kontrolü (örn. her cihaz dakikada 1 okuma)
- OpenWeatherMap / Meteoroloji Genel Müdürlüğü cron'u: arka planda otomatik
  `EXTERNAL_API` kaydı yazan scheduled job
