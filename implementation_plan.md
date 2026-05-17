# 🛒 خطة مشروع: نظام استرجاع السلات المهجورة (Recover)

> **نظام SaaS متكامل** لأتمتة استرجاع السلات المتروكة في متاجر سلة عبر رسائل واتساب ذكية

---

## 1. نظرة عامة على المشروع

| البند | التفاصيل |
|---|---|
| **الاسم** | Recover - نظام استرجاع السلات المهجورة |
| **النوع** | SaaS Automation Platform |
| **Backend** | Python FastAPI (MVC Architecture) |
| **Frontend** | Vanilla HTML/CSS/JS Dashboard (RTL) |
| **Database** | PostgreSQL + Redis (Cache & Queue) |
| **Messaging** | WhatsApp Business API |
| **Integration** | Salla Webhooks API |
| **Scheduler** | APScheduler (Background Jobs) |

---

## 2. هيكل المجلدات (Folder Structure)

```
d:\Cart\
│
├── backend/                          # FastAPI Backend (MVC)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI Entry Point & App Factory
│   │   ├── config.py                 # Settings & Environment Variables
│   │   │
│   │   ├── models/                   # M - Data Models (SQLAlchemy ORM)
│   │   │   ├── __init__.py
│   │   │   ├── abandoned_cart.py     # AbandonedCart Model
│   │   │   ├── customer.py           # Customer Model
│   │   │   ├── message_log.py        # MessageLog Model
│   │   │   └── store_settings.py     # StoreSettings Model
│   │   │
│   │   ├── schemas/                  # Pydantic Schemas (Request/Response)
│   │   │   ├── __init__.py
│   │   │   ├── cart_schema.py
│   │   │   ├── customer_schema.py
│   │   │   ├── message_schema.py
│   │   │   ├── dashboard_schema.py
│   │   │   └── common.py            # Pagination, Filters, etc.
│   │   │
│   │   ├── controllers/             # C - API Route Handlers
│   │   │   ├── __init__.py
│   │   │   ├── webhook_controller.py     # Salla Webhook Endpoints
│   │   │   ├── cart_controller.py        # Cart CRUD Endpoints
│   │   │   ├── message_controller.py     # Message Endpoints
│   │   │   ├── customer_controller.py    # Customer Endpoints
│   │   │   ├── dashboard_controller.py   # Dashboard KPIs & Charts
│   │   │   ├── settings_controller.py    # System Settings
│   │   │   └── logs_controller.py        # Operation Logs
│   │   │
│   │   ├── services/                # Business Logic Layer
│   │   │   ├── __init__.py
│   │   │   ├── cart_service.py           # Cart Processing Logic
│   │   │   ├── reminder_service.py       # Reminder Scheduling Logic
│   │   │   ├── whatsapp_service.py       # WhatsApp API Integration
│   │   │   ├── salla_service.py          # Salla API Integration
│   │   │   ├── analytics_service.py      # Dashboard Analytics
│   │   │   └── notification_service.py   # Internal Notifications
│   │   │
│   │   ├── repositories/            # Data Access Layer (Repository Pattern)
│   │   │   ├── __init__.py
│   │   │   ├── base_repository.py        # Generic CRUD Repository
│   │   │   ├── cart_repository.py
│   │   │   ├── customer_repository.py
│   │   │   └── message_repository.py
│   │   │
│   │   ├── jobs/                    # Background Jobs & Schedulers
│   │   │   ├── __init__.py
│   │   │   ├── scheduler.py              # APScheduler Setup
│   │   │   └── reminder_job.py           # Hourly Reminder Job
│   │   │
│   │   ├── core/                    # Core Utilities & Infrastructure
│   │   │   ├── __init__.py
│   │   │   ├── database.py               # DB Engine & Session
│   │   │   ├── dependencies.py           # FastAPI Dependency Injection
│   │   │   ├── exceptions.py             # Custom Exception Handlers
│   │   │   ├── security.py               # Auth & API Keys
│   │   │   └── logging_config.py         # Structured Logging
│   │   │
│   │   └── utils/                   # Shared Helpers
│   │       ├── __init__.py
│   │       ├── phone_formatter.py        # Phone Number Utils
│   │       └── date_helpers.py           # Date/Time Utils
│   │
│   ├── alembic/                     # Database Migrations
│   │   ├── versions/
│   │   └── env.py
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
├── dashboard/                        # V - Frontend (View Layer)
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── assets/
│
├── tests/                            # Unit & Integration Tests
│   ├── test_cart_service.py
│   ├── test_reminder_service.py
│   └── test_whatsapp_service.py
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 3. الأنماط التصميمية (Design Patterns)

| Pattern | الاستخدام |
|---|---|
| **Repository** | فصل طبقة الوصول للبيانات عن Business Logic |
| **Service Layer** | تغليف المنطق التجاري في طبقة مستقلة |
| **Strategy** | تبديل قنوات الإرسال (WhatsApp / SMS / Email) |
| **Factory** | إنشاء كائنات الرسائل حسب النوع |
| **Observer** | الاستماع لأحداث Webhook وتفعيل العمليات |
| **Dependency Injection** | FastAPI `Depends()` لحقن الخدمات |
| **DTO (Pydantic Schemas)** | فصل بيانات الـ API عن الـ Models |

---

## 4. نماذج قاعدة البيانات (Database Models)

### 4.1 AbandonedCart
```
id              | UUID (PK)
salla_cart_id   | String (Unique)
customer_id     | FK → Customer
cart_value      | Decimal
event_type      | String (order.abandoned)
reminder_sent   | Boolean (default: false)
is_recovered    | Boolean (default: false)
abandoned_at    | DateTime
recovered_at    | DateTime (nullable)
created_at      | DateTime
```

### 4.2 Customer
```
id              | UUID (PK)
salla_customer_id | String (Unique)
full_name       | String
mobile          | String
mobile_code     | String
email           | String (nullable)
total_carts     | Integer
created_at      | DateTime
```

### 4.3 MessageLog
```
id              | UUID (PK)
cart_id         | FK → AbandonedCart
whatsapp_msg_id | String (nullable)
status          | Enum (pending, accepted, delivered, read, failed)
channel         | String (whatsapp)
sent_at         | DateTime
updated_at      | DateTime
error_message   | Text (nullable)
```

### 4.4 StoreSettings
```
id              | UUID (PK)
store_name      | String
salla_api_key   | String (encrypted)
whatsapp_phone_id | String
automation_enabled | Boolean
reminder_delay_hours | Integer (default: 1)
max_retries     | Integer (default: 3)
```

---

## 5. الـ API Endpoints

### 5.1 Webhooks
| Method | Endpoint | الوصف |
|---|---|---|
| POST | `/api/v1/webhooks/salla` | استقبال أحداث سلة |

### 5.2 Carts
| Method | Endpoint | الوصف |
|---|---|---|
| GET | `/api/v1/carts` | جلب جميع السلات (مع Pagination + Filters) |
| GET | `/api/v1/carts/{id}` | تفاصيل سلة واحدة |
| POST | `/api/v1/carts/{id}/retry` | إعادة إرسال تذكير يدوي |

### 5.3 Messages
| Method | Endpoint | الوصف |
|---|---|---|
| GET | `/api/v1/messages` | سجل الرسائل |
| GET | `/api/v1/messages/stats` | إحصائيات الرسائل |

### 5.4 Customers
| Method | Endpoint | الوصف |
|---|---|---|
| GET | `/api/v1/customers` | قائمة العملاء |
| GET | `/api/v1/customers/{id}` | تفاصيل عميل |

### 5.5 Dashboard & Analytics
| Method | Endpoint | الوصف |
|---|---|---|
| GET | `/api/v1/dashboard/kpis` | بطاقات الإحصائيات |
| GET | `/api/v1/dashboard/charts/daily-carts` | بيانات Line Chart |
| GET | `/api/v1/dashboard/charts/daily-messages` | بيانات Bar Chart |
| GET | `/api/v1/dashboard/charts/message-status` | بيانات Donut Chart |
| GET | `/api/v1/dashboard/charts/funnel` | بيانات Funnel |

### 5.6 Settings
| Method | Endpoint | الوصف |
|---|---|---|
| GET | `/api/v1/settings` | جلب الإعدادات |
| PUT | `/api/v1/settings` | تحديث الإعدادات |
| POST | `/api/v1/settings/toggle-automation` | تشغيل/إيقاف النظام |

### 5.7 Logs
| Method | Endpoint | الوصف |
|---|---|---|
| GET | `/api/v1/logs` | سجل العمليات |

---

## 6. تدفق النظام (System Flow)

```mermaid
sequenceDiagram
    participant S as Salla Store
    participant W as Webhook Controller
    participant CS as Cart Service
    participant DB as PostgreSQL
    participant SCH as Scheduler (كل ساعة)
    participant RS as Reminder Service
    participant WA as WhatsApp Service
    participant WS as WebSocket (Dashboard)

    S->>W: POST /webhooks/salla (order.abandoned)
    W->>CS: process_abandoned_cart(data)
    CS->>DB: Save Cart + Customer
    CS->>WS: emit("new_cart")

    SCH->>RS: run_pending_reminders()
    RS->>DB: Get carts (reminder_sent=false, age > 1hr)
    loop لكل سلة معلقة
        RS->>WA: send_template_message(phone, name)
        alt نجاح
            WA-->>RS: message_id + accepted
            RS->>DB: Update (reminder_sent=true, status=accepted)
        else فشل
            WA-->>RS: error
            RS->>DB: Update (status=failed, error_message)
        end
    end
    RS->>WS: emit("reminders_completed")
