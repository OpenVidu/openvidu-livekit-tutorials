# Basic JavaScript

Basic client application built with plain HTML, CSS and JavaScript. It internally uses [livekit-client-sdk-js](https://docs.livekit.io/client-sdk-js/).

For further information, check the [tutorial documentation](https://livekit-tutorials.openvidu.io/tutorials/application-client/javascript/).

## Prerequisites

-   [Node](https://nodejs.org/en/download)

## Run

1. Download repository

```bash
git clone https://github.com/OpenVidu/openvidu-livekit-tutorials.git
cd openvidu-livekit-tutorials/application-client/openvidu-js
```

2. Run the application

To run this tutorial, you will need a HTTP web server installed on your development computer. If you have Node.js installed, you can easily set up [http-server](https://github.com/indexzero/http-server):

```bash
npm install -g http-server
```

After installing http-server, serve the tutorial:

```bash
http-server -p 5080 src
```
