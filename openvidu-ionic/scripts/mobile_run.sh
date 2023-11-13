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
        sed -i "s/\(externalIp:\s*'\)[^']*/\1$LOCAL_IP/" $ENV_FILE
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
        sed -i '' "s/externalIp: .*/externalIp: '$LOCAL_IP'/g" $ENV_FILE
        ;;
    *)
        # Windows OS
        echo "Recognized $os_name as operating system. The ip must be set manually."
        read -p "Insert your local ip " ip_address
        LOCAL_IP=$ip_address
        # Requesting the user to set the ip manually and wait for the user to press enter
        echo "Please set your local ip in $ENV_FILE"
        echo "Example:"
        echo ""
        echo "export const environment = {"
        echo "  production: false,"
        echo "  externalIp: 'XXX.XXX.X.XX'  <--- SET YOUR IP HERE"
        echo "};"
        read -p "Press Enter to continue..."
        ;;
esac

 if [ -z "$LOCAL_IP" ]; then
    echo "Cannot get your local IP address."
    exit 1
fi

if [ "$(docker ps -q -f ancestor=caddy)" ]; then
    echo "Container caddy is running."
else
    echo "Container caddy is not running. Launching it..."
    docker run -d --network=host -v $PWD/Caddyfile:/etc/caddy/Caddyfile -e IP_ADDRESS=$LOCAL_IP caddy
fi
echo "Your local ip is $LOCAL_IP"
echo "Setting up your mobile environment for developing OpenVidu..."
npm run build
npx ionic cap run $PLATFORM -c development --external --disable-host-check --public-host=$LOCAL_IP --ssl
