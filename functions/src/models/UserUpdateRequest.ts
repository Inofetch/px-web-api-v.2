export interface UserUpdateRequest {
    id?: string | undefined,
    displayName?: string | undefined,
    phoneNumber?: string | undefined,
    email?: string | undefined,
    password?: string | undefined,
    photoUrl?: string | undefined,
    company?: string | undefined,
    role?: string | undefined,
    portPassId?: string | undefined,
    portPassExpiry?: string | undefined,
    portPassFrontImageUrl?: string | undefined,
    portPassBackImageUrl?: string | undefined,
    portPassVerified?: number | undefined,
}


