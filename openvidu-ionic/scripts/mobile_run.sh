#!/bin/bash

# Check if an argument is provided
if [ -z "$1" ]; then
    echo "Please provide the PLATFORM name."
	echo "Example: ./android_run.sh <PLATFORM>"
    exit 1
fi

PLATFORM=$1

# Getting the operating system
os_name=$(uname)

case "$os_name" in
    "Linux")
        # Commands for Linux
        LOCAL_IP=$(hostname -I | awk '{print $1}')
        ;;
    "Darwin")
        # Commands for macOS
        LOCAL_IP=$(ifconfig | grep "inet " | grep -Fv)
        ;;
    CYGWIN*|"MINGW32_NT"|"MINGW64_NT")
        # Commands for Windows (Cygwin or MinGW)
        LOCAL_IP=$(ipconfig | grep "IPv4 Address" | awk '{print $NF}')
        ;;
    *)
        # Unsupported/Unknown OS
        echo "Unsupported operating system: $os_name"
        exit 1
        ;;
esac

if [ -z "$LOCAL_IP" ]; then
    echo "Cannot get your local IP address."
    exit 1
fi

echo "Your local ip is $LOCAL_IP"
echo "Setting up your movile environment for developing OpenVidu..."

# Set environment variables
sed -i "s/\(externalIp:\s*'\)[^']*/\1$LOCAL_IP/" src/environments/environment.ts

npx ionic cap run $PLATFORM -l --external --disable-host-check --public-host=$LOCAL_IP --ssl



