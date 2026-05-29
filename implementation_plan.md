# 🛒 توثيق مشروع: نظام استرجاع السلات المهجورة (Recover-Cart)

نظام **Recover-Cart** هو منصة SaaS متكاملة تم تطويرها خصيصاً لمتاجر منصة **سلة (Salla)** للتعامل مع السلات المهجورة واسترجاعها تلقائياً عبر إرسال رسائل مخصصة عبر **WhatsApp Business API**، ومتابعة الأداء من خلال لوحة تحكم تفاعلية متكاملة.

---

## 1. المعمارية العامة للمشروع (Architecture Overview)

يعتمد المشروع على فصل كامل بين الواجهة الأمامية والخلفية:
* **Backend:** مبني باستخدام **Python FastAPI** مع اتباع معمارية **MVC / Repository Pattern** لضمان نظافة الكود وفصل المسؤوليات.
* **Frontend:** تطبيق **React** مبني باستخدام **Vite**، متوافق بالكامل مع الهواتف والأجهزة المختلفة (Responsive Layout)، ويدعم القراءة من اليمين إلى اليسار (RTL) بشكل افتراضي ليلائم المستخدم العربي.
* **Database:** نظام **PostgreSQL** أو **MySQL** لإدارة البيانات، مع استخدام **Alembic** لإدارة هجرات قاعدة البيانات (Database Migrations).
* **Caching & Queue:** استخدام **Redis** لتخزين الجلسات الموقتة وإدارة المهام الخلفية.

---

## 2. هيكلية المجلدات والملفات (Project Directory Structure)

```
Recover-Cart/
├── backend/                            # خادم FastAPI Backend
│   ├── alembic/                        # ملفات وهجرات قاعدة البيانات
│   ├── app/
│   │   ├── controllers/                # طبقة التحكم (API Routes & Handlers)
│   │   │   ├── auth_controller.py      # تسجيل الدخول وإدارة المستخدمين والـ JWT
│   │   │   ├── cart_controller.py      # إدارة السلات المهجورة
│   │   │   ├── customer_controller.py  # إدارة العملاء وتفاصيلهم
│   │   │   ├── dashboard_controller.py # إحصائيات لوحة التحكم والرسومات البيانية
│   │   │   ├── logs_controller.py      # سجلات النظام والعمليات
│   │   │   ├── message_controller.py   # سجل وإحصائيات الرسائل المرسلة
│   │   │   ├── settings_controller.py  # إعدادات المتجر والأتمتة
│   │   │   ├── webhook_controller.py   # استقبال أحداث السلات المهجورة من سلة
│   │   │   └── whatsapp_webhook_controller.py # استقبال تحديثات تسليم رسائل واتساب
│   │   ├── core/                       # البنية التحتية الأساسية (قواعد البيانات والأمان)
│   │   │   ├── database.py             # اتصال قاعدة البيانات (Async Session)
│   │   │   ├── security.py             # تشفير كلمات المرور وتوليد الـ JWT
│   │   │   └── config.py               # إدارة متغيرات البيئة والإعدادات
│   │   ├── models/                     # نماذج قاعدة البيانات (SQLAlchemy ORM)
│   │   │   ├── user.py                 # بيانات المستخدمين ومدراء النظام
│   │   │   ├── customer.py             # بيانات العملاء
│   │   │   ├── abandoned_cart.py       # السلات المهجورة الواردة
│   │   │   ├── recovered_cart.py       # السلات التي تم استرجاعها بنجاح
│   │   │   ├── message_log.py          # سجل وتفاصيل الرسائل وحالاتها
│   │   │   └── store_settings.py       # إعدادات المتجر وقنوات الاتصال
│   │   ├── repositories/               # طبقة الوصول للبيانات (Data Access Layer)
│   │   ├── schemas/                    # هياكل التحقق من البيانات (Pydantic Schemas)
│   │   ├── services/                   # منطق الأعمال (Business Logic Layer)
│   │   └── jobs/                       # المهام الخلفية المجدولة (APScheduler)
│   ├── reset_pass.py                   # سكربت لتهيئة مستخدم رئيسي وتعديل كلمة المرور
│   ├── requirements.txt                # المكتبات والاعتمادات المطلوبة للـ Backend
│   └── .env                            # ملف متغيرات البيئة المحلي
│
└── frontend/                           # واجهة المستخدم React (Vite)
    ├── src/
    │   ├── api/                        # إعداد الاتصال بالخادم و Axios Requests
    │   ├── components/                 # العناصر والكومبوننتس المشتركة (Navbar, Sidebar, Charts)
    │   ├── contexts/                   # إدارة الحالات العامة (مثل AuthContext)
    │   ├── hooks/                      # الخطافات المخصصة (Custom Hooks)
    │   ├── pages/                      # صفحات لوحة التحكم
    │   │   ├── SignIn.jsx              # صفحة تسجيل الدخول
    │   │   ├── Dashboard.jsx           # اللوحة الرئيسية والإحصائيات الحية
    │   │   ├── Carts.jsx               # استعراض السلات المهجورة
    │   │   ├── RecoveredCarts.jsx      # استعراض السلات المسترجعة
    │   │   ├── Customers.jsx           # قائمة العملاء وسلاتهم
    │   │   ├── Messages.jsx            # سجل رسائل واتساب وحالات التسليم
    │   │   └── Settings.jsx            # إعدادات النظام وربط سلة/واتساب
    │   ├── App.jsx                     # التوجيه وإعداد مسارات التطبيق
    │   └── index.css                   # التنسيقات وتصميم الـ UI (Dark Mode)
```

