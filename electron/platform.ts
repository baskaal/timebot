import { parseActive, parseTabs } from '../core/parse.ts';
import { powershell, runCommand } from './run.ts';

const CHROME_APPS = [
  'Google Chrome',
  'Google Chrome Canary',
  'Chromium',
  'Brave Browser',
  'Microsoft Edge',
  'Opera',
  'Vivaldi',
  'Arc',
  'Dia',
  'Zen Browser',
];

export type ActiveWindow = {
  app: string;
  title: string;
  url: string;
  tabTitle: string;
  error?: string;
};

function appleList(names: string[]): string {
  return names.map((name) => `"${name}"`).join(', ');
}

const ACTIVE_SCRIPT = `
set sep to ASCII character 31
set chromeApps to {${appleList(CHROME_APPS)}}
tell application "System Events"
  set frontApp to name of first application process whose frontmost is true
  set frontTitle to ""
  try
    tell process frontApp
      if (count of windows) > 0 then set frontTitle to name of front window
    end tell
  end try
end tell
set tabUrl to ""
set tabTitle to ""
try
  if chromeApps contains frontApp then
    using terms from application "Google Chrome"
      tell application frontApp
        if (count of windows) > 0 then
          set t to active tab of front window
          set tabUrl to URL of t
          set tabTitle to title of t
        end if
      end tell
    end using terms from
  else if frontApp is "Safari" then
    tell application "Safari"
      if (count of windows) > 0 then
        set tabUrl to URL of current tab of front window
        set tabTitle to name of current tab of front window
      end if
    end tell
  end if
end try
return frontApp & sep & frontTitle & sep & tabUrl & sep & tabTitle
`;

const TABS_SCRIPT = `
set sep to ASCII character 31
set rec to ASCII character 30
set out to ""
tell application "System Events"
  set runningNames to name of every application process
end tell
set chromeApps to {${appleList(CHROME_APPS)}}
repeat with appName in chromeApps
  set appName to contents of appName
  if runningNames contains appName then
    try
      using terms from application "Google Chrome"
        tell application appName
          repeat with w in windows
            try
              repeat with t in tabs of w
                set out to out & appName & sep & (URL of t) & sep & (title of t) & rec
              end repeat
            end try
          end repeat
        end tell
      end using terms from
    end try
  end if
end repeat
if runningNames contains "Safari" then
  try
    tell application "Safari"
      repeat with w in windows
        try
          repeat with t in tabs of w
            set out to out & "Safari" & sep & (URL of t) & sep & (name of t) & rec
          end repeat
        end try
      end repeat
    end tell
  end try
end if
return out
`;

const WINDOWS_ACTIVE = `
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class TbWin {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet=CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
}
"@
$hwnd = [TbWin]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 1024
[void][TbWin]::GetWindowText($hwnd, $sb, $sb.Capacity)
$procId = [uint32]0
[void][TbWin]::GetWindowThreadProcessId($hwnd, [ref]$procId)
$p = Get-Process -Id $procId -ErrorAction SilentlyContinue
$app = if ($p) { $p.ProcessName } else { 'Unknown' }
$sep = [char]31
Write-Output ($app + $sep + $sb.ToString() + $sep + '' + $sep + '')
`;

const WINDOWS_URL = `
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class TbWinUrl {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
}
"@
$hwnd = [TbWinUrl]::GetForegroundWindow()
$root = [System.Windows.Automation.AutomationElement]::FromHandle($hwnd)
$cond = New-Object System.Windows.Automation.PropertyCondition(
  [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
  [System.Windows.Automation.ControlType]::Edit
)
$els = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)
foreach ($el in $els) {
  $n = ''
  try { $n = $el.Current.Name } catch { continue }
  if ($n -match 'address|search bar|Location') {
    try {
      $pattern = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
      $value = $pattern.Current.Value
      if ($value) { Write-Output $value; exit 0 }
    } catch {}
  }
}
exit 2
`;

export async function readActiveWindow(): Promise<ActiveWindow> {
  if (process.platform === 'darwin') {
    const result = await runCommand('osascript', ['-'], { input: ACTIVE_SCRIPT, timeoutMs: 6000 });
    if (result.code !== 0) {
      return { app: '', title: '', url: '', tabTitle: '', error: result.stderr || 'Could not read the frontmost app.' };
    }
    return parseActive(result.stdout);
  }
  if (process.platform === 'win32') {
    const result = await powershell(WINDOWS_ACTIVE, 4000);
    if (result.code !== 0) {
      return { app: '', title: '', url: '', tabTitle: '', error: result.stderr || 'Could not read the frontmost window.' };
    }
    return parseActive(result.stdout);
  }
  return {
    app: '',
    title: '',
    url: '',
    tabTitle: '',
    error: 'Timebot tracks activity on macOS and Windows.',
  };
}

export async function readOpenTabs(): Promise<Array<{ browser: string; url: string; title: string }>> {
  if (process.platform !== 'darwin') return [];
  const result = await runCommand('osascript', ['-'], { input: TABS_SCRIPT, timeoutMs: 20_000 });
  if (result.code !== 0) return [];
  return parseTabs(result.stdout);
}

const AWAY_IDLE_MS = 5 * 60_000;

export { AWAY_IDLE_MS };

const WINDOWS_IDLE = `
if (-not ([System.Management.Automation.PSTypeName]'TimebotIdle').Type) {
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class TimebotIdle {
  [StructLayout(LayoutKind.Sequential)]
  struct LASTINPUTINFO {
    public uint cbSize;
    public uint dwTime;
  }
  [DllImport("user32.dll")]
  static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
  public static long Milliseconds() {
    LASTINPUTINFO info = new LASTINPUTINFO();
    info.cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO));
    if (!GetLastInputInfo(ref info)) return -1;
    return unchecked((uint)Environment.TickCount - info.dwTime);
  }
}
"@
}
[TimebotIdle]::Milliseconds()
`;

export function parseHidIdleMs(output: string): number | null {
  const match = output.match(/"HIDIdleTime"\s*=\s*(\d+)/);
  if (!match?.[1]) return null;
  const nanoseconds = Number(match[1]);
  if (!Number.isFinite(nanoseconds)) return null;
  return Math.round(nanoseconds / 1_000_000);
}

export async function readIdleMs(): Promise<number | null> {
  if (process.platform === 'darwin') {
    const result = await runCommand('ioreg', ['-c', 'IOHIDSystem', '-r', '-k', 'HIDIdleTime'], { timeoutMs: 3000 });
    if (result.code !== 0) return null;
    return parseHidIdleMs(result.stdout);
  }
  if (process.platform === 'win32') {
    const result = await powershell(WINDOWS_IDLE, 4000);
    if (result.code !== 0) return null;
    const ms = Number(result.stdout.trim().split(/\r?\n/).pop());
    return Number.isFinite(ms) && ms >= 0 ? ms : null;
  }
  return null;
}

export async function readWindowsBrowserUrl(): Promise<string | null> {
  if (process.platform !== 'win32') return null;
  const result = await powershell(WINDOWS_URL, 2000);
  if (result.code !== 0) return null;
  const url = result.stdout.trim().split(/\r?\n/).pop()?.trim();
  return url || null;
}