```

---

## 7. خطة التنفيذ على مراحل (Phases)

### المرحلة 1: البنية التحتية (Foundation) ⏱️ ~2 ساعات
- [ ] إعداد بيئة Python + FastAPI
- [ ] إعداد PostgreSQL + SQLAlchemy
- [ ] إنشاء `config.py` و `.env`
- [ ] إعداد Alembic للـ Migrations
- [ ] إنشاء `database.py` و `dependencies.py`
- [ ] إنشاء `base_repository.py` (Generic CRUD)
- [ ] إعداد `logging_config.py` و `exceptions.py`

### المرحلة 2: النماذج والـ Schemas ⏱️ ~1 ساعة
- [ ] إنشاء جميع SQLAlchemy Models
- [ ] إنشاء Pydantic Schemas
- [ ] تشغيل أول Migration

### المرحلة 3: Webhook + Cart Logic ⏱️ ~2 ساعات
- [ ] `webhook_controller.py` - استقبال أحداث سلة
- [ ] `cart_service.py` - معالجة السلات المهجورة
- [ ] `cart_repository.py` - حفظ وجلب البيانات
- [ ] `salla_service.py` - التحقق من صحة الـ Webhook

### المرحلة 4: نظام التذكيرات ⏱️ ~2 ساعات
- [ ] `whatsapp_service.py` - إرسال رسائل WhatsApp API
- [ ] `reminder_service.py` - منطق التذكير
- [ ] `reminder_job.py` - وظيفة APScheduler كل ساعة
- [ ] `scheduler.py` - تشغيل الـ Scheduler مع FastAPI

### المرحلة 5: Dashboard APIs ⏱️ ~2 ساعات
- [ ] `dashboard_controller.py` - KPIs Endpoint
- [ ] `analytics_service.py` - حسابات الإحصائيات
- [ ] Charts Endpoints (Daily Carts, Messages, Status, Funnel)
- [ ] Logs Endpoint

### المرحلة 6: ربط الـ Frontend بالـ Backend ⏱️ ~2 ساعات
- [ ] تعديل `script.js` لجلب البيانات من API
- [ ] إضافة Loading States و Error Handling
- [ ] ربط الجداول والـ Charts ببيانات حقيقية
- [ ] إضافة WebSocket للتحديث المباشر

### المرحلة 7: الاختبارات والتوثيق ⏱️ ~1 ساعة
- [ ] Unit Tests للـ Services
- [ ] Integration Tests للـ Endpoints
- [ ] توثيق API عبر Swagger (تلقائي من FastAPI)

---

## 8. المكتبات المطلوبة (requirements.txt)

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.35
alembic==1.13.0
asyncpg==0.29.0
pydantic==2.9.0
pydantic-settings==2.5.0
httpx==0.27.0
apscheduler==3.10.4
python-dotenv==1.0.1
redis==5.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
```

