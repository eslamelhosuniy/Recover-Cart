# 🛒 توثيق مشروع: منصة Recover (استرجاع السلات، التسويق بالبريد، وأتمتة المواعيد)

نظام **Recover** هو منصة SaaS سحابية متكاملة توفر أتمتة ذكية للتجارة الإلكترونية وحجوزات المواعيد:
1. **استرجاع السلات المهجورة (Salla Cart Recovery):** عبر رسائل واتساب تفاعلية وكوبونات خصم لمتاجر منصة **سلة (Salla)**.
2. **التسويق عبر البريد الإلكتروني الذكي (Multi-Provider Email Marketing):** دعم متعدد المزودات مع **Mailgun** كمزود افتراضي و **SendGrid**، ومحرك إحماء (Warmup Engine) ثنائي الطبقات وفحص جودة سجلات الـ DNS.
3. **أتمتة حجوزات ومواعيد GoHighLevel (GHL Calendar Automation):** استقبال فوري للحجوزات وتأكيد وتذكير آلي عبر واتساب مع رابط الاجتماع (Google Meet).

---

## 1. المعمارية العامة للمشروع (Architecture Overview)

يعتمد المشروع على بنية معمارية حديثة ومفصولة:
* **Backend:** مبني باستخدام **Python FastAPI** مع اتباع معمارية **Clean Architecture / Strategy Pattern / Repository Pattern** لضمان قابلية التوسع وفصل المسؤوليات.
* **Frontend:** تطبيق **React** مبني باستخدام **Vite** و **TailwindCSS / Modern UI**، متوافق بالكامل مع مختلف الشاشات والأجهزة ويدعم الاتجاهين العربي (RTL) والإنجليزي (LTR).
* **Database:** **PostgreSQL** مع **SQLAlchemy (Async Engine)** واستخدام **Alembic** لإدارة وهجرة مخططات قواعد البيانات.
* **Background Tasks & Scheduler:** **APScheduler** و **Asyncio Background Tasks** لإدارة التذكيرات المجدولة، الإحماء التدريجي للحملات، ومزامنة القوائم البريدية.
* **Security & Auth:** تشفير كلمات المرور بـ **Bcrypt**، مصادقة **JWT (JSON Web Tokens)**، وتحقق توقيعات **HMAC-SHA256** الآمنة لكافة الـ Webhooks (Mailgun, Salla, Meta).

---

## 2. هيكلية المجلدات والملفات (Project Directory Structure)

