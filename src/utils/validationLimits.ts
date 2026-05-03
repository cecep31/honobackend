/**
 * Shared caps for request validation — prevents oversized inputs and abusive payloads.
 */

export const MAX_EMAIL_LENGTH = 254;
export const MAX_QUERY_SEARCH_LENGTH = 200;
export const MAX_ORDER_BY_LENGTH = 64;
export const MAX_OAUTH_AUTHORIZATION_CODE_LENGTH = 8192;
export const MAX_REFRESH_TOKEN_LENGTH = 16_384;
export const MAX_RESET_TOKEN_LENGTH = 16_384;
export const MAX_ISO_DATETIME_STRING_LENGTH = 40;
export const MAX_URL_LENGTH = 2048;
export const MAX_PRESIGNED_FILENAME_LENGTH = 512;
export const MAX_BOOKMARK_NOTES_LENGTH = 10_000;
export const MAX_FOLDER_DESCRIPTION_LENGTH = 2000;
export const MAX_HOLDING_NAME_LENGTH = 500;
export const MAX_HOLDING_SYMBOL_LENGTH = 50;
export const MAX_HOLDING_PLATFORM_LENGTH = 255;
export const MAX_HOLDING_NOTES_LENGTH = 50_000;
/** Conservative max for Postgres numeric holdings fields with JS Number validation. */
export const MAX_HOLDING_NUMERIC_AMOUNT = Number.MAX_SAFE_INTEGER;
export const SERIAL_INT_MAX = 2_147_483_647;
export const SMALLINT_POSITIVE_MAX = 32_767;
export const BIGINT_ID_STRING_CHARS_MAX = 20;
export const MAX_TAG_NAME_CHARS = 30;
export const MAX_POST_TAGS_COUNT = 100;
export const MAX_PRICE_SYMBOL_QUERY_CHARS = 32;
export const MAX_CHAT_CONTENT_LENGTH = 200_000;
export const MAX_MODEL_ID_LENGTH = 200;
export const MAX_CHAT_ROLE_LENGTH = 64;
export const MAX_TRENDS_YEARS_PARAM_CHARS = 500;
export const MAX_TRENDS_YEAR_VALUES_IN_QUERY = 100;
/** Maximum pagination offset (safeOffset clamps to this). */
export const MAX_QUERY_OFFSET = 5_000_000;