---

## 3. نماذج قاعدة البيانات (Database Models Schema)

### 3.1 المستخدمين (`User`)
جدول تخزين المستخدمين المصرح لهم بالدخول إلى لوحة التحكم:
```python
id              : UUID (PK)
username        : String (Unique, Indexed)
email           : String (Unique, Indexed)
hashed_password : String
is_admin        : Boolean (Default: True)
is_active       : Boolean (Default: True)
created_at      : DateTime
updated_at      : DateTime
```

### 3.2 العملاء (`Customer`)
بيانات العملاء الذين قاموا بترك سلات مهجورة في المتجر:
```python
id              : UUID (PK)
salla_customer_id: String (Unique, Indexed)
full_name       : String
mobile          : String
mobile_code     : String
email           : String (Nullable)
total_carts     : Integer (Default: 0)
created_at      : DateTime
```

### 3.3 السلات المهجورة (`AbandonedCart`)
تفاصيل السلات المهجورة المستلمة من Webhook متجر سلة:
```python
id              : UUID (PK)
salla_cart_id   : String (Unique, Indexed)
customer_id     : FK (Customer.id)
cart_value      : Decimal
event_type      : String
reminder_sent   : Boolean (Default: False)
is_recovered    : Boolean (Default: False)
abandoned_at    : DateTime
recovered_at    : DateTime (Nullable)
created_at      : DateTime
```

### 3.4 السلات المسترجعة (`RecoveredCart`)
سجل السلات التي تم إتمام شرائها بعد عملية التذكير:
```python
id              : UUID (PK)
salla_cart_id   : String (Unique, Indexed)
cart_value      : Decimal
recovered_at    : DateTime
created_at      : DateTime
```

### 3.5 سجل الرسائل (`MessageLog`)
سجل تتبع الرسائل المرسلة للعملاء وحالتها من WhatsApp Business API:
```python
id              : UUID (PK)
cart_id         : FK (AbandonedCart.id)
whatsapp_msg_id : String (Nullable, Indexed)
status          : String (pending, sent, delivered, read, failed)
channel         : String (Default: "whatsapp")
sent_at         : DateTime
updated_at      : DateTime
error_message   : String (Nullable)
```

