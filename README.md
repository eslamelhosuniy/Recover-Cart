# 🛒 Recover - E-Commerce & Calendar Booking Automation Platform

منصة أتمتة متكاملة وذكية لاسترجاع السلات المهجورة وأتمتة حجوزات وتذكيرات المواعيد عبر واتساب (WhatsApp Business API) والتكامل مع منصات التجارة الإلكترونية مثل **سلة (Salla)** وأنظمة إدارة العملاء والمواعيد مثل **GoHighLevel (GHL)**.

---

## ✨ المميزات الرئيسية (Features)

### 📅 1. أتمتة مواعيد GoHighLevel (GHL Calendar Automation)
- 🚀 **استقبال فوري عبر الـ Webhook:** استقبال بيانات الحجوزات والمواعيد والعملاء من تقاويم GoHighLevel في الوقت الفعلي.
- 💬 **تأكيد فوري عبر واتساب:** إرسال رسالة تأكيد/تذكير فورية للعميل بمجرد إتمام الحجز بالاسم والتاريخ والوقت ورابط الاجتماع (Google Meet).
- ⏰ **تذكيرات ذكية مجدولة قبل الموعد:** فحص دوري مجدول كل 5 دقائق لإرسال رسالة تذكيرية للعميل قبل موعده (مثلاً قبل الموعد بـ 1 ساعة أو حسب الإعدادات).
- 🔘 **إرسال تذكير يدوي فوري من الواجهة (Manual Trigger):** إمكانية إرسال تذكير واتساب لأي عميل بضغطة زر واحدة من لوحة التحكم.
- 🔄 **إدارة دورة حياة الموعد:** تحديث المواعيد تلقائياً عند إعادة الجدولة أو الإلغاء في GoHighLevel وإيقاف التذكيرات المعلقة.

### 🛒 2. استرجاع السلات المهجورة (Salla Cart Recovery)
- 🛒 **استقبال فوري من سلة:** تتبع السلات المتروكة والعملاء وقيمة السلة ورابط إكمال الدفع.
- 🤖 **تذكيرات آلية:** إرسال رسائل تذكيرية بالسلة مع كوبونات خصم وصورة مخصصة.
- ⭐️ **طلبات التقييم:** أتمتة طلب تقييمات العملاء بعد استرجاع السلة بنجاح.

### ✉️ 3. التسويق عبر البريد الإلكتروني (Email Marketing & Validation)
- 📧 **تكامل SendGrid:** إدارة قوائم الاتصال، الحملات الإعلانية، والتصاميم.
- 🔍 **فحص الإيميلات:** التحقق من صحة البريد الإلكتروني (MX, SMTP, Syntax).

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

- **Backend:** FastAPI, Python, SQLAlchemy (Async), PostgreSQL, APScheduler, Alembic.
- **Frontend:** React, Vite, React Router, Modern CSS & UI Components.
- **Integrations:** Meta WhatsApp Cloud API, GoHighLevel Webhooks, Salla Webhooks, SendGrid API.

---

## 🚀 واجهات الـ Webhooks البرمجية (Webhook Endpoints)

| الخدمة | المسار (Endpoint) | الطريقة | الوصف |
| :--- | :--- | :--- | :--- |
| **GoHighLevel** | `/api/v1/webhooks/ghl?store_id={STORE_ID}` | `POST` | استقبال حجوزات المواعيد وأتمتة التذكيرات |
| **Salla** | `/api/v1/webhooks/salla?store_id={STORE_ID}` | `POST` | استقبال أحداث السلات المتروكة والتقييمات |
| **WhatsApp** | `/api/v1/webhooks/whatsapp?store_id={STORE_ID}` | `POST / GET` | استقبال تحديثات حالة تسليم وقراءة الرسائل |

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
* **الأزرار:** لا يوجد أزرار.

### 2️⃣ قالب تذكير الموعد (`appointment_reminder`)
* **الفئة (Category):** `MARKETING`
* **المتغيرات (Body Parameters):**
  * `{{1}}` (`{{link}}`): رابط الاجتماع أو Google Meet (مثال: `https://meet.google.com/xyz`)
* **التوقيت:** يُرسل آلياً قبل بدء الموعد بـ 15 دقيقة.

---

## 🚀 طريقة التشغيل والنشر (Setup & Deployment)

### 1. إعداد قاعدة البيانات والـ Migrations
```bash
cd backend
alembic upgrade head
```

### 2. تشغيل الـ Backend
```bash
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
pytest
```
