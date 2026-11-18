from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import User
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    ChangePasswordRequest,
)
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
)
from app.api.dependencies import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


def build_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_user(
    data: UserRegister,
    db: AsyncSession = Depends(get_db),
):
    email = str(data.email).lower()

    existing_user = await db.execute(
        select(User).where(User.email == email)
    )

    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=email,
        full_name=data.full_name.strip(),
        hashed_password=hash_password(data.password),
    )

    db.add(user)

    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    token = create_access_token(user.id)

    return TokenResponse(
        access_token=token,
        user=build_user_response(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login_user(
    data: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    email = str(data.email).lower()

    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(
        data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.id)

    return TokenResponse(
        access_token=token,
        user=build_user_response(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return build_user_response(current_user)


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(
        data.current_password,
        current_user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your current password is incorrect.",
        )

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your new password must be different from your current password.",
        )

    current_user.hashed_password = hash_password(data.new_password)

    await db.commit()

    return {
        "message": "Password changed successfully."
    }