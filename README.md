# 🛒 Recover - E-Commerce, Email Marketing & Calendar Booking Automation Platform

منصة أتمتة متكاملة وذكية لاسترجاع السلات المهجورة، التسويق عبر البريد الإلكتروني (Multi-Provider Email Marketing: Mailgun & SendGrid)، وأتمتة حجوزات وتذكيرات المواعيد عبر واتساب (WhatsApp Business API)، مع تكامل سلس مع منصات التجارة الإلكترونية مثل **سلة (Salla)** وأنظمة إدارة العملاء والمواعيد مثل **GoHighLevel (GHL)**.

---

## ✨ المميزات الرئيسية (Features)

### ✉️ 1. التسويق عبر البريد الإلكتروني الذكي (Multi-Provider Email Marketing Engine)
- 🚀 **دعم متعدد المزودات (Multi-Provider Architecture):** دعم افتراضي كامل لـ **Mailgun** مع إمكانية التبديل إلى **SendGrid** لكل متجر بشكل منفصل ومرن عبر نمط *Strategy Pattern*.
- 🛡️ **محرك إحماء متطور (Dual-Level Warmup Engine):**
  - **Application-Level Warmup:** جدولة إرسال الحملات الكبيرة تدريجياً على مدار عدة أيام (`o:deliverytime`) لتفادي فلترة الرسائل كـ Spam وبناء سمعة بريدية قوية.
  - **Infrastructure-Level IP Warmup:** تكامل حي مع Mailgun Dedicated IP Warmup API لفحص ومتابعة مراحل إحماء الـ Dedicated IPs.
- 🔍 **فحص جودة النطاق وسجلات الـ DNS (Domain Health Diagnostics):** فحص حي وسريع لسجلات (SPF, DKIM, MX, CNAME) مباشرة من لوحة التحكم للتأكد من جاهزية النطاق للإرسال.
- 🔒 **أمان متقدم للـ Webhooks (HMAC-SHA256 Verification):** استقبال وتوثيق إشعارات البريد بآلية توثيق تشفيرية فائقة الأمان وحماية ضد التلاعب وهجمات التوقيت (Timing Attack Safe).
- 📊 **تتبع حي ودقيق للتفاعل (Unified Event Tracking):** تتبع أحداث التسليم، الفتح، النقرات، الارتداد (Bounces)، الشكاوى (Spam Complaints)، وإلغاء الاشتراك (Unsubscribes).
- 🧹 **فحص والتحقق من صحة الإيميلات (Email Validation):** فحص صيغ البريد، سجلات MX، استجابة SMTP، و Mailgun v4 Validation API لتنظيف القوائم البريدية تلقائياً.

### 📅 2. أتمتة مواعيد GoHighLevel (GHL Calendar Automation)
- 🚀 **استقبال فوري عبر الـ Webhook:** استقبال بيانات الحجوزات والمواعيد والعملاء من تقاويم GoHighLevel في الوقت الفعلي.
- 💬 **تأكيد فوري عبر واتساب:** إرسال رسالة تأكيد/تذكير فورية للعميل بمجرد إتمام الحجز بالاسم والتاريخ والوقت ورابط الاجتماع (Google Meet).
- ⏰ **تذكيرات ذكية مجدولة قبل الموعد:** فحص دوري مجدول كل 5 دقائق لإرسال رسالة تذكيرية للعميل قبل موعده (مثلاً قبل الموعد بـ 15 دقيقة أو حسب الإعدادات).
- 🔘 **إرسال تذكير يدوي فوري من الواجهة (Manual Trigger):** إمكانية إرسال تذكير واتساب لأي عميل بضغطة زر واحدة من لوحة التحكم.
- 🔄 **إدارة دورة حياة الموعد:** تحديث المواعيد تلقائياً عند إعادة الجدولة أو الإلغاء في GoHighLevel وإيقاف التذكيرات المعلقة.

### 🛒 3. استرجاع السلات المهجورة (Salla Cart Recovery)
- 🛒 **استقبال فوري من سلة:** تتبع السلات المتروكة والعملاء وقيمة السلة ورابط إكمال الدفع.
- 🤖 **تذكيرات آلية:** إرسال رسائل تذكيرية بالسلة مع كوبونات خصم وصورة مخصصة.
- ⭐️ **طلبات التقييم:** أتمتة طلب تقييمات العملاء بعد استرجاع السلة بنجاح.

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

- **Backend:** FastAPI (Python 3.10+), SQLAlchemy (Async), PostgreSQL, APScheduler, Alembic, Pydantic v2.
- **Frontend:** React, Vite, React Router, TailwindCSS / Modern Vanilla CSS, Lucide Icons.
- **Email Providers:** Mailgun v3/v4 API (Default), SendGrid v3 API.
- **Integrations:** Meta WhatsApp Cloud API, GoHighLevel Webhooks, Salla Webhooks.

---

