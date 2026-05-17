from .cart_controller import router as cart_router
from .customer_controller import router as customer_router
from .dashboard_controller import router as dashboard_router
from .logs_controller import router as logs_router
from .message_controller import router as message_router
from .settings_controller import router as settings_router
from .webhook_controller import router as webhook_router
from .auth_controller import router as auth_router
from .whatsapp_webhook_controller import router as whatsapp_webhook_router

routers = [
    auth_router,
    webhook_router,
    whatsapp_webhook_router,
    dashboard_router,
    customer_router,
    cart_router,
    message_router,
    settings_router,
    logs_router
]
