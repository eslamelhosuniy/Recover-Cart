# 🛒 Recover - Automated Abandoned Cart Recovery SaaS

نظام متكامل مبني لمتجرك على منصة "سلة" للتعامل مع السلات المهجورة واسترجاعها تلقائياً عبر إرسال رسائل وتس اب (WhatsApp Business API). تم بناء النظام باستخدام معمارية نظيفة (Clean Architecture) لضمان الأداء العالي وقابلية التوسع.

## ✨ المميزات (Features)
- 🚀 **استقبال فوري (Webhooks):** استقبال إشعارات السلات المهجورة من سلة في الوقت الفعلي.
- 🔐 **أمان عالي:** التحقق من التوقيع الرقمي (HMAC SHA256) لضمان مصدر البيانات.
- 🤖 **نظام تذكير تلقائي (Jobs):** فحص دوري للسلات المهجورة وإرسال رسائل مخصصة عبر واتساب بعد مرور وقت محدد.
- 📊 **لوحة تحكم تفاعلية (Dashboard):** واجهة مستخدم حديثة لمتابعة الأرباح المسترجعة ونسبة الاسترجاع لحظياً.
- 🏗️ **معماريات برمجية احترافية:** MVC + Repository Pattern.

## 🛠️ التقنيات المستخدمة (Tech Stack)
- **Backend:** FastAPI, Python, SQLAlchemy (Async), PostgreSQL, APScheduler.
- **Frontend:** HTML5, CSS3 (Glassmorphism), Vanilla JavaScript.
- **Database Migrations:** Alembic.

## 🚀 طريقة التشغيل محلياً (Local Setup)

### 1. إعداد قاعدة البيانات
قم بإنشاء قاعدة بيانات PostgreSQL على جهازك، ثم انسخ ملف البيئة:
```bash
cd backend
cp .env.example .env
```
قم بتعديل بيانات `DATABASE_URL` و `SALLA_WEBHOOK_SECRET` داخل ملف `.env`.

### 2. تثبيت المكتبات وتشغيل الـ Migrations
```bash
conda activate recover_cart
pip install -r requirements.txt
alembic upgrade head
```

### 3. تشغيل الخادم
```bash
uvicorn app.main:app --reload
```
الخادم سيعمل على: `http://localhost:8000`
واجهة التوثيق (Swagger UI) متوفرة على: `http://localhost:8000/api/docs`

### 4. تشغيل لوحة التحكم (Dashboard)
فقط قم بفتح ملف `dashboard/index.html` في متصفحك وستعمل اللوحة مباشرة باستخدام البيانات القادمة من الـ API!

## 🧪 تشغيل الاختبارات (Testing)
تمت كتابة اختبارات أساسية باستخدام `pytest`. لتشغيلها:
```bash
cd backend
pytest
```
