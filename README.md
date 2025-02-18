# GATA Auto Bot

A web automation project designed to maintain an active session for GATA's Data Verification Agent (DVA).

![DVA Bot Banner](https://via.placeholder.com/750x150?text=GATA+Auto+Bot)

## 📋 Description

GATA Auto Bot is an automation tool that:
- Navigates to GATA's Data Agent platform
- Logs in using preconfigured credentials
- Simulates user activity at regular intervals
- Maintains an active session for extended periods

## 🚀 Features

- Automatic browser detection and setup
- Multi-platform support (Windows, Linux, macOS, Termux)
- Configurable activity intervals
- Scheduled session management
- Detailed logging with screenshots
- Graceful error handling and recovery

## 📋 Requirements

- Node.js (v14 or higher)
- Chrome or Chromium browser
- Internet connection
- For Termux: Termux:API package

## 🛠️ Installation

### For Termux

1. Update packages and install dependencies:
```bash
pkg update -y && pkg upgrade -y
pkg install nodejs -y
pkg install git -y
pkg install chromium -y
```

2. Clone the repository:
```bash
git clone https://github.com/yourusername/gata-auto-bot
cd gata-auto-bot
```

3. Install Node.js dependencies:
```bash
npm install
```

4. Set up configuration:
```bash
cp config.sample.json config.json
nano config.json
```
Fill in your credentials and settings in `config.json`.

### For Linux/Bash

1. Update packages and install dependencies:
```bash
sudo apt update
sudo apt install -y nodejs npm chromium-browser
```

2. Clone the repository:
```bash
git clone https://github.com/yourusername/gata-auto-bot
cd gata-auto-bot
```

3. Install Node.js dependencies:
```bash
npm install
```

4. Set up configuration:
```bash
cp config.sample.json config.json
nano config.json
```
Fill in your credentials and settings in `config.json`.

### For Windows (via Bash/WSL)

1. Install WSL if not already installed:
```powershell
wsl --install
```

2. Follow the Linux/Bash instructions above inside your WSL environment.

## ⚙️ Configuration

Create a `config.json` file in the root directory with the following structure:

```json
{
  "address": "YOUR_WALLET_ADDRESS",
  "bearer": "YOUR_BEARER_TOKEN",
  "llm_token": "YOUR_LLM_TOKEN",
  "task_token": "YOUR_TASK_TOKEN",
  "invite_code": "YOUR_INVITE_CODE"
}
```

## 🚀 How to Run

### Step-by-Step Run Instructions

#### For Termux

1. Make sure you're in the project directory:
```bash
cd gata-auto-bot
```

2. Run the bot using npm script (recommended):
```bash
npm run start:termux
```

3. Alternative method - run directly with Node:
```bash
CHROME_PATH=$(which chromium) node index.js
```

4. For keeping the bot running after closing Termux (recommended):
```bash
# First, install termux-services
pkg install termux-services

# Start the bot with nohup to keep it running
nohup npm run start:termux > bot_output.log 2>&1 &

# To check if it's running
ps aux | grep node
```

#### For Linux/macOS terminal

1. Make sure you're in the project directory:
```bash
cd gata-auto-bot
```

2. Run the bot using npm script:
```bash
npm start
```

3. Alternative methods - run with explicit browser path:
```bash
# For Linux
CHROME_PATH=/usr/bin/chromium node index.js

# For macOS
CHROME_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium node index.js
```

4. To keep the bot running in the background:
```bash
nohup npm start > bot_output.log 2>&1 &
```

#### For Windows

1. Make sure you're in the project directory:
```bash
cd gata-auto-bot
```

2. Set Chrome path environment variable and run:
```bash
set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
node index.js
```

### Running with PM2 (for persistence - recommended)

This is the best method for keeping the bot running persistently:

1. Install PM2 globally first:
```bash
npm install -y pm2 -g
```

2. Start the bot with PM2:
```bash
npm run start:pm2
```

3. View running processes:
```bash
pm2 list
```

4. View logs in real-time:
```bash
pm2 logs dva-bot
```

5. Stop the bot:
```bash
npm run stop:pm2
```

6. Make PM2 start on system boot:
```bash
pm2 save
pm2 startup
```

### View logs

```bash
npm run logs
```
Or manually view the logs:
```bash
cat logs/dva_bot_$(date +%Y-%m-%d).log
```

## 🛠️ Troubleshooting

### Browser not found
Make sure Chrome or Chromium is installed. You can specify the path manually:
```bash
# For Termux
CHROME_PATH=/data/data/com.termux/files/usr/bin/chromium node index.js

# For Linux
CHROME_PATH=/usr/bin/chromium node index.js

# For Windows
set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
node index.js
```

### Internet Connection Issues
The bot will automatically retry connections. Ensure you have a stable internet connection.

### Screenshots for Debugging
Check the root directory for screenshots that are automatically taken during errors or when the Start button isn't found.

## 📝 Logs

Logs are stored in the `logs` directory with filenames formatted as `dva_bot_YYYY-MM-DD.log`.

## ⚠️ Important Notes

1. This bot requires a config.json file with valid credentials
2. Keep your browser updated to latest version
3. For Termux, ensure you have sufficient storage and RAM
4. The bot uses headless mode by default, which runs without visible UI
5. For Termux users: be aware that Android may kill background processes to save battery. Use termux-wake-lock to prevent this:
   ```bash
   termux-wake-lock
   npm run start:termux
   ```

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.