---

## 9. ملف البيئة (.env.example)

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/recover_db

# Redis
REDIS_URL=redis://localhost:6379/0

# Salla
SALLA_WEBHOOK_SECRET=your_webhook_secret

# WhatsApp Business API
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=1089751084228040

# App
APP_ENV=development
APP_SECRET_KEY=your_secret_key
REMINDER_DELAY_HOURS=1
```

---

## 10. ملخص المعمارية

```
┌─────────────────────────────────────────────────┐
│                  Frontend (View)                │
│            dashboard/ (HTML/CSS/JS)             │
│         fetch() → API   |   WebSocket           │
└──────────────────────┬──────────────────────────┘
                       │ HTTP / WS
┌──────────────────────▼──────────────────────────┐
│              Controllers (Routes)               │
│   webhook_ | cart_ | dashboard_ | settings_     │
└──────────────────────┬──────────────────────────┘
                       │ Depends()
┌──────────────────────▼──────────────────────────┐
│              Services (Business Logic)          │
│  cart_ | reminder_ | whatsapp_ | analytics_     │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│           Repositories (Data Access)            │
│         base_ | cart_ | customer_ | message_    │
└──────────────────────┬──────────────────────────┘
                       │ SQLAlchemy ORM
┌──────────────────────▼──────────────────────────┐
│               PostgreSQL + Redis                │
└─────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> هذه الخطة مصممة لتكون **قابلة للتوسع**. يمكن لاحقاً إضافة قنوات إرسال جديدة (SMS, Email) عبر Strategy Pattern، أو إضافة Multi-Tenancy لدعم متاجر متعددة.