```
Recover/
├── backend/                                # خادم FastAPI Backend
│   ├── alembic/                            # هجرات وتاريخ تعديلات قاعدة البيانات
│   │   └── versions/                       # ملفات الهجرة التراكمية
│   ├── app/
│   │   ├── controllers/                    # طبقة التحكم (API Endpoints & Routers)
│   │   │   ├── auth_controller.py          # تسجيل الدخول والـ JWT
│   │   │   ├── cart_controller.py          # إدارة السلات المهجورة والمسترجعة
│   │   │   ├── customer_controller.py      # إدارة العملاء
│   │   │   ├── dashboard_controller.py     # مؤشرات الأداء والرسومات البيانية
│   │   │   ├── email_marketing_controller.py # إدارة الحملات، القوائم، التصاميم، وفحص الـ DNS
│   │   │   ├── email_validation_controller.py# فحص والتحقق من صحة الإيميلات
│   │   │   ├── email_webhook_controller.py # استقبال وتوثيق Webhooks البريد (Mailgun & SendGrid)
│   │   │   ├── appointment_controller.py   # إدارة مواعيد GoHighLevel والتذكيرات اليدوية
│   │   │   ├── logs_controller.py          # سجلات النظام والعمليات
│   │   │   ├── message_controller.py       # سجل رسائل واتساب وحالاتها
│   │   │   ├── review_controller.py        # إدارة طلبات التقييم
│   │   │   ├── store_controller.py         # إعدادات المتاجر وتخصيص الربط
│   │   │   ├── webhook_controller.py       # استقبال Webhooks سلة و GoHighLevel
│   │   │   └── whatsapp_webhook_controller.py # استقبال Webhooks تسليم وقراءة واتساب
│   │   ├── core/                           # البنية التحتية الأساسية
│   │   │   ├── database.py                 # جلسات Async SQLAlchemy
│   │   │   ├── security.py                 # دوال التشفير وتوليد الـ JWT
│   │   │   ├── config.py                   # إدارة متغيرات البيئة عبر Pydantic Settings
│   │   │   └── spa.py                      # تقديم واجهة React المبنية كـ Single Page Application
│   │   ├── models/                         # نماذج قاعدة البيانات (SQLAlchemy ORM)
│   │   │   ├── user.py                     # المستخدمين ومدراء النظام
│   │   │   ├── customer.py                 # العملاء
│   │   │   ├── abandoned_cart.py           # السلات المهجورة
│   │   │   ├── recovered_cart.py           # السلات المسترجعة
│   │   │   ├── message_log.py              # سجل رسائل واتساب
│   │   │   ├── store_settings.py           # إعدادات المتجر وبيانات الربط
│   │   │   ├── appointment.py              # مواعيد GoHighLevel
│   │   │   ├── email_setting.py            # إعدادات مزودات البريد (Mailgun / SendGrid)
│   │   │   ├── email_contact.py            # جهات الاتصال والقوائم البريدية
│   │   │   ├── email_campaign.py           # حملات البريد الإلكتروني
│   │   │   ├── email_template.py           # قوالب وتصاميم البريد
│   │   │   └── email_tracking.py           # سجلات تتبع أحداث البريد الموحدة
│   │   ├── repositories/                   # طبقة الوصول للبيانات (Repository Pattern)
│   │   ├── schemas/                        # هياكل التحقق من البيانات (Pydantic Schemas)
│   │   ├── services/                       # منطق الأعمال (Business Logic)
│   │   │   ├── email_providers/            # تطبيق نمط الـ Strategy لمزودات البريد
│   │   │   │   ├── base.py                 # BaseEmailProvider Abstract Class
│   │   │   │   ├── mailgun_client.py       # عميل Mailgun v3/v4 API المتكامل
│   │   │   │   ├── sendgrid_client.py      # عميل SendGrid v3 API المتكامل
│   │   │   │   └── factory.py              # EmailProviderFactory لتحديد المزود لكل متجر
│   │   │   ├── email_marketing_service.py  # منطق الحملات، القوائم، ومحرك الإحماء
│   │   │   ├── email_webhook_processor.py  # معالجة وتوحيد أحداث Webhooks البريد
│   │   │   ├── email_validation_service.py # محرك فحص صحة البريد الإلكتروني
│   │   │   ├── ghl_appointment_service.py  # معالجة حجوزات ومواعيد GoHighLevel
│   │   │   ├── whatsapp_service.py         # إرسال رسائل Meta Cloud API
│   │   │   └── cart_recovery_service.py    # منطق استرجاع السلات
│   │   └── jobs/                           # المهام المجدولة في الخلفية (APScheduler)
│   │       ├── scheduler.py                # تهيئة وإدارة محرك الجدولة
│   │       ├── appointment_reminder_job.py # فحص وإرسال تذكيرات المواعيد الدورية
│   │       └── sync_sendgrid_job.py        # مزامنة بيانات المزود
│   ├── frontend_dist/                      # ملفات الـ React Frontend بعد البناء للإنتاج
│   ├── tests/                              # حزم الاختبارات المؤتمتة (Pytest & Async Tests)
│   ├── requirements.txt                    # مكتبات الـ Backend
│   └── reset_pass.py                       # سكربت لتهيئة مستخدم رئيسي
│
└── frontend/                               # واجهة المستخدم React (Vite)
    ├── src/
    │   ├── api/client.js                   # عميل Axios ومكتبة دوال الـ API
    │   ├── components/                     # الكومبوننتس المشتركة (Navbar, Sidebar, Tables, Badges)
    │   ├── contexts/AuthContext.jsx        # إدارة جلسة الدخول وبيانات المتجر
    │   ├── pages/                          # صفحات لوحة التحكم
    │   │   ├── Dashboard.jsx               # اللوحة الرئيسية والإحصائيات
    │   │   ├── Carts.jsx                   # السلات المهجورة
    │   │   ├── RecoveredCarts.jsx          # السلات المسترجعة
    │   │   ├── Appointments.jsx            # مواعيد وتقاويم GoHighLevel
    │   │   ├── EmailCampaigns.jsx          # حملات البريد الإلكتروني والإحماء
    │   │   ├── EmailContacts.jsx           # القوائم وجهات الاتصال البريدية
    │   │   ├── EmailDesigns.jsx            # تصاميم وقوالب البريد
    │   │   ├── EmailValidation.jsx         # أداة فحص صحة الإيميلات
    │   │   ├── Customers.jsx               # قائمة العملاء
    │   │   ├── Messages.jsx                # سجل رسائل واتساب
    │   │   └── Settings.jsx                # إعدادات النظام ومزودات البريد (Mailgun / SendGrid)
    │   ├── App.jsx                         # التوجيه وإعداد المسارات المحمية
    │   └── index.css                       # سمات وتنسيقات التصميم
    └── package.json
```

