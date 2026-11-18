
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models import Folder, User
from app.schemas.folder import FolderCreate, FolderResponse


router = APIRouter(
    prefix="/folders",
    tags=["Folders"],
)


@router.post(
    "",
    response_model=FolderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_folder(
    folder_data: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    folder_name = folder_data.name.strip()

    if not folder_name:
        raise HTTPException(
            status_code=400,
            detail="Folder name cannot be empty.",
        )

    folder = Folder(
        name=folder_name,
        user_id=current_user.id,
    )

    try:
        db.add(folder)
        await db.commit()
        await db.refresh(folder)

    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A folder with this name already exists.",
        )

    return folder


@router.get(
    "",
    response_model=list[FolderResponse],
)
async def list_folders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Folder)
        .where(Folder.user_id == current_user.id)
        .order_by(Folder.created_at.desc())
    )

    return result.scalars().all()
