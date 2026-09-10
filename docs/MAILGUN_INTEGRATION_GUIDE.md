# 📮 دليل التكامل والتفعيل الكامل لـ Mailgun (Mailgun Integration Guide)

يقدم هذا الدليل شرحاً تفصيلياً شاملاً لكيفية إعداد وربط مزود البريد الإلكتروني **Mailgun** في منصة **Recover**، بما في ذلك إعداد النطاقات وسجلات الـ DNS، ضبط الـ Webhooks والتوقيع المشفر، واستخدام محرك الإحماء (Warmup Engine).

---

## 1. الحصول على بيانات الربط من لوحة Mailgun

1. سجل الدخول إلى لوحة تحكم [Mailgun Console](https://app.mailgun.com/).
2. انتقل إلى **Sending > Domains** وأضف نطاق الإرسال الخاص بك (مثلاً: `mail.wedadmarketing.com`).
3. توجه إلى **Settings > API Keys**:
   - **Mailgun API Key:** قم بنسخ الـ Primary API key (أو أنشئ مفتاحاً جديداً).
   - **HTTP Webhook Signing Key:** انسخ المفتاح الخاص بتوقيع الـ Webhooks (يستخدم في التحقق من صحة الرسائل القادمة من Mailgun عبر HMAC-SHA256).

---

## 2. ضبط سجلات الـ DNS للنطاق (DNS Configuration)

لضمان وصول الرسائل إلى صندوق الوارد (Inbox) وتفادي الـ Spam، يجب إضافة السجلات التالية لدى مزود النطاق (مثل Cloudflare أو Namecheap أو GoDaddy):

| النوع (Type) | الاسم (Hostname / Name) | القيمة (Value / Content) | الأولوية (Priority) | الوصف |
| :--- | :--- | :--- | :--- | :--- |
| **TXT** | `mail.wedadmarketing.com` | `v=spf1 include:mailgun.org ~all` | - | توثيق الـ SPF |
| **TXT** | `k1._domainkey.mail.wedadmarketing.com` | *(القيمة المستخرجة من Mailgun)* | - | توثيق الـ DKIM |
| **MX** | `mail.wedadmarketing.com` | `mxa.mailgun.org` | 10 | استقبال وإعادة التوجيه (US) |
| **MX** | `mail.wedadmarketing.com` | `mxb.mailgun.org` | 10 | استقبال وإعادة التوجيه (US) |
| **CNAME** | `email.mail.wedadmarketing.com` | `mailgun.org` | - | تتبع الروابط والنقرات (US) |

> [!TIP]
> إذا كان النطاق منشأً في منطقة الاتحاد الأوروبي (EU Region)، استبدل `mailgun.org` بـ `eu.mailgun.org`.

---

## 3. تفعيل الربط في لوحة تحكم Recover

1. ادخل إلى صفحة **الإعدادات (`Settings`)** في المتجر.
2. في قسم **مزود خدمة البريد (Email Provider)**، اختر **Mailgun (الافتراضي)**.
3. أدخل البيانات:
   - **Mailgun API Key:** المفتاح السري الخاص بك.
   - **Sending Domain:** النطاق المعتمد (مثال: `mail.wedadmarketing.com`).
   - **Region:** اختر `US (api.mailgun.net)` أو `EU (api.eu.mailgun.net)`.
   - **HTTP Webhook Signing Key:** مفتاح توقيع الـ Webhook.
   - **اسم وعنوان المرسل (From Name & Email):** مثل `info@wedadmarketing.com` و `Wedad Marketing`.
4. اضغط على **"فحص سجلات DNS وجودة النطاق"**:
   - سيقوم النظام بفحص حي ومباشر لسجلات الـ SPF, DKIM, MX, CNAME ويعرض حالة كل سجل بالألوان (أخضر = نشط وسليم، رمادي/أحمر = بحاجة لتهيئة).
5. اضغط على **"حفظ الإعدادات"**.

---

## 4. إعداد الـ Webhooks في Mailgun

لاستقبال تحديثات التسليم والفتحات والنقرات لحظياً وتحديث تقارير الحملات:

1. في لوحة تحكم Mailgun، اذهب إلى **Sending > Webhooks**.
2. اختر النطاق `mail.wedadmarketing.com`.
3. انسخ رابط الـ Webhook المخصص لمتجرك من صفحة الإعدادات:
   ```text
   https://[YOUR_DOMAIN]/api/v1/webhooks/mailgun/[STORE_ID]
   ```
4. أضف الـ Webhook وقم بتفعيل الأحداث التالية:
   - ✅ **Permanent Failure** (الارتداد القاسي - Hard Bounce)
   - ✅ **Temporary Failure** (الارتداد المؤقت - Soft Bounce / Deferred)
   - ✅ **Delivered Messages** (تم تسليم الرسالة)
   - ✅ **Opened Messages** (فتح البريد)
   - ✅ **Clicked Links** (الضغط على الروابط)
   - ✅ **Unsubscribed** (إلغاء الاشتراك)
   - ✅ **Complaints** (الشكاوى والتبليغ عن Spam)

### 🔒 آلية الحماية التشفيرية (HMAC-SHA256 Verification):
يقوم خادم FastAPI بفحص توقيع كل إشعار وارد عبر المعادلة التشفيرية:
$$\text{HMAC-SHA256}(SigningKey, \text{timestamp} + \text{token})$$
ويتم مقارنة الناتج مع التوقيع المرسل باستخدام `hmac.compare_digest` لحماية النظام تماماً من أي تزوير أو هجمات التوقيت (Timing Attacks).

---

## 5. محرك الإحماء وإرسال الحملات (Warmup & Batch Sending)

### أ) الإرسال بالدفعات (Batch Sending)
- يدعم النظام إرسال البريد لما يصل إلى **1,000 مستلم في الطلب الواحد** عبر ميزة `recipient-variables` في Mailgun، مما يقلل عدد طلبات الـ HTTP بنسبة 99.9% ويسرع الإرسال بشكل هائل.

### ب) محرك الإحماء التدريجي (Campaign Warmup)
- عند تفعيل خيار **"تفعيل الإحماء التدريجي للنطاق"** في أي حملة، يقوم النظام تلقائياً بجدولة الإرسال وفق الجدول القياسي لحماية سمعة النطاق:
  - **اليوم الأول:** 45 رسالة
  - **اليوم الثاني:** 90 رسالة
  - **اليوم الثالث:** 180 رسالة
  - **اليوم الرابع:** 360 رسالة
  - **اليوم الخامس:** 720 رسالة
  - **اليوم السادس فصاعداً:** 1,440 رسالة (تضاعف يومي حتى اكتمال القائمة)
- يتم وسم كل دفعة بـ `warmup-day-X` لتتبع معدلات الفتح والتسليم لكل يوم على حدة.

### ج) إحماء الـ Dedicated IP (للحسابات المتقدمة)
- إذا كان لديك Dedicated IP في Mailgun، يمكنك مراقبة وتفعيل ميزة الـ Automated Warmup الخاصة به مباشرة من لوحة تحكم المتجر.

---

## 6. فحص الإيميلات (Email Validation)

- يعتمد النظام على الـ **Mailgun v4 Validations Endpoint** الأحدث لفحص جودة وصحة الإيميلات قبل إطلاق الحملات، مما يرفع معدل التسليم (Deliverability Rate) ويحمي النطاق من الوقوع في القوائم السوداء.
