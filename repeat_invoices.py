import requests
import json
import time
import random
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# ─────────────────────────────────────────────────────────────
# ⚙️ الإعدادات العامة (Configuration)
# ─────────────────────────────────────────────────────────────
TOTAL_REQUESTS = 18000       # إجمالي عدد الفواتير المطلوب إنشاؤها
MAX_WORKERS = 8         # عدد الـ Threads المتزامنة
MAX_RETRIES = 4           # أقصى عدد محاولات عند حدوث خطأ لكل طلب
BASE_BACKOFF_SECONDS = 2  # الوقت المبدئي للانتظار قبل إعادة المحاولة (Exponential Backoff)

URL = "https://dev-api.fatoorah.sa/apiAdmin/saleInvoice/create"

HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ar",
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxMSIsImp0aSI6IjQ5ZTcyNzE5MmZlODY5NzJjODMwMzIzZjE3OGUxNTkxY2UwOGZmYmY4Zjc2NDk2ZDU2Y2YxMmUxMWEwYmFhOWQ2YTNlMWJmNmY1Y2NlNjVmIiwiaWF0IjoxNzg4OTM5NTU5LjczMTUzNzEwMzY1Mjk1NDEwMTU2MjUsIm5iZiI6MTc4ODkzOTU1OS43MzE1MzgwNTczMjcyNzA1MDc4MTI1LCJleHAiOjE4MjA0NzU1NTkuNzI5Njg1MDY4MTMwNDkzMTY0MDYyNSwic3ViIjoiMzU2MSIsInNjb3BlcyI6WyJBZG1pbiJdfQ.Jy2TNCS7rqsZZ0lbqzVn-9tbZ3TH4QnrComfQt-U1jf1b_ku_vSGMGmStoZInhry1_BpsralK1otZDX0qyVJ_tA8qht8lYWaS8WxZ4L6CGYD8Ai07rfu6YlOXtGsc8_z4CYCKktPyMGezL06_1FcobKVQ6zqS6_a1J5LJt-W2dKBDRzkeDeOewhzgwMFFSRFXGq6PFcIt9VslhNo7iPsSg1BFJLWWyotAI48kni7MMHnMgt7nf7DZXtXeZeVcQPoR792Fdmkj3aVtQQc2pepZDlYX-oRZB49OhQnWYgZ-pCXopw0Y7O36X6eWGaylHNhGC_hC6NhlNkD-5e3cuNOGDI0UAQ9BrGE9Y1BuPjhbcCHjCZ4QdRtyKLG41NXvZNowJFFi76E44FixGlN6JrL5GQhG0BUN-XSgUgiF0usUbXcpCKhKmTAeQ4EOy2uTDSVzJ2VO8Ibs12cnBWsQtxLBhMNAcXgDHgfS0JArvODyP7b9M2iqhu_5oLkcK17j-bW9JCkG_KocPqnd_RnfntT4JdyIK5jECUNNvgTW-PwJeNnjcAdagOVvHm2gn4tQmOCK0812POthQN8zfNS0Ook19S9YazdLungqgmwvOHBeL1fkVVDUJZLs1Vi8zRVxCbSbDstZzRXWsJ1EIRuDypTtakcD9JrFxSOAnUuMQnkmkk",
    "Origin": "https://dev.fatoorah.sa",
    "Referer": "https://dev.fatoorah.sa/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0",
    "lang": "ar",
    "login-type": "admin",
}

DATA = {
    "user_id": "12731",
    "zatca_invoice_type": "simplified",
    "shift_id": "4015",
    "status": "1",
    "additional_notes": "",
    "invoiceDiscountType": "1",
    "invoiceDiscountValue": "0",
    "payments[0][method_id]": "3",
    "payments[0][reference_number]": "undefined",
    "payments[0][bank_id]": "4036",
    "payments[0][value]": "1000",
    "payments[0][notes]": "undefined",
    "products[0][id]": "57638",
    "products[0][quantity]": "1",
    "products[0][price]": "1000",
    "products[0][discountType]": "2",
    "products[0][discountValue]": "0",
    "dueDate": "2026-09-09",
    "stock_id": "1919",
    "work_palce_id": "1947",
    "queue_id": "1",
}

