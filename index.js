const fs = require("fs");
const puppeteer = require("puppeteer-core");
const path = require("path");
const axios = require("axios");
const os = require("os");
const { colors, banner } = require("./banner");

let browser;
let intervalId;
let isShuttingDown = false;

const BASE_URL = "https://app.gata.xyz/dataAgent";
const ACTIVITY_INTERVAL = 120000;
const ACTIVE_SESSION_DURATION = 8 * 60 * 60 * 1000;
const PAGE_TIMEOUT = 180000;
const NAVIGATION_TIMEOUT = 120000;
const MAX_RETRIES = 5;
const SCREENSHOT_PATH = "current_screenshot.png";
const LOG_FILE = `logs/dva_bot_${new Date().toISOString().split("T")[0]}.log`;

async function checkBrowser() {
    const platform = process.platform;
    if (platform === 'win32') {
        const possiblePaths = [
            "C:\\Program Files\\Chromium\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe",
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            process.env.LOCALAPPDATA + "\\Chromium\\Application\\chrome.exe",
            process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe"
        ];

        const browserPath = possiblePaths.find(path => fs.existsSync(path));
        if (!browserPath) {
            log("Chrome/Chromium not found. Please install Chrome or Chromium browser.", "ERROR");
            process.exit(1);
        }
        process.env.CHROME_PATH = browserPath;
    }
}

const getPlatformConfig = () => {
  const platform = process.platform;
  const isTermux = process.env.TERMUX_VERSION !== undefined;

  if (isTermux) {
    return {
      chromePath: "/data/data/com.termux/files/usr/bin/chromium",
      userDataDir: "/data/data/com.termux/files/home/.config/chromium",
      downloadPath: "/data/data/com.termux/files/home/Downloads",
    };
  }

  switch (platform) {
    case "win32":
      const possiblePaths = [
        "C:\\Program Files\\Chromium\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        process.env.LOCALAPPDATA + "\\Chromium\\Application\\chrome.exe",
        process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
      ];

      const existingPath = possiblePaths.find((path) => fs.existsSync(path));

      return {
        chromePath:
          existingPath ||
          "C:\\Program Files\\Chromium\\Application\\chrome.exe",
        userDataDir: process.env.LOCALAPPDATA + "\\Chromium\\User Data",
        downloadPath: process.env.USERPROFILE + "\\Downloads",
      };
    default: // Linux
      return {
        chromePath: "/usr/bin/chromium",
        userDataDir: process.env.HOME + "/.config/chromium",
        downloadPath: process.env.HOME + "/Downloads",
      };
  }
};

const platformConfig = getPlatformConfig();

if (!fs.existsSync("logs")) {
    fs.mkdirSync("logs", { recursive: true });
}

let configs;
try {
    configs = JSON.parse(fs.readFileSync("config.json", "utf8"));
} catch (error) {
    console.error(`${colors.fg.red}Error reading config.json: ${error.message}${colors.reset}`);
    process.exit(1);
}

