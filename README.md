# 🎮 Nickname Game - ساحة الألعاب

منصة ألعاب تفاعلية مع نظام أكواد واشتراكات متقدم.

Interactive gaming platform with advanced subscription codes system.

## ✨ المميزات / Features

### 🎭 الألعاب / Games
- **لعبة الألقاب (Titles Game)**: لعبة تخمين الهوية بين الزملاء - Identity guessing game among colleagues
- **صيد القميري (Fameeri Hunt)**: لوحة تحكم للتنافس الثقافي بين المجموعات - Dashboard for cultural competition between groups

### 🎫 نظام الأكواد / Codes System
- ✅ توليد أكواد اشتراكات / Generate subscription codes
- ✅ 3 باقات (يوم، 3 أيام، أسبوع) / 3 packages (1 day, 3 days, 7 days)
- ✅ حماية من المشاركة (جهازين كحد أقصى) / Device limit protection (max 2 devices)
- ✅ مؤشر الوقت المتبقي / Subscription timer
- ✅ لوحة تحكم Admin / Admin dashboard

### 🔒 الأمان / Security
- Firebase Realtime Database
- محمي بقواعد أمان محكمة / Protected with strict security rules
- Device Fingerprinting
- تشفير البيانات الحساسة / Sensitive data encryption

## 🚀 التشغيل المحلي / Local Development

```bash
# تثبيت المكتبات / Install dependencies
npm install

# تشغيل المشروع / Run development server
npm run dev

# بناء للإنتاج / Build for production
npm run build
```

## 🔧 الإعدادات / Configuration

1. انسخ `.env.example` إلى `.env` / Copy `.env.example` to `.env`
2. أضف بيانات Firebase الخاصة بك / Add your Firebase credentials
3. ارفع Firebase Security Rules من `firebase-database-rules.json` / Upload Firebase Security Rules

## 📱 المتطلبات / Requirements

- Node.js 18+
- npm 9+
- Firebase Account

## 🏗️ بنية المشروع / Project Structure

```
nickname-game/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── firebase.js
│   ├── pages/           # الصفحات الرئيسية / Main pages
│   ├── games/           # الألعاب / Games (titles, fameeri)
│   ├── components/      # مكوّنات مشتركة (أكواد، أدمن) / Shared UI (codes, admin)
│   ├── core/            # تهيئة Firebase والثوابت / Firebase bootstrap & constants
│   ├── shared/          # مكوّنات بصرية صغيرة / Small shared widgets
│   ├── styles/          # الأنماط / Styles
│   └── utils/           # دوال مساعدة / Helpers
├── firebase-database-rules.json
├── .env.example
├── index.html
├── vite.config.js
└── package.json
```