---

## 3. نماذج قاعدة البيانات الرئيسية (Database Models Schema)

### 3.1 إعدادات البريد (`EmailSetting`)
```python
id                           : UUID (PK)
store_id                     : FK (Store.id, Unique)
provider                     : String (Default: "mailgun") # "mailgun" or "sendgrid"
# Mailgun Configurations
mailgun_api_key              : String (Encrypted/Masked)
mailgun_domain               : String (e.g. "mail.wedadmarketing.com")
mailgun_region               : String (Default: "us") # "us" or "eu"
mailgun_webhook_signing_key  : String # HMAC-SHA256 Verification Key
mailgun_default_list_address : String (Nullable)
mailgun_ip_pool              : String (Nullable)
# SendGrid Configurations
sendgrid_api_key             : String (Nullable)
from_email                   : String
from_name                    : String
reply_to_email               : String (Nullable)
track_opens                  : Boolean (Default: True)
track_clicks                 : Boolean (Default: True)
created_at / updated_at      : DateTime
```

### 3.2 مواعيد GoHighLevel (`Appointment`)
```python
id              : UUID (PK)
store_id        : FK (Store.id, Indexed)
ghl_id          : String (Indexed)
customer_id     : FK (Customer.id, Nullable)
customer_name   : String
customer_phone  : String (Indexed)
customer_email  : String (Nullable)
appointment_time: DateTime (Indexed)
calendar_name   : String (Nullable)
meet_link       : String (Nullable)
status          : String # booked, confirmed, cancelled, completed
reminder_sent   : Boolean (Default: False)
created_at      : DateTime
```

### 3.3 تتبع أحداث البريد الموحد (`EmailTrackingLog`)
```python
id              : UUID (PK)
store_id        : FK (Store.id, Indexed)
campaign_id     : FK (EmailCampaign.id, Nullable)
contact_id      : FK (EmailContact.id, Nullable)
provider        : String # "mailgun" or "sendgrid"
event_type      : String # delivered, opened, clicked, bounce, spam, unsub
recipient_email : String (Indexed)
message_id      : String (Nullable, Indexed)
user_agent      : String (Nullable)
ip_address      : String (Nullable)
url_clicked     : String (Nullable)
raw_event       : JSONB / Text
timestamp       : DateTime
```

---

## 4. مسارات الـ API (API Endpoints Reference)

