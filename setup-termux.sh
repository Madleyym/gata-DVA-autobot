#!/data/data/com.termux/files/usr/bin/bash

echo "Setting up DVA Bot for Termux..."

# Update packages
pkg update && pkg upgrade -y

# Install required packages
pkg install nodejs chromium git which -y

# Install npm packages
npm install

# Create config from sample if it doesn't exist
if [ ! -f config.json ]; then
    if [ -f config.sample.json ]; then
        cp config.sample.json config.json
        echo "Created config.json from sample. Please edit with your credentials."
    else
        echo "Creating config.sample.json..."
        cat > config.sample.json << EOL
{
    "address": "YOUR_WALLET_ADDRESS",
    "bearer": "YOUR_BEARER_TOKEN",
    "llm_token": "YOUR_LLM_TOKEN",
    "task_token": "YOUR_TASK_TOKEN",
    "invite_code": "YOUR_INVITE_CODE"
}
EOL
        cp config.json config.json
        echo "Created config.json. Please edit with your credentials."
    fi
fi

# Create logs directory
mkdir -p logs

echo "Setup completed! Now you can:"
echo "1. Edit config.json with your credentials"
echo "2. Run the bot with: npm run start:termux"