# Basic Python

Basic server application built for Python with Flask. It internally uses [livekit-python-sdk](https://github.com/livekit/python-sdks).

For further information, check the [tutorial documentation](https://livekit-tutorials.openvidu.io/tutorials/application-server/python/).

## Prerequisites

-   [Python 3](https://www.python.org/downloads/)

## Run

1. Download repository

```bash
git clone https://github.com/OpenVidu/openvidu-livekit-tutorials.git
cd openvidu-livekit-tutorials/application-server/python
```

2. Create python virtual environment and activate it

```bash
python -m venv venv
```

-   Windows

    ```bash
    .\venv\Scripts\activate
    ```

-   Linux/macOS

    ```bash
    . ./venv/bin/activate
    ```

3. Install dependencies

```bash
pip install -r requirements.txt
```

4. Run the application

```bash
python app.py
```
