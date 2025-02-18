# GATA Auto Bot

A web automation tool that maintains an active session for GATA's Data Verification Agent (DVA).

```
██████╗  ██╗   ██╗ █████╗     ██████╗  ██████╗ ████████╗
██╔══██╗ ██║   ██║██╔══██╗    ██╔══██╗██╔═══██╗╚══██╔══╝
██║  ██║ ██║   ██║███████║    ██████╔╝██║   ██║   ██║   
██║  ██║ ╚██╗ ██╔╝██╔══██║    ██╔══██╗██║   ██║   ██║   
██████╔╝  ╚████╔╝ ██║  ██║    ██████╔╝╚██████╔╝   ██║   
╚═════╝    ╚═══╝  ╚═╝  ╚═╝    ╚═════╝  ╚═════╝    ╚═╝   
```

## Platform Support Status

### Termux (Android)
- ✅ Fully tested and supported
- Requires specific memory management
- Most stable on devices with 4GB RAM or more
- May require additional setup for background running

### Linux
- ✅ Primary development platform
- Tested on Ubuntu 20.04 and newer
- May need adjustments for other distributions

### Windows
- ⚠️ Limited testing
- Recommended to use WSL (Windows Subsystem for Linux)
- Native Windows support is experimental

## System Requirements

### Termux Requirements
- Android 7.0 or newer
- Minimum 3GB RAM (4GB recommended)
- 1GB free storage
- Termux updated to latest version
- Termux:API package installed

### Linux Requirements
- Ubuntu 20.04 or newer (other distributions may need adjustments)
- Node.js v14 or higher
- Chrome/Chromium browser
- Minimum 2GB RAM
- 500MB free storage

### Windows Requirements (via WSL)
- Windows 10 version 2004 or higher
- WSL 2 enabled
- Ubuntu on WSL
- 4GB RAM recommended
- 1GB free storage

## 🤖 Comprehensive Cross-Platform Guide for DVA Bot

## 💻 Platform-Specific Installation Guide

### 1. 📱 Termux (Android)
```bash
# Update and upgrade Termux
pkg update -y && pkg upgrade -y

# Install required dependencies
pkg install nodejs git chromium termux-api -y

# Setup storage access
termux-setup-storage

# Clone repository
git clone https://github.com/Madleyym/gata-DVA-autobot
cd gata-DVA-autobot

# Install Node dependencies
npm install

# Configure memory limit in package.json
# Add to "scripts":
# "start:termux": "CHROME_PATH=/data/data/com.termux/files/usr/bin/chromium node --max-old-space-size=512 index.js"
```

### 2. 🐧 Linux Terminal
```bash
# For Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm chromium-browser git

# For Fedora
sudo dnf install nodejs npm chromium git

# For Arch Linux
sudo pacman -S nodejs npm chromium git

# Clone repository
git clone https://github.com/Madleyym/gata-DVA-autobot
cd gata-DVA-autobot

# Install Node dependencies
npm install
```

### 3. 🪟 Windows Command Prompt/PowerShell
```powershell
# Install WSL
wsl --install

# Then follow Linux instructions in WSL
# OR for native Windows:

# Install Node.js from https://nodejs.org
# Install Git from https://git-scm.com
# Install Chrome/Chromium

# Clone repository
git clone https://github.com/Madleyym/gata-DVA-autobot
cd gata-DVA-autobot

# Install dependencies
npm install
```

## ⚙️ Configuration Setup (All Platforms)

1. Create config file:
```bash
cp config.sample.json config.json
```

2. Edit config.json with your credentials:
```json
{
  "address": "YOUR_WALLET_ADDRESS",
  "bearer": "YOUR_BEARER_TOKEN",
  "llm_token": "YOUR_LLM_TOKEN",
  "task_token": "YOUR_TASK_TOKEN",
  "invite_code": "YOUR_INVITE_CODE"
}
```

## 🚀 Running Methods