# قفل لمنع تداخل طباعة المخرجات بين الـ Threads
print_lock = threading.Lock()

def safe_log(msg: str):
    """طباعة آمنة للـ Thread."""
    with print_lock:
        print(msg)


def send_invoice(request_id: int) -> dict:
    """
    إرسال ريكويست الفاتورة مع نظام إعادة محاولة ذكي (Exponential Backoff + Jitter).
    """
    session = requests.Session()
    
    for attempt in range(1, MAX_RETRIES + 1):
        safe_log(f"🔄 [الطلب #{request_id}] المحاولة {attempt}/{MAX_RETRIES} بدأت...")
        
        try:
            response = session.post(URL, headers=HEADERS, data=DATA, timeout=30)
            status_code = response.status_code
            
            # في حال النجاح (2xx)
            if 200 <= status_code < 300:
                # try:
                #     res_json = response.json()
                    # safe_log(f"✅ [الطلب #{request_id}] تم بنجاح (Status: {status_code}) -> {json.dumps(res_json, ensure_ascii=False)}")
                # except Exception:
                    # safe_log(f"✅ [الطلب #{request_id}] تم بنجاح (Status: {status_code}) -> {response.text[:200]}")
                return {"request_id": request_id, "success": True, "attempts": attempt, "status_code": status_code}

            # في حال وجود خطأ من السيرفر أو Rate limit (429 أو 5xx)
            safe_log(f"⚠️ [الطلب #{request_id}] المحاولة {attempt} فشلت بكود: {status_code} | الرد: {response.text[:150]}")

        except requests.RequestException as exc:
            safe_log(f"❌ [الطلب #{request_id}] خطأ شبكة/اتصال في المحاولة {attempt}: {exc}")

        # إذا لم تكن هذه المحاولة الأخيرة، ننتظر وقتاً أطول تصاعدياً (Exponential Backoff + Jitter)
        if attempt < MAX_RETRIES:
            # مضاعفة وقت الانتظار: (2^attempt) + وقت عشوائي بسيط لتجنب التزامن
            delay = (BASE_BACKOFF_SECONDS * (2 ** (attempt - 1))) + random.uniform(0.2, 1.0)
            safe_log(f"⏳ [الطلب #{request_id}] الانتظار لمدة {delay:.2f} ثانية قبل إعادة التجربة...")
            time.sleep(delay)

    safe_log(f"🚫 [الطلب #{request_id}] فشل نهائياً بعد استنفاد جميع المحاولات ({MAX_RETRIES}).")
    return {"request_id": request_id, "success": False, "attempts": MAX_RETRIES, "status_code": None}


def main():
    safe_log(f"🚀 بدء تنفيذ {TOTAL_REQUESTS} طلبات باستخدام {MAX_WORKERS} Threads (مع إعادة المحاولة الذكية)...")
    start_time = time.time()
    
    results = []
    
    # تشغيل المهام عبر ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_id = {executor.submit(send_invoice, i): i for i in range(1, TOTAL_REQUESTS + 1)}
        
        for future in as_completed(future_to_id):
            res = future.result()
            results.append(res)

    total_time = time.time() - start_time
    success_count = sum(1 for r in results if r["success"])
    fail_count = TOTAL_REQUESTS - success_count

    safe_log("\n" + "=" * 55)
    safe_log(f"📊 ملخص النتيجة النهائية:")
    safe_log(f"   - إجمالي الطلبات: {TOTAL_REQUESTS}")
    safe_log(f"   - الناجحة: {success_count} ✅")
    safe_log(f"   - الفاشلة: {fail_count} ❌")
    safe_log(f"   - الوقت المستغرق: {total_time:.2f} ثانية")
    safe_log("=" * 55)


if __name__ == "__main__":
    main()
