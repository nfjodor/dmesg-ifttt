/* How to run script
 * =================
 * If you want run this script You only need some params and hit enter ;)
 *
 * Param list
 * ==========
 *
 * event=some_event_name // Event name that will be triggered by the script
 * key=ifttt_webhook_key // IFTTT webhook key
 *
 *
 * Example
 * =======
 * node index.js event=dmesg_alert key=ifttt_webhook_key
 */

const childProcess = require("child_process");
const querystring = require("querystring");
const https = require("https");

const options = process.argv.reduce((acc, option) => {
  const optionArray = option.split("=");
  acc[optionArray[0]] = optionArray[1];
  return acc;
}, {});

if (!options.event || !options.key) {
  console.log(`ERROR! MISSING PARAMTERS!\n\nHow to run application\n======================\nIf you want run this script You only need some params and hit enter ;)\n\nParam list\n==========\nevent=some_event_name // Event name that will be triggered by the script\nkey=ifttt_webhook_key // IFTTT webhook key\n\nExample\n=======\napp-name event=dmesg_alert key=ifttt_webhook_key\n`);
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

const parseDmesgData = (data) =>
  data.split(/\r?\n/).map((entry) => {
    const [date, message] = entry.substring(1).split("] ");
    return { date: new Date(date), message };
  });

const getRelevantMessages = (
  startDate,
  dmesgData,
  threshold = 60 * 60 * 1000
) => {
  const minDate = startDate.getTime() + threshold;
  return dmesgData.filter((entry) => entry.date.getTime() >= minDate);
};

const sendMail = async (messages) => {
  const message = messages.reduce((acc, message) => {
    acc += `${message.date.toLocaleString()}<br>${message.message}<br><br>`;
    console.log(message.date.toLocaleString());
    console.log(message.message);
    console.log();
    return acc;
  }, "");
  const postData = querystring.stringify({ value1: message });
  const req = https.request(
    {
      hostname: "maker.ifttt.com",
      port: 443,
      path: `/trigger/${options.event}/with/key/${options.key}`,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    },
    (res) => {
      res.on("data", (d) => {
        process.stdout.write(d + "\n");
      });
    }
  );

  req.on("error", (e) => {
    console.log(`problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();
};

const main = async () => {
  let systemStartDate = new Date();
  let dmesgData = [];
  let relevantMessages = [];

  try {
    systemStartDate = new Date(await execute("uptime -s"));
  } catch (error) {
    console.error(error.toString());
  }

  try {
    dmesgData = parseDmesgData(
      await execute("dmesg --read-clear --time-format=ctime")
    );
  } catch (error) {
    console.error(error.toString());
  }

  relevantMessages = getRelevantMessages(systemStartDate, dmesgData);

  if (relevantMessages.length <= 0)
    return console.log("Kernel has no new message.");

  sendMail(relevantMessages);
};

main();