## 🚀 واجهات الـ Webhooks البرمجية (Webhook Endpoints)

| الخدمة | المسار (Endpoint) | الطريقة | التوثيق والحماية | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| **Mailgun** | `/api/v1/webhooks/mailgun/{store_id}` | `POST` | HMAC-SHA256 Signature | استقبال أحداث تسليم وتفاعل البريد الإلكتروني |
| **SendGrid** | `/api/v1/webhooks/sendgrid/{store_id}` | `POST` | Store ID verification | استقبال أحداث تسليم البريد من SendGrid |
| **GoHighLevel** | `/api/v1/webhooks/ghl?store_id={STORE_ID}` | `POST` | Query store verification | استقبال حجوزات المواعيد وأتمتة التذكيرات |
| **Salla** | `/api/v1/webhooks/salla?store_id={STORE_ID}` | `POST` | Salla HMAC Signature | استقبال أحداث السلات المتروكة والتقييمات |
| **WhatsApp** | `/api/v1/webhooks/whatsapp?store_id={STORE_ID}` | `POST / GET` | Meta Hub Verify Token | استقبال تحديثات حالة تسليم وقراءة الرسائل |

---

## 📧 إعداد وربط Mailgun (دليل سريع)

1. من صفحة **الإعدادات (`Settings`)** في المتجر، اختر **Mailgun** كمزود للبريد.
2. أدخل مفاتيح الربط:
   - **Mailgun API Key:** مفتاح الـ API الأساسي (يبدأ بـ `key-...` أو أرقام ورموز).
   - **Sending Domain:** نطاق الإرسال المعتمد (مثال: `mail.wedadmarketing.com`).
   - **Region:** اختر `US` أو `EU` بناءً على مكان إنشاء النطاق في حسابك.
   - **HTTP Webhook Signing Key:** المفتاح السري لتوقيع الـ Webhooks.
3. اضغط على زر **"فحص سجلات DNS وجودة النطاق"** للتأكد من أن سجلات الـ SPF و DKIM و MX و CNAME سليمة ونشطة (`Active`).
4. في لوحة **Mailgun > Sending > Webhooks**:
   - أضف رابط الـ Webhook التالي:
     ```text
     https://[YOUR_DOMAIN]/api/v1/webhooks/mailgun/[STORE_ID]
     ```
   - فعّل أحداث: `Delivered`, `Opened`, `Clicked`, `Unsubscribed`, `Complained`, `Permanent Failure`, `Temporary Failure`.

---

## 📅 خطوات ربط GoHighLevel Workflows

1. انسخ رابط الـ Webhook الخاص بمتجرك من صفحة **حجوزات الكاليندر (GHL)** أو صفحة **الإعدادات**:
   ```text
   https://[YOUR_DOMAIN]/api/v1/webhooks/ghl?store_id=[STORE_ID]
   ```
2. في GoHighLevel، انتقل إلى **Automation > Workflows**.
3. أنشئ سير عمل جديد أو اختر سير العمل الخاص بحجز المواعيد.
4. أضف Trigger: **Customer Booked Appointment** أو **Appointment Status**.
5. أضف Action من نوع **Custom Webhook**:
   - **Method:** `POST`
   - **URL:** الرابط المنسوخ أعلاه
6. قم بنشر وتفعيل الـ Workflow (**Publish & Save**).

---

## ⚙️ مواصفات قوالب واتساب المواعيد في Meta (Category: Marketing)

يدعم النظام القالبين التاليين المعتمدين في Meta WhatsApp Business (فئة Marketing):

### 1️⃣ قالب تأكيد الحجز الفوري (`appointment_confirmation`)
* **الفئة (Category):** `MARKETING`
* **المتغيرات (Body Parameters):**
  * `{{1}}` (`{{date}}`): تاريخ الموعد (مثال: `2026-09-13`)
  * `{{2}}` (`{{time}}`): توقيت الموعد (مثال: `05:00 PM`)

### 2️⃣ قالب تذكير الموعد (`appointment_reminder`)
* **الفئة (Category):** `MARKETING`
* **المتغيرات (Body Parameters):**
  * `{{1}}` (`{{link}}`): رابط الاجتماع أو Google Meet (مثال: `https://meet.google.com/xyz`)
* **التوقيت:** يُرسل آلياً قبل بدء الموعد بـ 15 دقيقة (أو حسب الإعدادات المحددة).

---

## 🚀 طريقة التشغيل والنشر (Setup & Deployment)

### 1. إعداد قاعدة البيانات والـ Migrations
```bash
cd backend
alembic upgrade head
```

### 2. تشغيل الـ Backend
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. بناء وتشغيل الـ Frontend
```bash
cd frontend
npm install
npm run dev
# أو للبناء للإنتاج:
npm run build
```

---

## 🧪 تشغيل الاختبارات (Testing)

```bash
cd backend
python -m pytest tests/test_services/test_mailgun_provider.py tests/test_api/test_webhook_api.py
```

