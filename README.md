# Timebot

Timebot is an Electron app for Mac and Windows. It runs in the background and records:

- the app in front, as time blocks
- the site in front, and on Mac the other browser tabs that are open
- text files you save in chosen folders, including a diff of what changed

The window shows that day as a timeline. A summary is written only when you ask, using the OpenAI API.

## Run it

```bash
npm install
npm run dev
```

That starts the tracker and opens the window. Closing the window leaves Timebot running in the menu bar (Mac) or system tray (Windows). Quit from that icon.

To build an installer for the computer you are on:

```bash
npm run dist
```

On Mac you may need `CSC_IDENTITY_AUTO_DISCOVERY=false` if you are not code-signing.

## Permissions

On Mac, allow **Electron** (while developing) or **Timebot** (once installed) under System Settings → Privacy & Security → Accessibility. Also allow the Automation prompts for your browsers, or Timebot can see the app name but not the page URL.

On Windows, the active window is read directly. The address bar is read when Windows exposes it; background tabs are not listed.

## What stays on this computer

Activity is stored in Timebot’s app data:

- macOS: `~/Library/Application Support/timebot`
- Windows: `%APPDATA%\timebot`

Snapshots of saved text files live there so the next save can be diffed. `.env`, keys, and similar files are skipped, and diffs are redacted before they are stored. OpenAI receives a redacted log of one day only after you click Summarize. Put your API key in Settings. The default model is `gpt-5.6-luna`.

By default Timebot watches `~/dev`, `~/code`, `~/Projects`, or `~/src` when one of those exists. Otherwise it watches Documents and Desktop. Change the folders in Settings. It will not watch your whole home folder.
