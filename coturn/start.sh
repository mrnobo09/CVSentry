#!/bin/bash
set -e

cat > /tmp/turnserver.conf << EOF
listening-port=3478
tls-listening-port=5349
realm=${TURN_REALM:-cvsentry.local}
use-auth-secret
static-auth-secret=${TURN_SHARED_SECRET}
external-ip=${TURN_EXTERNAL_IP}
min-port=${TURN_MIN_PORT:-49152}
max-port=${TURN_MAX_PORT:-65535}
verbose
EOF

exec turnserver -c /tmp/turnserver.conf
