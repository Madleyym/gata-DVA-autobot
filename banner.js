const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    crimson: "\x1b[38m",
  },
  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
    crimson: "\x1b[48m",
  },
};
async function initBrowser() {
  // Periksa dan dapatkan path Chrome yang valid
  const platform = process.platform;
  let executablePath;

  if (process.env.CHROME_PATH) {
    executablePath = process.env.CHROME_PATH;
  } else {
    const possiblePaths =
      platform === "win32"
        ? [
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files\\Chromium\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe",
            `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
            `${process.env.LOCALAPPDATA}\\Chromium\\Application\\chrome.exe`,
          ]
        : platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
          ]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
          ];

    executablePath = possiblePaths.find((path) => fs.existsSync(path));
  }

  if (!executablePath) {
    throw new Error(
      "Chrome or Chromium executable not found. Please install Chrome/Chromium or set CHROME_PATH environment variable."
    );
  }

  log(`Using Chrome at: ${executablePath}`, "INFO");

  return await puppeteer.launch({
    executablePath: executablePath,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--ignore-certificate-errors",
      "--ignore-certificate-errors-spki-list",
      process.platform === "android" ? "--disable-session-crashed-bubble" : "",
    ].filter(Boolean),
    defaultViewport: {
      width: 1280,
      height: 800,
    },
  });
}
function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getUserInfo() {
  return process.env.USER || process.env.LOGNAME || process.env.USERNAME || "";
}

module.exports = {
  colors,
  banner: `
${colors.fg.cyan}${colors.bright}

██████╗  ██╗   ██╗ █████╗     ██████╗  ██████╗ ████████╗
██╔══██╗ ██║   ██║██╔══██╗    ██╔══██╗██╔═══██╗╚══██╔══╝
██║  ██║ ██║   ██║███████║    ██████╔╝██║   ██║   ██║   
██║  ██║ ╚██╗ ██╔╝██╔══██║    ██╔══██╗██║   ██║   ██║   
██████╔╝  ╚████╔╝ ██║  ██║    ██████╔╝╚██████╔╝   ██║   
╚═════╝    ╚═══╝  ╚═╝  ╚═╝    ╚═════╝  ╚═════╝    ╚═╝   

${colors.reset}                              
${colors.fg.yellow}Version: 1.0.0${colors.reset}
${colors.fg.blue}Current Date and Time (UTC): ${
    colors.bright
  }${getCurrentDateTime()}${colors.reset}
${
  getUserInfo()
    ? `${colors.fg.green}Current User: ${colors.bright}${getUserInfo()}${
        colors.reset
      }\n`
    : ""
}`,
};
