#!/bin/bash
# Script de test d'upload GPX
# Usage: ./test-upload.sh [URL]

URL=${1:-"https://www.gpx.ninja"}
TEST_FILE="./test.gpx"

echo "🧪 Testing GPX upload to $URL"
echo "================================"

# Create a minimal valid GPX file with a track
cat > "$TEST_FILE" << 'EOF'
<?xml version="1.0"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="45.0" lon="5.0">
        <ele>100</ele>
        <time>2024-01-01T10:00:00Z</time>
      </trkpt>
      <trkpt lat="45.1" lon="5.1">
        <ele>150</ele>
        <time>2024-01-01T10:05:00Z</time>
      </trkpt>
      <trkpt lat="45.2" lon="5.2">
        <ele>200</ele>
        <time>2024-01-01T10:10:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>
EOF

echo "📤 Uploading test GPX file..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$URL/api/v1/gpx/upload" \
  -F "file=@$TEST_FILE")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo ""
echo "📊 Response:"
echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCCESS - Upload worked!"
    echo ""
    echo "Response body:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

    # Check if response has expected fields
    HAS_SUCCESS=$(echo "$BODY" | jq -r '.success' 2>/dev/null)
    HAS_DATA=$(echo "$BODY" | jq -r '.data' 2>/dev/null)

    if [ "$HAS_SUCCESS" = "true" ] && [ "$HAS_DATA" != "null" ]; then
        echo ""
        echo "✅ Response structure is valid"
        TRACK_COUNT=$(echo "$BODY" | jq -r '.data.tracks | length' 2>/dev/null)
        echo "📍 Tracks found: $TRACK_COUNT"
    else
        echo ""
        echo "⚠️  Response structure unexpected"
    fi
else
    echo "❌ FAILED - HTTP $HTTP_CODE"
    echo ""
    echo "Error response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

# Cleanup
rm -f "$TEST_FILE"

echo ""
echo "================================"
exit $([ "$HTTP_CODE" = "200" ] && echo 0 || echo 1)