function log(message, type = "INFO") {
    const timestamp = new Date().toISOString();
    let colorCode;

    switch (type) {
        case "ERROR":
            colorCode = colors.fg.red;
            break;
        case "WARNING":
            colorCode = colors.fg.yellow;
            break;
        case "SUCCESS":
            colorCode = colors.fg.green;
            break;
        case "INFO":
            colorCode = colors.fg.cyan;
            break;
        case "DEBUG":
            colorCode = colors.fg.magenta;
            break;
        default:
            colorCode = colors.reset;
    }

    const logMessage = `${colorCode}[${timestamp}] [${type}] ${message}${colors.reset}`;
    console.log(logMessage);
    const cleanMessage = `[${timestamp}] [${type}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, cleanMessage);
}

console.log(banner);
log("Starting DVA automation...", "INFO");

function cleanupScreenshots() {
  const directory = "./";
  fs.readdirSync(directory).forEach((file) => {
    if (
      file.startsWith("screenshot-") ||
      file.startsWith("debug-") ||
      file.startsWith("error-") ||
      file.startsWith("verification-")
    ) {
      try {
        fs.unlinkSync(path.join(directory, file));
        log(`Deleted old screenshot: ${file}`, "CLEANUP");
      } catch (err) {
        log(`Error deleting file ${file}: ${err}`, "ERROR");
      }
    }
  });
}

async function checkInternetConnection() {
  try {
    await Promise.race([
      axios.get("https://www.google.com"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000)
      ),
    ]);
    return true;
  } catch (error) {
    log("Internet connection check failed: " + error.message, "ERROR");
    return false;
  }
}

async function takeScreenshot(page, description = "") {
  try {
    if (fs.existsSync(SCREENSHOT_PATH)) {
      fs.unlinkSync(SCREENSHOT_PATH);
    }

    await page.screenshot({ path: SCREENSHOT_PATH });
    log(`Screenshot taken: ${description}`, "SUCCESS");
  } catch (error) {
    log("Error taking screenshot: " + error.message, "ERROR");
  }
}

async function setRequiredLocalStorage(page) {
  try {
    await page.evaluate((configs) => {
      localStorage.setItem(configs.address, configs.bearer);
      localStorage.setItem("AGG_USER_IS_LOGIN", "1");
      localStorage.setItem("Gata_Chat_GotIt", "1");
      localStorage.setItem("aggr_current_address", configs.address);
      localStorage.setItem(
        `aggr_llm_token_${configs.address}`,
        configs.llm_token
      );
      localStorage.setItem(
        `aggr_task_token_${configs.address}`,
        configs.task_token
      );
      localStorage.setItem(
        `invite_code_${configs.address}`,
        configs.invite_code
      );
      localStorage.setItem("wagmi.recentConnectorId", '"metaMask"');
      localStorage.setItem(
        "wagmi.store",
        JSON.stringify({
          state: {
            connections: {
              __type: "Map",
              value: [
                [
                  "e52bdc16f63",
                  {
                    accounts: [configs.address],
                    chainId: 1017,
                    connector: {
                      id: "metaMask",
                      name: "MetaMask",
                      type: "injected",
                      uid: "e52bdc16f63",
                    },
                  },
                ],
              ],
            },
            chainId: 1017,
            current: "e52bdc16f63",
          },
          version: 2,
        })
      );
    }, configs);
    log("LocalStorage items set successfully", "SUCCESS");
  } catch (error) {
    log("Error setting localStorage: " + error.message, "ERROR");
    throw error;
  }
}

async function simulateActivity(page) {
  try {
    await page.evaluate(() => {
      window.scrollTo(0, 500);
      setTimeout(() => window.scrollTo(0, 0), 1000);
    });

    const time = new Date().toLocaleTimeString();
    const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    const randomSpinner = spinner[Math.floor(Math.random() * spinner.length)];

    log(
      `${randomSpinner} Activity simulated at ${time} ${randomSpinner}`,
      "SUCCESS"
    );
    await takeScreenshot(page, "Activity simulation");
  } catch (error) {
    log("Error during activity simulation: " + error.message, "ERROR");
  }
}

async function waitForPageLoad(page) {
  try {
    const EXTENDED_TIMEOUT = 60000; 

    await Promise.race([
      page.waitForNavigation({
        waitUntil: "networkidle0",
        timeout: EXTENDED_TIMEOUT,
      }),
      new Promise((resolve) => setTimeout(resolve, EXTENDED_TIMEOUT)),
    ]);

    await page.evaluate(() => {
      return new Promise((resolve) => {
        if (document.readyState === "complete") {
          resolve();
        } else {
          document.addEventListener("load", resolve);
        }
      });
    });

    return true;
  } catch (error) {
    log(`Page load warning: ${error.message}`, "WARNING");
    return false;
  }
}

async function findAndClickStartButton(page) {
  log("Looking for Start button on DVA page...");

  try {
    await takeScreenshot(page, "Before finding Start button");

    const currentUrl = page.url();
    if (!currentUrl.includes("/dataAgent")) {
      log("Not on DVA page, navigating...");
      await attemptNavigation(page, BASE_URL);
      await waitForPageLoad(page); 
    }

    await page.waitForTimeout(10000);

    const buttonFound = await page.evaluate(() => {
      const isVisible = (elem) => {
        if (!elem) return false;
        const style = window.getComputedStyle(elem);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          elem.offsetParent !== null
        );
      };

      const relevantTexts = [
        "start",
        "begin",
        "launch",
        "dva",
        "verify",
        "Start",
      ];
      const elements = Array.from(
        document.querySelectorAll(
          'button, div[role="button"], a[role="button"], div[class*="button"]'
        )
      );

      for (const element of elements) {
        const text = (element.textContent || "").toLowerCase().trim();
        if (
          isVisible(element) &&
          relevantTexts.some((t) => text.includes(t.toLowerCase()))
        ) {
          element.click();
          return true;
        }
      }

      const buttonSelectors = [
        '[class*="start"]',
        '[class*="begin"]',
        '[class*="launch"]',
        '[class*="verify"]',
        '[class*="dva"]',
        '[class*="button"]',
      ];

      for (const selector of buttonSelectors) {
        const elements = Array.from(document.querySelectorAll(selector)).filter(
          (el) => isVisible(el)
        );

        if (elements.length > 0) {
          elements[0].click();
          return true;
        }
      }

      const dataElements = Array.from(
        document.querySelectorAll(
          '[data-testid*="start"], [data-testid*="button"]'
        )
      );
      for (const element of dataElements) {
        if (isVisible(element)) {
          element.click();
          return true;
        }
      }

      return false;
    });

    if (buttonFound) {
      log("Successfully clicked Start button", "SUCCESS");
      await takeScreenshot(page, "After clicking Start button");
      return true;
    }

    log("Start button not found. Saving page content...", "WARNING");
    const pageContent = await page.content();
    fs.writeFileSync("debug-page-content.html", pageContent);
    await takeScreenshot(page, "Button-not-found");
    return false;
  } catch (error) {
    log(`Error finding Start button: ${error.message}`, "ERROR");
    await takeScreenshot(page, "Error state");
    return false;
  }
}

async function keepSessionActive(page) {
  const startTime = Date.now();

  const activityInterval = setInterval(async () => {
    if (Date.now() - startTime > ACTIVE_SESSION_DURATION) {
      clearInterval(activityInterval);
      log("Session duration limit reached. Stopping activity.");
      return;
    }
    await simulateActivity(page);
  }, ACTIVITY_INTERVAL);

  return activityInterval;
}

async function attemptNavigation(page, url, retryCount = 0) {
  try {
    if (retryCount > 0) {
      log(`Retry attempt ${retryCount}/${MAX_RETRIES}...`);
    }

    const isConnected = await checkInternetConnection();
    if (!isConnected) {
      throw new Error("No internet connection available");
    }

    await page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: NAVIGATION_TIMEOUT,
    });

    await waitForPageLoad(page);

    return true;
  } catch (error) {
    log(
      `Navigation error (attempt ${retryCount + 1}/${MAX_RETRIES}): ${
        error.message
      }`,
      "ERROR"
    );
    await takeScreenshot(page, `navigation-error-attempt-${retryCount + 1}`);

    if (retryCount < MAX_RETRIES - 1) {
      const waitTime = Math.min(1000 * Math.pow(2, retryCount), 30000);
      log(`Waiting ${waitTime / 1000} seconds before retrying...`);
      await page.waitForTimeout(waitTime);
      return attemptNavigation(page, url, retryCount + 1);
    }

    throw new Error(`Failed to navigate after ${MAX_RETRIES} attempts`);
  }
}

async function cleanup(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log("Starting cleanup process...", "INFO");

  try {
    if (intervalId) {
      clearInterval(intervalId);
      log("Activity simulation stopped", "INFO");
    }

    if (browser) {
      log("Closing browser...", "INFO");
      try {
        await Promise.race([
          browser.close(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Browser close timeout")), 5000)
          ),
        ]);
        log("Browser closed successfully", "SUCCESS");
      } catch (err) {
        log(`Browser close warning: ${err.message}`, "WARNING");
        try {
          process.kill(browser.process().pid);
        } catch (killError) {
          log(`Could not force kill browser: ${killError.message}`, "WARNING");
        }
      }
    }

    log("Cleanup completed. Bot shutting down gracefully.", "SUCCESS");
  } catch (error) {
    log(`Cleanup error: ${error.message}`, "ERROR");
  } finally {
    setTimeout(() => process.exit(exitCode), 1000);
  }
}

async function initBrowser() {
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

async function main() {
  try {
    console.log(banner);
    log("Starting DVA automation...", "INFO");

    log("Checking internet connection...", "INFO");
    const isConnected = await checkInternetConnection();
    if (!isConnected) {
      throw new Error("No internet connection available");
    }

    try {
      browser = await initBrowser();
      log("Browser initialized successfully", "SUCCESS");
    } catch (error) {
      log(`Failed to initialize browser: ${error.message}`, "ERROR");
      throw error;
    }

    const page = await browser.newPage();

    await page.setDefaultNavigationTimeout(60000);

    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    try {
      log("Navigating to DVA page...", "INFO");
      await attemptNavigation(page, BASE_URL);

      await page.waitForTimeout(5000);

      log("Setting up localStorage...", "INFO");
      await setRequiredLocalStorage(page);

      log("Reloading page...", "INFO");
      await attemptNavigation(page, page.url());

      await page.waitForTimeout(5000);

      const buttonClicked = await findAndClickStartButton(page);

      if (buttonClicked) {
        log(
          "DVA Start button clicked successfully. Starting activity simulation...",
          "SUCCESS"
        );
        intervalId = await keepSessionActive(page);
      } else {
        log(
          "Could not find DVA Start button. Check screenshots and page content for debugging.",
          "ERROR"
        );
        await cleanup(1);
      }
    } catch (error) {
      if (!isShuttingDown) {
        log("Error during execution: " + error, "ERROR");
        await takeScreenshot(page, "Fatal error").catch(() => {});
        await cleanup(1);
      }
    }
  } catch (error) {
    if (!isShuttingDown) {
      log("Fatal error: " + error, "ERROR");
      await cleanup(1);
    }
  }
}

if (process.platform === "win32") {
  const rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("SIGINT", () => {
    process.emit("SIGINT");
  });
}

process.on("SIGINT", async () => {
  log("Received SIGINT (Ctrl+C). Starting graceful shutdown...", "WARNING");
  await cleanup(0);
});

process.on("SIGTERM", async () => {
  log("Received SIGTERM. Starting graceful shutdown...", "WARNING");
  await cleanup(0);
});

process.on("uncaughtException", async (error) => {
  if (!isShuttingDown) {
    log("Uncaught Exception: " + error, "ERROR");
    await cleanup(1);
  }
});

process.on("unhandledRejection", async (reason, promise) => {
  if (!isShuttingDown) {
    log("Unhandled Rejection at: " + promise + " reason: " + reason, "ERROR");
    await cleanup(1);
  }
});

main().catch(async (error) => {
  if (!isShuttingDown) {
    log("Fatal error in main: " + error, "ERROR");
    await cleanup(1);
  }
});