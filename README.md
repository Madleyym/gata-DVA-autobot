# GATA-DVA-Autobot

A Python-based automation bot for GATA DVA tasks with chat capabilities and proxy support.

## ⚠️ Development Status

This bot is currently in active development and may have the following issues:
- Server connection instability (Server disconnected errors)
- Chat system returning 404 errors
- Empty message handling needs improvement
- Session management issues

## 🚀 Features

- Auto and manual chat modes
- Proxy support for request handling
- Task processing and validation
- Encrypted data handling
- Comprehensive logging system
- Cross-platform compatibility (Windows/Linux/Mac)

## 📋 Prerequisites

- Python 3.7+
- pip (Python package installer)

You can install all dependencies using:
```bash
pip install -r requirements.txt
```

Or install individually:
```bash
pip install asyncio==3.4.3
pip install aiohttp==3.9.1
pip install colorama==0.4.6
pip install pytz==2023.3.post1
pip install cryptography==41.0.7
```

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/Madleyym/gata-DVA-autobot.git
cd gata-DVA-autobot
```

2. Install required dependencies:
```bash
pip install -r requirements.txt
```

3. Set up configuration files:

Create the following files in your project directory:
- `token.txt`: Contains your bearer token
- `proxies.txt`: List of proxies (optional)
- Create a `logs` directory for log files

## 🚀 Usage

1. Configure your token:
   - Add your bearer token to `token.txt`
   - (Optional) Add proxies to `proxies.txt`

2. Run the bot:
```bash
python bot.py
```

3. Chat Options:
   - `1`: Auto Chat (Default)
   - `2`: Manual Chat
   - `3`: Skip Chat

## 💡 Features in Development

- Enhanced error handling
- Improved connection stability
- Better response handling
- Robust session management
- Enhanced proxy management
- Improved task validation system

## 🐛 Known Issues

1. Server Connection:
   - Intermittent disconnections
   - API Check failures

2. Chat System:
   - 404 errors during chat attempts
   - Empty message handling issues

3. Session Management:
   - Unexpected session closures
   - Connection reset issues

## 🔧 Troubleshooting

1. Connection Issues:
   - Verify your internet connection
   - Try using a different proxy
   - Check if your token is valid

2. Chat Errors:
   - Ensure message isn't empty
   - Wait a few seconds between chat attempts
   - Check server status

3. Session Problems:
   - Restart the bot
   - Clear any existing sessions
   - Verify proxy connectivity

4. Dependencies Issues:
   - Make sure all packages are installed with correct versions
   - Try creating a new virtual environment
   - Update pip: `python -m pip install --upgrade pip`
   - If getting errors, install dependencies one by one to identify problematic package

## 🤝 Contributing

Contributions are welcome! Areas that need attention:
- Error handling improvements
- Connection stability enhancements
- Chat system reliability
- Session management optimization

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## ⚠️ Disclaimer

This bot is for educational purposes only. Use at your own risk and ensure compliance with GATA's terms of service.

## 📞 Support

For issues and feature requests, please use the GitHub issue tracker.

## 🔄 Updates

Check the repository regularly for updates and improvements. This is an active development project and changes frequently.