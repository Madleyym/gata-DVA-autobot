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
  return process.env.USER || "";
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
