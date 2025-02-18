const fs = require("fs");
const puppeteer = require("puppeteer-core");
const path = require("path");
const axios = require("axios");
require("dotenv").config();
const os = require("os");
const { colors, banner } = require("./banner");

let browser;
let intervalId;
let isShuttingDown = false;
let isPageClosed = false;
let isFirstRun = true;

const PAGE_TIMEOUT = parseInt(process.env.PAGE_TIMEOUT) || 180000;
const NAVIGATION_TIMEOUT = parseInt(process.env.NAVIGATION_TIMEOUT) || 120000;
const ACTIVITY_INTERVAL = parseInt(process.env.ACTIVITY_INTERVAL) || 120000;
const ACTIVE_SESSION_DURATION =
  parseInt(process.env.ACTIVE_SESSION_DURATION) || 28800000;
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES) || 5;

const BASE_URL = "https://app.gata.xyz/dataAgent";
const SCREENSHOT_PATH = "current_screenshot.png";
const LOG_FILE = `logs/dva_bot_${new Date().toISOString().split("T")[0]}.log`;

async function checkBrowser() {
  const platform = process.platform;
  if (platform === "win32") {
    const possiblePaths = [
      "C:\\Program Files\\Chromium\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      process.env.LOCALAPPDATA + "\\Chromium\\Application\\chrome.exe",
      process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
    ];

    const browserPath = possiblePaths.find((path) => fs.existsSync(path));
    if (!browserPath) {
      log(
        "Chrome/Chromium not found. Please install Chrome or Chromium browser.",
        "ERROR"
      );
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
  console.error(
    `${colors.fg.red}Error reading config.json: ${error.message}${colors.reset}`
  );
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
  if (isPageClosed) {
    log("Page is closed, cannot take screenshot", "WARNING");
    return;
  }

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
    await page.waitForFunction(() => document.readyState === "complete", {
      timeout: 30000,
    });

    await page
      .waitForNetworkIdle({
        timeout: 30000,
        idleTime: 1000,
      })
      .catch(() => {
        log("Network idle timeout - continuing anyway", "WARNING");
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
  if (isPageClosed) {
    log("Page is already closed, stopping navigation attempts", "WARNING");
    return false;
  }

  try {
    if (retryCount > 0) {
      log(`Retry attempt ${retryCount}/${MAX_RETRIES}...`);
      const waitTime = Math.min(1000 * Math.pow(2, retryCount), 30000);
      log(`Waiting ${(waitTime / 1000).toFixed(2)} seconds before retrying...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    const isConnected = await checkInternetConnection();
    if (!isConnected) {
      throw new Error("No internet connection available");
    }

    await page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);

    await Promise.race([
      page.goto(url, {
        waitUntil: "domcontentloaded", 
        timeout: NAVIGATION_TIMEOUT,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`Navigation timeout after ${NAVIGATION_TIMEOUT}ms`)
            ),
          NAVIGATION_TIMEOUT
        )
      ),
    ]);

    await page.waitForTimeout(5000);

    const hasError = await page.evaluate(() => {
      const errorTexts = [
        "404 not found",
        "server error",
        "connection refused",
      ];
      const pageText = document.body.innerText.toLowerCase();
      return errorTexts.some((error) => pageText.includes(error));
    });

    if (hasError) {
      throw new Error("Page loaded with critical errors");
    }

    await waitForPageLoad(page);

    return true;
  } catch (error) {
    if (isPageClosed || error.message.includes("detached")) {
      log("Page is closed or detached, stopping navigation", "WARNING");
      return false;
    }

    log(
      `Navigation error (attempt ${retryCount + 1}/${MAX_RETRIES}): ${
        error.message
      }`,
      "ERROR"
    );

    try {
      if (!isPageClosed) {
        await takeScreenshot(
          page,
          `navigation-error-attempt-${retryCount + 1}`
        );
      }
    } catch (screenshotError) {
      log(`Screenshot error: ${screenshotError.message}`, "WARNING");
    }

    if (retryCount < MAX_RETRIES - 1) {
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

    isPageClosed = true;

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
          const browserProcess = browser.process();
          if (browserProcess) {
            process.kill(browserProcess.pid);
            log("Browser process killed", "SUCCESS");
          }
        } catch (killError) {
          log(`Could not force kill browser: ${killError.message}`, "WARNING");
        }
      }
    }

    log("Cleanup completed. Bot shutting down gracefully.", "SUCCESS");
  } catch (error) {
    log(`Cleanup error: ${error.message}`, "ERROR");
  } finally {
    setTimeout(() => process.exit(exitCode), 2000);
  }
}

async function initBrowser() {
  const platform = process.platform;
  const isTermux = process.env.TERMUX_VERSION !== undefined;
  let executablePath;

  try {
    if (isTermux) {
      executablePath = "/data/data/com.termux/files/usr/bin/chromium";
      if (!fs.existsSync(executablePath)) {
        throw new Error(
          "Chromium not found in Termux. Please run: pkg install chromium"
        );
      }
    } else if (process.env.CHROME_PATH) {
      executablePath = process.env.CHROME_PATH;
      if (!fs.existsSync(executablePath)) {
        throw new Error(`Chrome not found at ${process.env.CHROME_PATH}`);
      }
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
        platform === "win32"
          ? "Chrome/Chromium not found. Please install Chrome or set CHROME_PATH."
          : platform === "darwin"
          ? "Chrome/Chromium not found. Install with: brew install --cask chromium"
          : isTermux
          ? "Chromium not found. Install with: pkg install chromium"
          : "Chrome/Chromium not found. Install with: sudo apt install chromium-browser"
      );
    }

    log(`Using Chrome at: ${executablePath}`, "INFO");

    const browserArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--ignore-certificate-errors",
      "--ignore-certificate-errors-spki-list",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--no-first-run",
      "--disable-notifications",
      "--disable-infobars",
    ];

    if (isTermux) {
      browserArgs.push(
        "--disable-session-crashed-bubble",
        "--no-first-run",
        "--disable-notifications",
        "--disable-infobars",
        "--disable-dev-shm-usage",
        "--force-gpu-mem-available-mb=512",
        "--memory-pressure-off",
        "--single-process"
      );
    }

    return await puppeteer.launch({
      executablePath,
      headless: "new",
      args: browserArgs.filter(Boolean),
      defaultViewport: {
        width: 1280,
        height: 800,
      },
      timeout: 60000,
      ignoreHTTPSErrors: true,
      protocolTimeout: 30000,
    });
  } catch (error) {
    log(`Browser initialization error: ${error.message}`, "ERROR");
    throw error;
  }
}

async function setupPage(page) {
  await page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
  await page.setDefaultTimeout(PAGE_TIMEOUT);
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
}

async function runMainWorkflow(page) {
  try {
    log("Navigating to DVA page...", "INFO");
    const navigationSuccess = await attemptNavigation(page, BASE_URL);

    if (!navigationSuccess) {
      throw new Error("Navigation failed");
    }

    await page.waitForTimeout(5000);

    log("Setting up localStorage...", "INFO");
    await setRequiredLocalStorage(page);

    log("Reloading page...", "INFO");
    const reloadSuccess = await attemptNavigation(page, page.url());

    if (!reloadSuccess) {
      throw new Error("Page reload failed");
    }

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
      log("Error during workflow execution: " + error.message, "ERROR");
      if (!isPageClosed) {
        await takeScreenshot(page, "workflow-error").catch(() => {});
      }
      await cleanup(1);
    }
  }
}

async function main() {
  try {
    if (isFirstRun) {
      console.log(banner);
      isFirstRun = false;
    }

    log("Starting DVA automation...", "INFO");

    log("Checking internet connection...", "INFO");
    const isConnected = await checkInternetConnection();
    if (!isConnected) {
      throw new Error("No internet connection available");
    }

    log("Initializing browser...", "INFO");
    browser = await initBrowser();

    const page = await browser.newPage();
    await setupPage(page);

    try {
      await runMainWorkflow(page);
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

function setupSignalHandlers() {
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
}

setupSignalHandlers();

checkBrowser()
  .then(() => {
    main().catch(async (error) => {
      if (!isShuttingDown) {
        log("Fatal error in main: " + error, "ERROR");
        await cleanup(1);
      }
    });
  })
  .catch(async (error) => {
    log("Browser compatibility check failed: " + error.message, "ERROR");
    await cleanup(1);
  });
