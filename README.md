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

---

## 🚀 طريقة التشغيل والنشر (Setup & Deployment)

إذا كنت ترغب في تشغيل المشروع كبيئة إنتاج (Production)، يرجى تتبع الخطوات التالية بدقة:

### 1. إعداد متغيرات البيئة للـ Backend
جميع المتغيرات الحساسة الخاصة بالخادم (Backend) موجودة داخل ملف `backend/.env`. تأكد من إنشاء هذا الملف (بناءً على `.env.example`) وتعبئة البيانات التالية:

- `DATABASE_URL`: رابط اتصال قاعدة بيانات PostgreSQL الفعلي (مثل AWS RDS أو خادمك الخاص).
- `SALLA_WEBHOOK_SECRET`: الرمز السري الذي يوفره لك موقع مطوري سلة للتحقق من هوية الطلبات (Webhook Signature).
- `WHATSAPP_TOKEN`: التوكن الدائم الخاص بالـ API من حساب Meta Developers.
- `WHATSAPP_PHONE_NUMBER_ID`: رقم المعرف الخاص برقم الواتساب المرسل.
- `WHATSAPP_TEMPLATE_NAME`: **اسم القالب (Template Name)** المعتمد في Meta لإرساله كتذكير بالسلة (الافتراضي هو `abandoned_cart_reminder`).
- `REMINDER_DELAY_HOURS`: عدد الساعات التي يجب أن ينتظرها الخادم بعد السلة المهجورة ليقوم بإرسال رسالة التذكير (مثلاً: 1 ساعة أو 24 ساعة).
- `APP_ENV`: يفضل تعيينه كـ `production`.

### 2. إعداد متغيرات الواجهة الأمامية للـ Dashboard
في حال أردت رفع لوحة التحكم على الإنترنت (أو تشغيلها من سيرفر مستقل)، يجب عليك توجيهها للاتصال بـ API الخاص بك:

- افتح ملف `dashboard/script.js`.
- في **السطر الأول** من الملف، قم بتغيير المتغير `API_BASE` إلى رابط الدومين الفعلي للـ Backend الخاص بك، هكذا:
  ```javascript
  const API_BASE = 'https://api.yourdomain.com/api/v1'; 
  ```

### 3. إعداد سلة (Salla Developer Portal)
- قم بتسجيل الـ Webhook الخاص بنظامك ليتم توجيهه إلى:
  `https://api.yourdomain.com/api/v1/webhooks/salla`
- قم باختيار الحدث (Event) كـ `order.abandoned`.

### 4. تشغيل الخادم
لتشغيل الخادم، قم بتنفيذ أوامر التهجير (Migrations) لبناء قاعدة البيانات:
```bash
cd backend
alembic upgrade head
```

ثم لتشغيل الخادم في بيئة الـ Production، يُنصح باستخدام `gunicorn` (مع تثبيته إذا لم يكن موجوداً):
```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

---

## 🧪 تشغيل الاختبارات (Testing)
تمت كتابة اختبارات أساسية باستخدام `pytest` للتأكد من نظام أمان سلة ومعمارية الـ API. لتشغيلها:
```bash
cd backend
pytest
```
