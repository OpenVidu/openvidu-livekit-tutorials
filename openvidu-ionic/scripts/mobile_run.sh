#!/bin/bash

# Check if an argument is provided
if [ -z "$1" ]; then
    echo "Please provide the PLATFORM name."
	echo "Example: ./android_run.sh <PLATFORM>"
    exit 1
fi

PLATFORM=$1
ENV_FILE="src/environments/environment.ts"

# Getting the operating system
os_name=$(uname)

case "$os_name" in
    "Linux")
        # Commands for Linux
        LOCAL_IP=$(hostname -I | awk '{print $1}')


        if [ -z "$LOCAL_IP" ]; then
            echo "Cannot get your local IP address."
            exit 1
        fi

        sed -i "s/\(externalIp:\s*'\)[^']*/\1$LOCAL_IP/" src/environments/environment.ts
        echo "Your local ip is $LOCAL_IP"
        echo "Setting up your movile environment for developing OpenVidu..."
        npx ionic cap run $PLATFORM -l --external --disable-host-check --public-host=$LOCAL_IP --ssl 

        ;;
    "Darwin")
        # Commands for macOS
        for interface in $(ifconfig -l); do
            ip=$(ipconfig getifaddr $interface)
            if [ -n "$ip" ]; then
                LOCAL_IP=$ip
                break
            fi
        done

        if [ -z "$LOCAL_IP" ]; then
            echo "Cannot get your local IP address."
            exit 1
        fi
        echo "Your local ip is $LOCAL_IP"
        echo "Setting up your movile environment for developing OpenVidu..."
        sed -i '' "s/externalIp: .*/externalIp: '$LOCAL_IP'/g" $ENV_FILE
        npx ionic capacitor run ios -c development 
        ;;
    *)
        # Unsupported/Unknown OS
        echo "Unsupported operating system: $os_name"
        exit 1
        ;;
esac


