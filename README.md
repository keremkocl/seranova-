<div align="center">

# 🌿 Seranova

**Yapay Zeka Destekli Akıllı Sera Yönetim Platformu**

> ⚠️ Aktif geliştirme aşamasındadır. Özellikler değişmeye devam edebilir.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://prisma.io)
[![Status](https://img.shields.io/badge/status-in%20development-orange)]()

</div>

---

## 🎯 Nedir?

Seranova, sera üreticilerinin günlük kararlarını desteklemek için geliştirilen bir **"sera danışmanı"** platformudur. Donanım bağımlılığı olmadan çalışmayı hedefler — üretici verisini girer, yapay zeka tavsiye üretir, ziraat mühendisi onaylar, çiftçi uygular.

> *"Sera bilgisayarı değil, sera danışmanı."*

---

## ✨ Planlanan Özellikler

- **🌡 İklim Takibi** — Sıcaklık, nem ve CO₂ verilerinin günlük kaydı ve analizi
- **🔔 Erken Uyarı** — Hastalık ve zararlı risklerine karşı proaktif bildirimler
- **📊 Verim Analizi** — Geçmiş verilerle karşılaştırmalı sezon raporları
- **🤖 AI Tavsiye** — Doğal dil tabanlı tarımsal öneri motoru
- **👨‍🌾 Çok Kullanıcı** — Çiftçi / Ziraat Mühendisi / Admin rol hiyerarşisi
- **📱 Mobil Uyumlu** — Responsive arayüz

---

## 🏗 Teknik Mimari
seranova/

├── app/                  # Next.js 15 App Router

│   ├── (dashboard)/      # Korumalı kullanıcı sayfaları

│   ├── api/              # REST API endpoint'leri

│   └── auth/             # NextAuth kimlik doğrulama

├── prisma/

│   └── schema.prisma     # Veritabanı şeması

├── components/           # Yeniden kullanılabilir UI bileşenleri

├── lib/                  # Yardımcı fonksiyonlar ve AI entegrasyonu

└── types/                # TypeScript tip tanımları
**Stack:**

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, NextAuth.js |
| Veritabanı | PostgreSQL + Prisma ORM |
| AI | OpenAI GPT API |
| IoT (Planlı) | ESP32, MQTT protokolü |
| Deploy | Vercel + Supabase |

---

## 🗺 Yol Haritası

- [x] Proje mimarisi ve veritabanı şeması
- [x] Temel kullanıcı kimlik doğrulama sistemi
- [ ] Sera profil yönetimi (devam ediyor)
- [ ] İklim verisi giriş ve görselleştirme
- [ ] AI tavsiye motoru
- [ ] ESP32 IoT sensör entegrasyonu
- [ ] Erken uyarı bildirim sistemi
- [ ] Mobil uygulama (React Native)

---

## 📊 Arka Plan

Türkiye, 77.000+ hektar örtüaltı üretim alanıyla Avrupa'nın en büyük sera tarımı pazarlarından biri. Bu proje, küçük ve orta ölçekli sera işletmelerini (50–500 dekar) hedefliyor.

Geliştirme süreci, 20'den fazla sera işletmecisiyle gerçekleştirilen saha araştırmasına dayanmaktadır.

---

## ⚙️ Kurulum (Geliştirici)

```bash
git clone https://github.com/keremkocl/seranova.git
cd seranova
npm install
cp .env.example .env.local
npx prisma migrate dev
npm run dev
```

---

## 📄 Lisans

[MIT](LICENSE) — Kerem Koç © 2024

---

<div align="center">
<sub>Bursa Uludağ Üniversitesi · Biyosistem Mühendisliği · Geliştirme aşamasında</sub>
</div>
