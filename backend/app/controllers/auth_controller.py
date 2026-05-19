from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete

from app.core.dependencies import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.models.user import User
from app.models.store_settings import StoreSettings
from app.models.recovered_cart import RecoveredCart
from app.models.message_log import MessageLog
from app.models.abandoned_cart import AbandonedCart
from app.models.customer import Customer
from app.schemas.user_schema import LoginRequest, TokenResponse, UserCreate, UserResponse, UserUpdate
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == payload.username))
    user = result.scalars().first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Creates the first admin user. Subsequent calls require an existing admin token.
    Open on first run (no users exist), locked afterward.
    """
    result = await db.execute(select(func.count(User.id)))
    existing_count = result.scalar() or 0

    if existing_count > 0:
        # After first user, only an admin can register new users.
        # For now, keep simple: disable public registration.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is closed. Contact an administrator.",
        )

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        is_admin=True,  # First user is always admin
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info(f"First admin user created: {user.username}")
    return user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view registered users."
        )
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    payload: UserCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create users."
        )

    # Check unique username
    username_check = await db.execute(select(User).where(User.username == payload.username))
    if username_check.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken."
        )

    # Check unique email if provided
    if payload.email:
        email_check = await db.execute(select(User).where(User.email == payload.email))
        if email_check.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered."
            )

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        is_admin=payload.is_admin,
        is_active=payload.is_active,
    )
    db.add(user)
    await db.flush()

    # Create default StoreSettings for this user
    settings = StoreSettings(
        user_id=user.id,
        whatsapp_phone_id="",
        whatsapp_access_token="",
        whatsapp_template_name="hello_world",
        automation_enabled=True,
    )
    db.add(settings)

    await db.commit()
    await db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update users."
        )

    # Parse user_id to UUID
    try:
        from uuid import UUID
        target_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format.")

    result = await db.execute(select(User).where(User.id == target_uuid))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Validate username uniqueness if changed
    if payload.username is not None and payload.username != user.username:
        username_check = await db.execute(select(User).where(User.username == payload.username))
        if username_check.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken."
            )
        user.username = payload.username

    # Validate email uniqueness if changed
    if payload.email is not None and payload.email != user.email:
        email_check = await db.execute(select(User).where(User.email == payload.email))
        if email_check.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered."
            )
        user.email = payload.email

    if payload.password is not None:
        user.hashed_password = hash_password(payload.password)

    if payload.is_admin is not None:
        user.is_admin = payload.is_admin

    if payload.is_active is not None:
        user.is_active = payload.is_active

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete users."
        )

    # Parse user_id to UUID
    try:
        from uuid import UUID
        target_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format.")

    if target_uuid == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own admin account."
        )

    result = await db.execute(select(User).where(User.id == target_uuid))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Cascading deletions
    # 1. Fetch user's cart IDs
    cart_ids_q = select(AbandonedCart.id).where(AbandonedCart.user_id == target_uuid)
    cart_ids_res = await db.execute(cart_ids_q)
    cart_ids = cart_ids_res.scalars().all()

    if cart_ids:
        # Delete related RecoveredCart and MessageLog rows
        await db.execute(delete(RecoveredCart).where(RecoveredCart.cart_id.in_(cart_ids)))
        await db.execute(delete(MessageLog).where(MessageLog.cart_id.in_(cart_ids)))
        # Delete AbandonedCart rows
        await db.execute(delete(AbandonedCart).where(AbandonedCart.id.in_(cart_ids)))

    # 2. Delete Customer rows
    await db.execute(delete(Customer).where(Customer.user_id == target_uuid))

    # 3. Delete StoreSettings
    await db.execute(delete(StoreSettings).where(StoreSettings.user_id == target_uuid))

    # 4. Delete the User
    await db.execute(delete(User).where(User.id == target_uuid))

    await db.commit()
    return {"detail": "User and all associated data deleted successfully."}