### 3.6 إعدادات المتجر (`StoreSettings`)
تكوينات ربط المتجر وتفعيل الأتمتة:
```python
id              : UUID (PK)
store_name      : String
salla_api_key   : String (Encrypted)
whatsapp_phone_id: String
automation_enabled: Boolean (Default: True)
reminder_delay_hours: Integer (Default: 1)
max_retries     : Integer (Default: 3)
```

---

## 4. مسارات الـ API (Backend Routes)

### 4.1 المصادقة (Authentication)
* `POST /api/v1/auth/login`: التحقق من بيانات الاعتماد وإصدار توكن JWT.
* `GET /api/v1/auth/me`: الحصول على بيانات المستخدم الحالي عبر التوكن.

### 4.2 السلات (Carts)
* `GET /api/v1/carts`: جلب قائمة السلات المهجورة (دعم الفلترة والترقيم).
* `GET /api/v1/carts/recovered`: جلب السلات المسترجعة بنجاح.
* `POST /api/v1/carts/{id}/retry`: إرسال تذكير يدوي فوري لسلة محددة.

### 4.3 الرسائل (Messages)
* `GET /api/v1/messages`: قائمة سجلات الإرسال وحالات التسليم.
* `GET /api/v1/messages/stats`: إحصائيات الرسائل (المرسلة، المستلمة، المقروءة، الفاشلة).

### 4.4 العملاء (Customers)
* `GET /api/v1/customers`: قائمة العملاء المسجلين.
* `GET /api/v1/customers/{id}`: تفاصيل عميل محدد وسجل سلاته.

### 4.5 لوحة القيادة (Dashboard)
* `GET /api/v1/dashboard/kpis`: مؤشرات الأداء (إجمالي الأرباح المسترجعة، معدل الاسترجاع، السلات النشطة).
* `GET /api/v1/dashboard/charts/...`: بيانات الرسومات البيانية (الرسائل اليومية، حالات التسليم، قمع المبيعات).

### 4.6 الإعدادات (Settings)
* `GET /api/v1/settings`: جلب التكوين الحالي للنظام.
* `PUT /api/v1/settings`: تحديث إعدادات الأتمتة ومفاتيح الربط.

### 4.7 الويبهوك (Webhooks)
* `POST /api/v1/webhooks/salla`: استقبال أحداث السلات المهجورة من سلة.
* `POST /api/v1/webhooks/whatsapp`: استقبال إشعارات حالة قراءة وتسليم الرسائل من Meta.

---

## 5. دليل التشغيل والتثبيت للمطورين (Setup Guide)

### 5.1 تشغيل الـ Backend
1. تأكد من توفر **Python 3.10+**.
2. انتقل لملف `backend` وقم بإنشاء بيئة افتراضية وتفعيلها:
   ```bash
   cd backend
   python -m venv venv
   # لتفعيل البيئة على Windows:
   .\venv\Scripts\activate
   ```
3. تثبيت المكتبات المطلوبة:
   ```bash
   pip install -r requirements.txt
   ```
4. إعداد ملف البيئة `.env` بناءً على النموذج المرفق `.env.example`.
5. تشغيل عمليات التهجير (Migrations) لبناء الجداول:
   ```bash
   alembic upgrade head
   ```
6. تشغيل سكربت إعداد المستخدم الافتراضي للتمكن من تسجيل الدخول:
   ```bash
   python reset_pass.py
   ```
7. تشغيل خادم التطوير:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### 5.2 تشغيل الـ Frontend (React)
1. تأكد من تثبيت **Node.js**.
2. انتقل لملف `frontend` وقم بتثبيت الاعتمادات:
   ```bash
   cd frontend
   npm install
   ```
3. قم بتشغيل واجهة المستخدم التفاعلية:
   ```bash
   npm run dev
   ```
4. قم بالدخول للرابط المحلي الظاهر في الطرفية واستخدم بيانات المستخدم الافتراضي:
   * **البريد الإلكتروني:** `admin@admin.com` (أو اسم المستخدم: `admin`)
   * **كلمة المرور:** `123123123`