### 1. 📱 Termux
```bash
# Prevent sleep
termux-wake-lock

# Basic run
npm run start:termux

# Background run
nohup npm run start:termux > bot_output.log 2>&1 &

# Monitor logs
tail -f bot_output.log

# Monitor memory
top
```

### 2. 🐧 Linux Terminal
```bash
# Basic run
npm start

# Using PM2 (Recommended)
npm install -g pm2
pm2 start index.js --name dva-bot

# Monitor with PM2
pm2 logs dva-bot
pm2 monit

# Using Screen
screen -S dva-bot
npm start
# Press Ctrl+A+D to detach
# screen -r dva-bot to reattach

# Using tmux
tmux new -s dva-bot
npm start
# Press Ctrl+B+D to detach
# tmux attach -t dva-bot to reattach
```

### 3. 🪟 Windows
```powershell
# Basic run
npm start

# Using WSL (Recommended)
wsl
cd gata-DVA-autobot
npm start

# Background run with PowerShell
Start-Process -NoNewWindow npm -ArgumentList "start"
```

## 🔧 Common Issues & Solutions

### 💾 Memory Issues
- Termux: Use `--max-old-space-size=512`
- Linux: Increase swap space
- Windows: Close unnecessary applications

### 🌐 Browser Launch Fails
```bash
# Termux
pkg reinstall chromium

# Linux
sudo apt reinstall chromium-browser

# Windows
# Verify Chrome installation path in code
```

### 📡 Connection Issues
- Check internet connection
- Verify proxy settings if used
- Increase timeout values in code

### ⚡ Process Management
- Termux: Use `nohup` or `tmux`
- Linux: Use PM2 or Screen
- Windows: Use WSL with PM2

## 📊 Monitoring Tools

### 📈 Resource Monitoring
```bash
# Termux
top
htop (if installed)

# Linux
htop
top
free -m

# Windows
taskmgr
wsl --system
```

### 📝 Log Monitoring
```bash
# All platforms
tail -f logs/dva_bot_$(date +%Y-%m-%d).log

# PM2
pm2 logs dva-bot

# Custom logging
npm run logs
```

## 🔒 Security Considerations

1. 🔑 Keep credentials secure
2. ⛔ Don't run as root
3. 🔐 Use environment variables
4. 🔄 Regular updates
5. 👀 Monitor for suspicious activity

## 🛠️ Maintenance Tasks

1. 🧹 Regular cleanup:
```bash
# Clear logs
find logs/ -name "*.log" -mtime +7 -delete

# Clear screenshots
find . -name "screenshot-*" -delete
```

2. 🔄 Updates:
```bash
# Update dependencies
npm update

# Update system
pkg upgrade -y  # Termux
sudo apt update && sudo apt upgrade -y  # Linux
```

3. 💾 Backup:
```bash
# Backup config
cp config.json config.backup.json

# Backup logs
tar -czf logs_backup.tar.gz logs/
```

## ⚠️ Important Reminders

1.  🔄 Always keep your system and dependencies updated
2.  📊 Monitor resource usage regularly
3.  ⚡ Use appropriate process management tools for your platform
4.  🔒 Keep security in mind and protect your credentials
5.  💾 Maintain regular backups of your configuration and logs
6.  🔍 Check logs regularly for any errors or issues
7.  🌐 Ensure stable internet connection
8.  🔋 For mobile devices, keep battery optimization off
9.  💻 Close unnecessary background applications
10. ⏰ Set up automated maintenance tasks

## 🆘 Need Help?

If you encounter any issues:
1. 📝 Check the error logs
2. 🤖 Ask AI assistants (ChatGPT, etc.)
3. 🔍 Search through documentation
4. 💭 Check community forums
5. 📸 Review screenshots for visual debugging

Remember: 🎯 Always monitor the bot's performance and check logs regularly for optimal operation!

## License

This project is licensed under the MIT License. See the LICENSE file for details.