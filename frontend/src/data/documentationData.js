export const documentationData = {
  ar: {
    title: 'مركز التوثيق',
    description: 'شروحات شاملة وخطوة بخطوة لدمج Recover مع متجرك',
    sections: [
      {
        id: 'whatsapp-business',
        title: 'إعداد حساب واتساب بيزنس',
        description: 'تعلم كيفية إنشاء وربط حساب واتساب بيزنس مع Recover',
        icon: 'fa-whatsapp',
        color: '#25D366',
        steps: [
          {
            number: 1,
            title: 'الوصول إلى لوحة Meta للمطورين',
            description: 'قم بزيارة https://developers.facebook.com/apps وقم بتسجيل الدخول إلى حسابك'
          },
          {
            number: 2,
            title: 'إنشاء تطبيق جديد',
            description: 'اضغط على زر "إنشاء تطبيق" وملء بيانات التطبيق'
          },
          {
            number: 3,
            title: 'تحديد حالة الاستخدام',
            description: 'اختر خيار "الوصول للعملاء من خلال واتساب" (Connect With Customers Through WhatsApp)'
          },
          {
            number: 4,
            title: 'إنشاء محفظة أعمال',
            description: 'إذا لم تكن لديك محفظة أعمال، قم بإنشاء واحدة جديدة',
            note: 'تجاهل هذه الخطوة إن كان لديك محفظة أعمال بالفعل'
          },
          {
            number: 5,
            title: 'ملء بيانات المحفظة',
            description: 'أدخل البيانات المطلوبة للمحفظة ثم اضغط على "إنشاء"'
          },
          {
            number: 6,
            title: 'تأكيد بيانات التطبيق',
            description: 'تحقق من جميع البيانات المختارة ثم اضغط على زر "إنشاء التطبيق"'
          },
          {
            number: 7,
            title: 'الوصول إلى لوحة التحكم',
            description: 'ستظهر لوحة التحكم الخاصة بالتطبيق، قم بالضغط على الزر كما موضح'
          },
          {
            number: 8,
            title: 'اختيار API Setup',
            description: 'قم بإختيار خيار "API Setup" من القائمة'
          },
          {
            number: 9,
            title: 'إضافة رقم هاتف',
            description: 'قم بإضافة رقم هاتف جديد (يجب أن لا يكون مسجلاً على واتساب بالكامل)'
          },
          {
            number: 10,
            title: 'ملء بيانات الهاتف',
            description: 'أدخل اسم الحساب، نوع العمل، والوصف (هذه المعلومات ستظهر على رقم واتساب الخاص بك)'
          },
          {
            number: 11,
            title: 'تفعيل الرقم',
            description: 'أضف رقم الهاتف ثم اضغط "التالي" للتفعيل. سيصلك رسالة تأكيد'
          },
          {
            number: 12,
            title: 'إنشاء معرف وصول',
            description: 'اضغط على "Generate Access" لإنشاء معرف وصول جديد'
          },
          {
            number: 13,
            title: 'تأكيد الحساب',
            description: 'تأكد من أن هذا هو الحساب الصحيح ثم اضغط "التالي"'
          },
          {
            number: 14,
            title: 'اختيار الرقم',
            description: 'اختر من قائمة الأرقام المسجلة الرقم المراد إضافة معرف له'
          },
          {
            number: 15,
            title: 'نسخ المعرف',
            description: 'بعد إنشاء المعرف، سيظهر معك - قم بنسخه للخطوة التالية'
          },
          {
            number: 16,
            title: 'إضافة المعرف في Recover',
            description: 'ادخل إلى إعدادات المتجر على Recover وضع المعرف في حقل "رمز الوصول"'
          },
          {
            number: 17,
            title: 'نسخ معرف الهاتف من Meta',
            description: 'عد إلى Meta وتأكد من اختيار الرقم الصحيح ثم نسخ معرف الهاتف'
          },
          {
            number: 18,
            title: 'إكمال الربط',
            description: 'ضع معرف الهاتف في حقل "معرف رقم الواتساب" في إعدادات Recover'
          }
        ],
        prerequisites: [
          'حساب Facebook/Meta نشط',
          'رقم هاتف غير مسجل على واتساب',
          'حق الوصول إلى متجرك على Recover'
        ],
        troubleshooting: [
          {
            issue: 'الرقم مسجل بالفعل على واتساب',
            solution: 'استخدم رقم هاتف جديد لم يتم تسجيله على واتساب من قبل'
          },
          {
            issue: 'لم يتم استقبال رسالة التأكيد',
            solution: 'تأكد من إدخال الرقم بشكل صحيح وحاول مرة أخرى بعد عدة دقائق'
          },
          {
            issue: 'الربط لا يعمل في Recover',
            solution: 'تأكد من نسخ المعرفات بشكل صحيح بدون مسافات إضافية'
          }
        ],
        faq: [
          {
            question: 'هل أحتاج إلى رقم هاتف جديد؟',
            answer: 'نعم، يجب أن يكون الرقم غير مسجل على واتساب بالكامل للحصول على أفضل نتائج'
          },
          {
            question: 'كم يستغرق وقت التفعيل؟',
            answer: 'عادة ما يستغرق بضع دقائق فقط'
          },
          {
            question: 'هل يمكنني استخدام رقم شخصي؟',
            answer: 'يفضل استخدام رقم مخصص للعمل، لكن يمكنك استخدام رقم شخصي إذا لم يكن مسجلاً على واتساب'
          }
        ],
        verification: [
          'تأكد من ظهور الرقم في قائمة أرقام الواتساب',
          'تحقق من وصول رسالة التفعيل',
          'تأكد من حفظ المعرفات في إعدادات Recover'
        ]
      },
      {
        id: 'whatsapp-template',
        title: 'إنشاء قالب تسويقي واتساب',
        description: 'شرح مفصل لإنشاء قالب رسائل تسويقية للسلات المهجورة',
        icon: 'fa-message',
        color: '#0084FF',
        steps: [
          {
            number: 1,
            title: 'الوصول إلى Meta Business',
            description: 'قم بزيارة https://business.facebook.com/latest وقم بتسجيل الدخول'
          },
          {
            number: 2,
            title: 'اختيار صفحة الأعمال',
            description: 'اختر صفحة الأعمال الخاصة بتطبيقك ثم اضغط على "جميع الأدوات"'
          },
          {
            number: 3,
            title: 'فتح مسؤول واتساب',
            description: 'من الأدوات، اختر "مسؤول واتساب" (WhatsApp Manager)'
          },
          {
            number: 4,
            title: 'اختيار معرض الأعمال',
            description: 'ستظهر صفحة جديدة، اختر معرض الأعمال الخاص بك'
          },
          {
            number: 5,
            title: 'فتح إدارة القوالب',
            description: 'اختر "مسؤول القوالب" (Manage Templates)'
          },
          {
            number: 6,
            title: 'إنشاء قالب جديد',
            description: 'اضغط على "إنشاء قالب جديد" (Create Template)'
          },
          {
            number: 7,
            title: 'اختيار نوع القالب',
            description: 'اختر نوع القالب "تسويق" (Marketing) والوضع "عادي" (Default) ثم اضغط "التالي"'
          },
          {
            number: 8,
            title: 'تحديد اسم القالب',
            description: 'ادخل اسم القالب واختر اللغة العربية'
          },
          {
            number: 9,
            title: 'اختيار نوع المتغيرات',
            description: 'اختر نوع المتغيرات "اسم" (Name)'
          },
          {
            number: 10,
            title: 'إضافة صورة (اختياري)',
            description: 'يمكنك إضافة صورة للقالب إذا أردت'
          },
          {
            number: 11,
            title: 'كتابة محتوى الرسالة',
            description: 'ضع المتغير {{name}} بشكل إلزامي والمتغير {{coupon}} بشكل اختياري مع النص الذي تحتاجه'
          },
          {
            number: 12,
            title: 'إضافة أمثلة للمتغيرات',
            description: 'قم بإضافة قيم تجريبية للمتغيرات'
          },
          {
            number: 13,
            title: 'إضافة زر الإجراء',
            description: 'أضف زر مع اختيار نوعه "زيارة موقع" (Visit Website)'
          },
          {
            number: 14,
            title: 'تكوين الزر الديناميكي',
            description: 'اختر نوع الزر "ديناميكي" وضع رابط متجرك (مثل recover-a8a6585e.fastapicloud.dev)'
          },
          {
            number: 15,
            title: 'التحقق النهائي',
            description: 'تأكد من جميع البيانات وأن القالب جاهز للاستخدام'
          },
          {
            number: 16,
            title: 'إرسال للمراجعة',
            description: 'اضغط على "التسليم للفحص" (Submit for review)'
          }
        ],
        prerequisites: [
          'حساب Meta Business نشط',
          'صلاحيات كاملة على معرض الأعمال',
          'معرفة برابط متجرك على Recover'
        ],
        troubleshooting: [
          {
            issue: 'لا يظهر زر إنشاء قالب جديد',
            solution: 'تأكد من أنك في الصفحة الصحيحة وأن لديك الصلاحيات الكافية'
          },
          {
            issue: 'رفض القالب من Meta',
            solution: 'تأكد من أن المحتوى لا يتضمن كلمات ممنوعة أو روابط غير صحيحة'
          },
          {
            issue: 'المتغيرات لا تعمل بشكل صحيح',
            solution: 'تأكد من كتابة المتغيرات بالصيغة الصحيحة {{name}} و{{coupon}}'
          }
        ],
        faq: [
          {
            question: 'هل يمكنني تعديل القالب بعد الإرسال؟',
            answer: 'يمكنك تعديل القالب قبل الموافقة عليه من Meta، لكن بعد الموافقة يكون التعديل محدوداً'
          },
          {
            question: 'كم يستغرق وقت مراجعة القالب؟',
            answer: 'عادة ما تستغرق المراجعة من Meta بضع ساعات إلى يوم واحد'
          },
          {
            question: 'هل أحتاج إلى قالب للتقييمات أيضاً؟',
            answer: 'نعم، يفضل إنشاء قالب منفصل للتقييمات بدون متغيرات'
          }
        ],
        verification: [
          'تأكد من قبول القالب من Meta',
          'اختبر القالب برسالة تجريبية',
          'تحقق من ظهور الرسالة بشكل صحيح على واتساب'
        ]
      },
      {
        id: 'salla-webhook',
        title: 'دمج Salla Webhook',
        description: 'خطوات ربط متجرك على منصة Salla مع نظام Recover',
        icon: 'fa-plug',
        color: '#FF6B00',
        steps: [
          {
            number: 1,
            title: 'نسخ رابط Webhook من Recover',
            description: 'ادخل إلى إعدادات متجرك على Recover وقم بنسخ رابط Webhook الخاص بك'
          },
          {
            number: 2,
            title: 'الوصول إلى بوابة Salla',
            description: 'قم بالدخول إلى https://portal.salla.partners/store-management والدخول للوحة التحكم'
          },
          {
            number: 3,
            title: 'الوصول لأدوات المطور',
            description: 'من قائمة الـ navbar العلوية، اختر "أدوات المطور" (Developer Tools) من قائمة الأدوات'
          },
          {
            number: 4,
            title: 'إنشاء حدث جديد',
            description: 'اضغط على "إنشاء حدث جديد" (New Event)'
          },
          {
            number: 5,
            title: 'تكوين الحدث الأول',
            description: 'ادخل اسم الحدث، اختر إصدار Webhook v2، والصق رابط Webhook من Recover في حقل URL'
          },
          {
            number: 6,
            title: 'تحديد أنواع الأحداث',
            description: 'اختر الأحداث التالية:\n- إنشاء سلة مشتريات متروكة\n- تحديث سلة مشتريات متروكة\n- شراء سلة متروكة\n- إضافة تقييم جديد'
          }
        ],
        prerequisites: [
          'حساب Salla نشط',
          'متجر مفعّل على Salla',
          'صلاحيات لإدارة أدوات المطور',
          'متجرك مسجل على Recover'
        ],
        troubleshooting: [
          {
            issue: 'الأحداث لا تصل إلى Recover',
            solution: 'تأكد من أن رابط Webhook صحيح وأن خادم Recover يعمل بشكل طبيعي'
          },
          {
            issue: 'خطأ في عنوان URL',
            solution: 'تأكد من نسخ رابط Webhook بالكامل بدون أي أخطاء'
          },
          {
            issue: 'إصدار Webhook خاطئ',
            solution: 'تأكد من اختيار إصدار v2 وليس إصدار أقدم'
          }
        ],
        faq: [
          {
            question: 'ماذا يحدث بعد تفعيل الـ webhook؟',
            answer: 'سيتم إرسال جميع أحداث السلات المتروكة والتقييمات مباشرة إلى Recover'
          },
          {
            question: 'هل أحتاج إلى عمل أي شيء آخر في Salla؟',
            answer: 'لا، بعد تفعيل الـ webhook سيكون كل شيء جاهزاً للعمل'
          },
          {
            question: 'هل يمكنني إضافة عدة webhooks؟',
            answer: 'نعم، يمكنك إضافة عدة webhooks لأغراض مختلفة'
          }
        ],
        verification: [
          'تأكد من ظهور الـ webhook في قائمة الأحداث',
          'قم بإنشاء سلة متروكة واختبرها',
          'تحقق من استقبال البيانات في Recover'
        ]
      }
    ]
  },
  en: {
    title: 'Documentation Center',
    description: 'Comprehensive step-by-step guides to integrate Recover with your store',
    sections: [
      {
        id: 'whatsapp-business',
        title: 'WhatsApp Business Setup',
        description: 'Learn how to create and connect a WhatsApp Business account with Recover',
        icon: 'fa-whatsapp',
        color: '#25D366',
        steps: [
          {
            number: 1,
            title: 'Access Meta Developer Dashboard',
            description: 'Visit https://developers.facebook.com/apps and log in to your account'
          },
          {
            number: 2,
            title: 'Create a New App',
            description: 'Click the "Create App" button and fill in your application details'
          },
          {
            number: 3,
            title: 'Select Use Case',
            description: 'Choose "Connect With Customers Through WhatsApp"'
          },
          {
            number: 4,
            title: 'Create Business Portfolio',
            description: 'If you don\'t have a Business Portfolio, create a new one',
            note: 'Skip this step if you already have a Business Portfolio'
          },
          {
            number: 5,
            title: 'Fill Portfolio Information',
            description: 'Enter the required information for your portfolio and click "Create"'
          },
          {
            number: 6,
            title: 'Confirm Application Details',
            description: 'Review all selected information and click "Create App"'
          },
          {
            number: 7,
            title: 'Access App Dashboard',
            description: 'Your application dashboard will appear, click the indicated button'
          },
          {
            number: 8,
            title: 'Select API Setup',
            description: 'Choose "API Setup" from the menu'
          },
          {
            number: 9,
            title: 'Add Phone Number',
            description: 'Add a new phone number (must not be registered with WhatsApp)'
          },
          {
            number: 10,
            title: 'Fill Phone Details',
            description: 'Enter account name, business type, and description'
          },
          {
            number: 11,
            title: 'Activate Number',
            description: 'Add the phone number and click "Next" to activate. You\'ll receive a confirmation message'
          },
          {
            number: 12,
            title: 'Generate Access Token',
            description: 'Click "Generate Access" to create a new access token'
          },
          {
            number: 13,
            title: 'Confirm Account',
            description: 'Verify this is the correct account and click "Next"'
          },
          {
            number: 14,
            title: 'Select Phone Number',
            description: 'Choose the phone number you want to add access to'
          },
          {
            number: 15,
            title: 'Copy Access Token',
            description: 'After creating the token, copy it for the next step'
          },
          {
            number: 16,
            title: 'Add Token to Recover',
            description: 'Go to your store settings on Recover and paste the token in the access code field'
          },
          {
            number: 17,
            title: 'Copy Phone Number ID',
            description: 'Return to Meta and copy your phone number ID'
          },
          {
            number: 18,
            title: 'Complete Connection',
            description: 'Paste the phone number ID in the WhatsApp ID field in Recover settings'
          }
        ],
        prerequisites: [
          'Active Facebook/Meta account',
          'Phone number not registered with WhatsApp',
          'Access to your Recover store settings'
        ],
        troubleshooting: [
          {
            issue: 'Phone number already registered with WhatsApp',
            solution: 'Use a new phone number that hasn\'t been registered with WhatsApp'
          },
          {
            issue: 'Confirmation message not received',
            solution: 'Verify the phone number is correct and try again after a few minutes'
          },
          {
            issue: 'Connection not working in Recover',
            solution: 'Ensure you\'ve copied the tokens correctly without extra spaces'
          }
        ],
        faq: [
          {
            question: 'Do I need a new phone number?',
            answer: 'Yes, the number should not be registered with WhatsApp for best results'
          },
          {
            question: 'How long does activation take?',
            answer: 'Usually just a few minutes'
          },
          {
            question: 'Can I use a personal number?',
            answer: 'It\'s recommended to use a business number, but you can use a personal number if not registered with WhatsApp'
          }
        ],
        verification: [
          'Verify the phone number appears in your WhatsApp account list',
          'Confirm receipt of activation message',
          'Verify tokens are saved in Recover settings'
        ]
      },
      {
        id: 'whatsapp-template',
        title: 'Create Marketing Template',
        description: 'Detailed guide to create marketing message templates for abandoned carts',
        icon: 'fa-message',
        color: '#0084FF',
        steps: [
          {
            number: 1,
            title: 'Access Meta Business',
            description: 'Visit https://business.facebook.com/latest and log in'
          },
          {
            number: 2,
            title: 'Select Business Page',
            description: 'Choose your business page and click "All Tools"'
          },
          {
            number: 3,
            title: 'Open WhatsApp Manager',
            description: 'From the tools, select "WhatsApp Manager"'
          },
          {
            number: 4,
            title: 'Choose Business Catalog',
            description: 'A new page will appear, select your business catalog'
          },
          {
            number: 5,
            title: 'Open Template Manager',
            description: 'Click "Manage Templates"'
          },
          {
            number: 6,
            title: 'Create New Template',
            description: 'Click "Create Template"'
          },
          {
            number: 7,
            title: 'Select Template Type',
            description: 'Choose "Marketing" template type and "Default" mode, then click "Next"'
          },
          {
            number: 8,
            title: 'Set Template Name',
            description: 'Enter template name and select Arabic language'
          },
          {
            number: 9,
            title: 'Choose Variable Type',
            description: 'Select variable type "Name"'
          },
          {
            number: 10,
            title: 'Add Image (Optional)',
            description: 'You can add an image to your template if desired'
          },
          {
            number: 11,
            title: 'Write Message Content',
            description: 'Add {{name}} variable (required) and {{coupon}} variable (optional) with your message text'
          },
          {
            number: 12,
            title: 'Add Sample Variables',
            description: 'Provide example values for the variables'
          },
          {
            number: 13,
            title: 'Add Action Button',
            description: 'Add a button with type "Visit Website"'
          },
          {
            number: 14,
            title: 'Configure Button',
            description: 'Set button type to "Dynamic" and add your store URL'
          },
          {
            number: 15,
            title: 'Final Review',
            description: 'Review all information and ensure the template is ready'
          },
          {
            number: 16,
            title: 'Submit for Review',
            description: 'Click "Submit for review"'
          }
        ],
        prerequisites: [
          'Active Meta Business account',
          'Full permissions on business catalog',
          'Knowledge of your Recover store URL'
        ],
        troubleshooting: [
          {
            issue: 'Create template button not visible',
            solution: 'Ensure you\'re on the correct page and have sufficient permissions'
          },
          {
            issue: 'Template rejected by Meta',
            solution: 'Verify the content doesn\'t contain prohibited words or incorrect links'
          },
          {
            issue: 'Variables not working correctly',
            solution: 'Ensure variables are formatted correctly: {{name}} and {{coupon}}'
          }
        ],
        faq: [
          {
            question: 'Can I edit the template after submission?',
            answer: 'You can edit before Meta approval, but editing is limited after approval'
          },
          {
            question: 'How long does Meta review take?',
            answer: 'Usually takes a few hours to one day'
          },
          {
            question: 'Do I need a template for reviews too?',
            answer: 'Yes, it\'s recommended to create a separate template for reviews without variables'
          }
        ],
        verification: [
          'Confirm template approval from Meta',
          'Test template with a sample message',
          'Verify message displays correctly on WhatsApp'
        ]
      },
      {
        id: 'salla-webhook',
        title: 'Salla Webhook Integration',
        description: 'Connect your Salla store with Recover using webhooks',
        icon: 'fa-plug',
        color: '#FF6B00',
        steps: [
          {
            number: 1,
            title: 'Copy Webhook URL from Recover',
            description: 'Go to your store settings on Recover and copy your webhook URL'
          },
          {
            number: 2,
            title: 'Access Salla Portal',
            description: 'Log in to https://portal.salla.partners/store-management'
          },
          {
            number: 3,
            title: 'Navigate to Developer Tools',
            description: 'From the top navbar menu, select "Developer Tools" from the Tools menu'
          },
          {
            number: 4,
            title: 'Create New Event',
            description: 'Click "New Event"'
          },
          {
            number: 5,
            title: 'Configure Event',
            description: 'Enter event name, select Webhook version v2, and paste the Recover webhook URL'
          },
          {
            number: 6,
            title: 'Select Event Types',
            description: 'Choose these event types:\n- Cart abandoned created\n- Cart abandoned updated\n- Cart abandoned purchased\n- New review added'
          }
        ],
        prerequisites: [
          'Active Salla account',
          'Active store on Salla platform',
          'Developer tools access',
          'Store registered with Recover'
        ],
        troubleshooting: [
          {
            issue: 'Events not reaching Recover',
            solution: 'Verify webhook URL is correct and Recover server is online'
          },
          {
            issue: 'Invalid URL error',
            solution: 'Ensure you\'ve copied the complete webhook URL without errors'
          },
          {
            issue: 'Wrong webhook version',
            solution: 'Select version v2, not older versions'
          }
        ],
        faq: [
          {
            question: 'What happens after enabling the webhook?',
            answer: 'All abandoned cart and review events will be sent directly to Recover'
          },
          {
            question: 'Do I need to do anything else in Salla?',
            answer: 'No, everything will work automatically after webhook activation'
          },
          {
            question: 'Can I add multiple webhooks?',
            answer: 'Yes, you can add multiple webhooks for different purposes'
          }
        ],
        verification: [
          'Verify webhook appears in events list',
          'Create a test abandoned cart',
          'Confirm data is received in Recover'
        ]
      }
    ]
  }
}
