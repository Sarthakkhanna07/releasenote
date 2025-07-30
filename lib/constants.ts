// UI Constants
export const UI_CONSTANTS = {
  LOGO_SIZE: 40,
  COVER_IMAGE_HEIGHT: 64, // h-64 = 16rem = 256px
  MAX_CONTENT_WIDTH: 'max-w-3xl',
  PADDING: {
    CONTAINER: 'px-6 py-8 sm:px-10',
    PAGE: 'py-12 px-4 sm:px-6 lg:px-8'
  }
} as const

// HTML Sanitization Configuration
export const SANITIZATION_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'div', 'span',
    'ul', 'ol', 'li',
    'strong', 'b', 'em', 'i', 'u',
    'blockquote', 'code', 'pre',
    'a', 'img'
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class']
} as const

// Database Constants
export const DB_CONSTANTS = {
  PUBLISHED_STATUS: 'published',
  ORGANIZATION_SELECT: 'id, name, logo_url',
  RELEASE_NOTE_SELECT: 'title, content_html, published_at, featured_image_url'
} as const

// Date Format Constants
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
} as const 