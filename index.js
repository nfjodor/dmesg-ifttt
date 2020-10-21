const howToUse = `
 * How to run script:
 * ==================
 * If you want run this script only need some params and hit enter ;)
 *
 * Param list:
 * ===========
 * // Event name that will be triggered by the script
 * event=some_event_name
 * 
 * // IFTTT webhook key
 * key=ifttt_webhook_key
 * 
 * // OPTIONAL! Custom dmesg params
 * dmesg-params="--level=err,warn --userspace"
 * 
 * // OPTIONAL! When the script runs at first time,
 * // only messages will be sent that created after system start date + threshold
 * // This value is millisecond value
 * threshold=3600000
 *
 *
 * Example:
 * ========
 * node index.js event=dmesg_alert key=ifttt_webhook_key dmesg-params="--level=err,warn --userspace" threshold=3600000`;

const childProcess = require("child_process");
const https = require("https");
const fs = require("fs");
const os = require("os");

const tmpDataPath = `${os.tmpdir()}/dmesg-ifttt.txt`;
const lastDmesgEntryTime = fs.existsSync(tmpDataPath)
  ? parseInt(fs.readFileSync(tmpDataPath, { encoding: "utf8" }), 10)
  : "Invalid Date";
const options = process.argv.reduce((acc, option) => {
  const [optionKey, ...optionValue] = option.split("=");
  acc[optionKey] = optionValue.join("=");
  return acc;
}, {});

if (!options.event || !options.key) {
  console.log(`ERROR! MISSING PARAMTERS!\n${howToUse}`);
  return;
}

const execute = (command) => {
  return new Promise((resolve, reject) => {
    childProcess.exec(command, (error, standardOutput, standardError) => {
      const errorMessage = error || standardError;
      if (errorMessage) {
        reject(errorMessage);
      } else {
        resolve(standardOutput);
      }
    });
  });
};

const isDate = (date) =>
  new Date(date) !== "Invalid Date" && !isNaN(new Date(date));

const parseIsoDate = (dateString) => {
  const dt = dateString.split(/[: T-]/).map(parseFloat);
  return new Date(
    dt[0],
    dt[1] - 1,
    dt[2],
    dt[3] || 0,
    dt[4] || 0,
    dt[5] || 0,
    0
  );
};

const parseDmesgData = (data) =>
  data.split(/\r?\n/).map((entry) => {
    const [date, ...message] = entry.split(" ");
    return { date: parseIsoDate(date), message: message.join(" ") };
  });

const getRelevantMessages = (minDate, dmesgData = []) =>
  dmesgData.filter((entry) => entry.date.getTime() > minDate);

const printErrorMessage = (error) => {
  if (error.message) {
    console.log(`Something bad happened!\n${error.message}`);
  }
};

const sendMail = async (messages) => {
  const lastMessage = messages[messages.length - 1];
  const message = messages.reduce((acc, message) => {
    acc += `${message.date.toLocaleString()}<br>${message.message}<br><br>`;
    console.log(message.date.toLocaleString(), message.message);
    return acc;
  }, "");
  const req = https.request(
    {
      hostname: "maker.ifttt.com",
      port: 443,
      path: `/trigger/${options.event}/with/key/${options.key}`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    (res) => {
      let response = "";

      res.on("data", (d) => {
        response += d;
      });

      res.on("end", () => {
        const { errors: [error = {}] = [] } = JSON.parse(response);

        printErrorMessage(error);
        fs.writeFileSync(tmpDataPath, String(lastMessage.date.getTime()));
      });
    }
  );

  req.on("error", printErrorMessage);

  req.write(JSON.stringify({ value1: message }));
  req.end();
};

const main = async () => {
  const parsedThreshold = parseInt(options.threshold, 10);
  const threshold = isNaN(parsedThreshold) ? 60 * 60 * 1000 : parsedThreshold;
  let systemStartDateTime = new Date(Date.now() - os.uptime() * 1000).getTime();
  let dmesgData = [];
  let relevantMessages = [];

  try {
    dmesgData = parseDmesgData(
      await execute(`dmesg ${options["dmesg-params"] || ""} --time-format=iso`)
    );
  } catch (error) {
    return printErrorMessage({ message: error.toString() });
  }

  const minDateTime = isDate(lastDmesgEntryTime)
    ? new Date(lastDmesgEntryTime).getTime()
    : systemStartDateTime + threshold;

  relevantMessages = getRelevantMessages(minDateTime, dmesgData);

  if (relevantMessages.length <= 0)
    return console.log("Kernel has no new message.");

  sendMail(relevantMessages);
};

main();