---

## 10. تحديثات الهجرة إلى React و MySQL (الجديدة)

تم تحديث هيكلية المشروع بالكامل للانتقال إلى تقنيات حديثة وتلبية متطلبات النظام الجديدة:

### 10.1 الانتقال إلى الواجهة الأمامية React (Vite)
- **الواجهة:** تم تحويل لوحة التحكم من Vanilla HTML/CSS إلى تطبيق **React.js** متكامل ومبني باستخدام Vite.
- **التوجيه (Routing):** تم استخدام `react-router-dom` مع `ProtectedRoute` لحماية الصفحات الخاصة.
- **الهيكلة:** مجلد `frontend/` يحتوي على المكونات (Components)، الصفحات (Pages)، والخطافات (Hooks).
- **التصميم:** الاحتفاظ بالتصميم المظلم (Dark Theme) ودعم اللغة العربية (RTL) باستخدام خط Cairo.
- تم حذف الملفات القديمة (`dashboard/` و `assets/`).

### 10.2 نظام المصادقة (Authentication)
- إضافة نموذج/جدول `users` مع خاصية `is_admin`.
- بناء نظام مصادقة يعتمد على **JWT (JSON Web Tokens)** عبر مكتبة `python-jose` و `passlib` لتشفير كلمات المرور.
- تأمين مسارات الواجهة الأمامية والروابط الخلفية.

### 10.3 استرجاع بيانات واتساب والتحديثات (WhatsApp Status Tracking)
- تمكين تتبع حالة رسائل واتساب بدقة (pending, sent, read).
- إنشاء Endpoint جديد `/api/v1/webhooks/whatsapp` لاستقبال تقارير حالة التسليم (Webhooks) من Meta/WhatsApp.
- عرض الحالة مباشرة في واجهة لوحة التحكم مع شارات ملونة (Badges).

### 10.4 تحسينات الترقيم (Pagination) والإحصائيات
- إصلاح منطق جلب البيانات ليعود بالعدد الإجمالي الفعلي (`total`) من قاعدة البيانات للعمل مع ترقيم الصفحات في React.
- إضافة مسار `/api/v1/messages/stats` لتزويد لوحة القيادة (Dashboard) بالإحصائيات الحية الدقيقة.
