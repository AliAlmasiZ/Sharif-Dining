#!/usr/bin/env bash
set -e

# Configuration
APP_URL="${APP_URL:-http://localhost:3000}"
SECRET="${CRON_SECRET:-my_custom_secure_cron_secret_12345}"
ENDPOINT="${APP_URL}/api/cron/auto-reserve"

echo "=================================================="
echo "🚀 اجرای رزرو خودکار سامانه تغذیه شریف (SAMAD)"
echo "⏰ زمان: $(date '+%Y-%m-%d %H:%M:%S')"
echo "🔗 آدرس اندپوینت: ${ENDPOINT}"
echo "=================================================="

# Send GET request with authorization secret
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET \
  -H "Authorization: Bearer ${SECRET}" \
  "${ENDPOINT}?weekOffset=1")

HTTP_BODY=$(echo "${RESPONSE}" | sed -e '$d')
HTTP_STATUS=$(echo "${RESPONSE}" | tail -n1 | cut -d':' -f2)

if [ "${HTTP_STATUS}" -eq 200 ]; then
  echo "✅ رزرو با موفقیت انجام شد!"
  echo "${HTTP_BODY}" | jq . 2>/dev/null || echo "${HTTP_BODY}"
else
  echo "❌ خطا در رزرو خودکار (کد خطا: ${HTTP_STATUS})"
  echo "${HTTP_BODY}"
  exit 1
fi
