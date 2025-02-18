# DVA Auto Bot 🤖

```
██████╗  ██╗   ██╗ █████╗     ██████╗  ██████╗ ████████╗
██╔══██╗ ██║   ██║██╔══██╗    ██╔══██╗██╔═══██╗╚══██╔══╝
██║  ██║ ██║   ██║███████║    ██████╔╝██║   ██║   ██║   
██║  ██║ ╚██╗ ██╔╝██╔══██║    ██╔══██╗██║   ██║   ██║   
██████╔╝  ╚████╔╝ ██║  ██║    ██████╔╝╚██████╔╝   ██║   
╚═════╝    ╚═══╝  ╚═╝  ╚═╝    ╚═════╝  ╚═════╝    ╚═╝   
```

## Overview 📌
DVA Auto Bot is an automation tool designed to interact with the Gata.xyz Data Verification Agent (DVA) platform. It automates the process of session management and activity simulation.

## Features ⭐
- Automated DVA session management
- Configurable activity simulation
- Multi-account support
- Proxy support per account
- Colorful console logging
- Screenshot monitoring
- Graceful error handling
- Automatic cleanup

## Prerequisites 📋
- Node.js (v14 or higher)
- npm (Node Package Manager)
- A valid Gata.xyz account
- (Optional) Proxy configuration for each account

## Installation 🚀

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dva-auto-bot.git
cd dva-auto-bot
```

2. Install dependencies:
```bash
npm install playwright axios
```

3. Configure your settings:
Create a `config.json` file in the root directory:
```json
{
  "accounts": [
    {
      "address": "YOUR_WALLET_ADDRESS",
      "bearer": "YOUR_BEARER_TOKEN",
      "llm_token": "YOUR_LLM_TOKEN",
      "task_token": "YOUR_TASK_TOKEN",
      "invite_code": "YOUR_INVITE_CODE",
      "proxy": {
        "server": "ip:port",
        "username": "proxy_username",
        "password": "proxy_password"
      }
    }
  ],
  "delayBetweenAccounts": 60,
  "maxConcurrentSessions": 3
}
```
# How to Get Required Tokens 🔑

## Step-by-Step Token Collection Guide

### 1. Get Bearer Token
1. Go to [app.gata.xyz/dataAgent](https://app.gata.xyz/dataAgent)
2. Open Developer Tools (Press F12 or right-click → Inspect)
3. Go to the "Network" tab
4. Connect your wallet on the website
5. Look for requests with "graphql" or "auth"
6. In the request headers, find "Authorization" or "Bearer"
7. Copy the token (format: `Bearer xxxxxxxx...`)

### 2. Get LLM Token
1. Stay on [app.gata.xyz/dataAgent](https://app.gata.xyz/dataAgent)
2. In Developer Tools → Application tab
3. On the left sidebar, click "Local Storage"
4. Find the key that looks like `aggr_llm_token_[your wallet address]`
5. Copy the value - this is your LLM token

### 3. Get Task Token
1. Still in Developer Tools → Application → Local Storage
2. Look for `aggr_task_token_[your wallet address]`
3. Copy the value - this is your task token

### 4. Get Invite Code
1. In Local Storage, find `invite_code_[your wallet address]`
2. Copy the value - this is your invite code

### 5. Visual Guide to Find Tokens

```
Developer Tools Location:
├── Network Tab (Bearer Token)
│   └── Headers
│       └── Authorization: Bearer xxx...
│
├── Application Tab
│   └── Local Storage
│       ├── aggr_llm_token_[address]
│       ├── aggr_task_token_[address]
│       └── invite_code_[address]
```

### Quick Tips 💡
- Make sure you're logged in before searching for tokens
- If you can't find tokens, try refreshing the page
- Tokens might expire periodically, update them in config.json when needed
- Keep your tokens secure and don't share them

### Example config.json with Real Token Format
```json
{
  "accounts": [
    {
      "address": "0x1234...5678",  // Your wallet address
      "bearer": "Bearer eyJhbGc....",  // Starts with "Bearer "
      "llm_token": "gata_llm_.....",  // Starts with "gata_llm_"
      "task_token": "gata_task_...",  // Starts with "gata_task_"
      "invite_code": "GATA2024...",   // Usually uppercase
      "proxy": {
        "server": "123.456.789.0:8080",
        "username": "proxyuser",
        "password": "proxypass"
      }
    }
  ],
  "delayBetweenAccounts": 60,
  "maxConcurrentSessions": 3
}
```

### Troubleshooting Token Issues 🔧
If you encounter issues:
1. Clear browser cache and try again
2. Make sure wallet is properly connected
3. Check if tokens are expired
4. Verify token format matches examples above
5. Ensure all required tokens are present

### Security Notice ⚠️
- Never share your tokens
- Regularly rotate tokens if ▋
## Usage 🎮

1. Start the bot:
```bash
node index.js
```

2. Monitor the console output for status updates:
```
[INFO] Starting DVA automation...
[INFO] Checking internet connection...
[SUCCESS] LocalStorage items set successfully
[SUCCESS] DVA Start button clicked successfully...
```

3. To stop the bot gracefully, press `Ctrl+C`

## File Structure 📁
```
dva-auto-bot/
├── index.js        # Main bot logic
├── banner.js       # ASCII art and color utilities
├── config.json     # Configuration file
├── logs/          # Activity logs directory
└── README.md      # This file
```

## Configuration Options ⚙️

### Account Configuration
- `address`: Your wallet address
- `bearer`: Bearer token for authentication
- `llm_token`: LLM token for the platform
- `task_token`: Task token for the platform
- `invite_code`: Your invitation code

### Proxy Configuration (Optional)
- `server`: Proxy server address (ip:port)
- `username`: Proxy authentication username
- `password`: Proxy authentication password

### Global Settings
- `delayBetweenAccounts`: Delay in seconds between starting each account
- `maxConcurrentSessions`: Maximum number of concurrent sessions

## Logging 📝
- Logs are stored in the `logs` directory
- Each day has its own log file: `dva_bot_YYYY-MM-DD.log`
- Screenshots are saved for monitoring and debugging

## Error Handling 🔧
The bot includes comprehensive error handling:
- Internet connection monitoring
- Navigation retry mechanism
- Graceful shutdown on errors
- Screenshot capture for debugging
- Detailed error logging

## License 📄
This project is licensed under the MIT License - see the LICENSE file for details.

## Support 💪
If you encounter any issues or have questions, please:
1. Check the logs in the `logs` directory
2. Review the screenshots generated during the session
3. Open an issue on GitHub with the relevant log files and screenshots

## Disclaimer ⚠️
This bot is for educational purposes only. Make sure to comply with Gata.xyz's terms of service when using this tool.

## VERSION 👨‍💻
Version: 1.0.0