### 4.1 البريد الإلكتروني والتسويق (Email Marketing)
* `GET /api/v1/email-marketing/settings/{store_id}`: جلب إعدادات مزود البريد الحالي.
* `PUT /api/v1/email-marketing/settings/{store_id}`: حفظ وتحديث إعدادات Mailgun أو SendGrid.
* `GET /api/v1/email-marketing/mailgun/{store_id}/domain-status`: فحص حي لسجلات الـ DNS (SPF, DKIM, MX, CNAME).
* `GET /api/v1/email-marketing/mailgun/{store_id}/ip-warmup`: استعلام حالة إحماء الـ Dedicated IPs في Mailgun.
* `POST /api/v1/email-marketing/mailgun/{store_id}/ip-warmup/toggle`: تفعيل أو إيقاف إحماء الـ IP المخصص.
* `POST /api/v1/email-marketing/sync-provider/{store_id}`: مزامنة القوائم والتصاميم مع المزود النشط.
* `POST /api/v1/email-marketing/campaigns/{store_id}`: إنشاء حملة بريدية جديدة (دعم خيار الإحماء التلقائي).
* `POST /api/v1/email-marketing/send-single/{store_id}`: إرسال بريد تجريبي أو معاملاتي فوري.

### 4.2 فحص صحة الإيميلات (Email Validation)
* `POST /api/v1/email-validation/validate-single`: فحص فوري لبريد إلكتروني واحد.
* `POST /api/v1/email-validation/validate-list/{store_id}`: فحص مجمع لقائمة جهات اتصال بريدية.

### 4.3 مواعيد GoHighLevel (Appointments)
* `GET /api/v1/appointments/{store_id}`: استعراض قائمة الحجوزات والمواعيد.
* `POST /api/v1/appointments/{store_id}/{appointment_id}/send-reminder`: إرسال تذكير واتساب يدوي فوري للموعد.

### 4.4 استقبال الـ Webhooks
* `POST /api/v1/webhooks/mailgun/{store_id}`: استقبال أحداث البريد من Mailgun مع فحص توقيع HMAC-SHA256.
* `POST /api/v1/webhooks/sendgrid/{store_id}`: استقبال أحداث البريد من SendGrid.
* `POST /api/v1/webhooks/ghl?store_id={STORE_ID}`: استقبال حجوزات ومواعيد GoHighLevel.
* `POST /api/v1/webhooks/salla?store_id={STORE_ID}`: استقبال سلات وأحداث متجر سلة.
* `POST /api/v1/webhooks/whatsapp?store_id={STORE_ID}`: استقبال حالات تسليم وقراءة رسائل واتساب.

---

## 5. محرك الإحماء وحماية سمعة النطاق (Warmup Engine Architecture)

1. **Application-Level Warmup (على مستوى الحملات):**
   - عند إنشاء حملة وتفعيل خيار الإحماء، يقوم النظام بحساب حجم القائمة البريدية.
   - يتم تقسيم القائمة إلى دفعات يومية وفق جدول تدرجي آمن:
     - اليوم 1: 45 إيميل
     - اليوم 2: 90 إيميل
     - اليوم 3: 180 إيميل
     - اليوم 4: 360 إيميل
     - اليوم 5: 720 إيميل
     - اليوم 6: 1,440 إيميل (وهكذا حتى اكتمال القائمة).
   - يتم إرسال كل دفعة باستخدام `o:deliverytime` في Mailgun وجدولتها بدقة، مع وسم كل دفعة بـ `warmup-day-X` لتتبع أدائها.

2. **Infrastructure-Level Warmup (على مستوى الـ Dedicated IP):**
   - متابعة تقدم إحماء الـ IP المخصص عبر Mailgun IP Warmup API مباشرة من الواجهة والتأكد من عدم الإفراط في إرسال الكميات قبل اكتمال مرحلة الإحماء.
