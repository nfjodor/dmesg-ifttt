# dmesg ifttt webhook

## What is this application
If you have a Linux or OSX (🤮) server and would like to notify new kernel messages like warnings or errors, you can do that with this small application.

## How It works
If you run the app it collects and parses kernel messages with `dmesg` (You need to run this application with root privileges) and calls an IFTTT webhook. Kernel messages will be in the `value1` so if you want to get an e-mail with those messages, you need to use the `value1` variable in the email body.

### Required parameters
I created this app in node.js without dependencies, so you can pass parameters in an unorthodox mode.
This application needs two parameters:
 - `event`: This is the IFTTT webhook event name
 - `key`: This is your unique IFTTT webhook key

```shell
you-are@the-best:~$ sudo ./dmesg-ifttt-linux-x64 event=ifttt_event_name key=ifttt_webhook_key
```

## Cron
I'm using this application with cron, and runs in for example every minute and done, I will get a mail if my server has a new warning or error. I saw, there is a watcher, but in this case, the polling was the easiest way to solve my problem.

## IFTTT
If you would like to test your IFTTT settings, you can do that here: https://ifttt.com/maker_webhooks.

## What if my server architecture is different from `x64`?
In this case, you have 2 options:
 - Run application with node.js like an ordinary man.
 - You can make your own executable.

### Make your own executable
To compile this application, you will need node.js and npm. If you have those of two, you just install `pkg` with `npm install` then run the `npm run pkg` command.
The built package will be in the `build` folder.
If you are unlucky and `pkg` doesn't have pre-built node.js for make executable, your PC will compile it on the fly and it can take several hours (this depends on your CPU speed).
