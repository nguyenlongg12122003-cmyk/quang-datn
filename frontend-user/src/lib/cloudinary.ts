// Browser-side (unsigned) image uploads to Cloudinary.
// Requires VITE_CLOUDINARY_CLOUD_NAME and an UNSIGNED upload preset in VITE_CLOUDINARY_UPLOAD_PRESET.

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const ACCEPTED_IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(',')

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET)
}

// Returns a user-facing error message when the file is invalid, or null when it is acceptable.
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Định dạng không hợp lệ. Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF.'
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'Ảnh vượt quá dung lượng tối đa 5MB.'
  }
  return null
}

interface CloudinaryUploadResponse {
  secure_url?: string
  error?: { message?: string }
}

// Uploads a single image and resolves with its secure HTTPS URL.
export async function uploadImageToCloudinary(file: File): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary chưa được cấu hình. Thiếu VITE_CLOUDINARY_CLOUD_NAME hoặc VITE_CLOUDINARY_UPLOAD_PRESET.',
    )
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET as string)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  )

  let payload: CloudinaryUploadResponse = {}
  try {
    payload = (await response.json()) as CloudinaryUploadResponse
  } catch {
    // Response body was not JSON; fall through to the generic error below.
  }

  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message ?? 'Tải ảnh lên Cloudinary thất bại.')
  }

  return payload.secure_url
}
