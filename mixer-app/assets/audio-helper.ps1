# Audio-Helfer für die Electron-App (Windows Core Audio / WASAPI)
#
# Läuft als EIN dauerhafter Prozess und liest Befehle zeilenweise von stdin
# (je eine JSON-Zeile). Antworten gehen als JSON-Zeile nach stdout.
#
# Befehle:
#   {"id":1,"cmd":"set","target":"master","value":0.5}
#   {"id":2,"cmd":"get","target":"msedge.exe"}
#   {"id":3,"cmd":"list"}
#
# Ziele (target): "master", "mic", "system" (Systemklänge) oder ein Prozessname
# wie "spotify.exe" (Groß-/Kleinschreibung egal, ".exe" wird ergänzt).
# Werte (value) liegen zwischen 0.0 und 1.0.

$ErrorActionPreference = 'Stop'

$code = @"
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorCom {}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  int EnumAudioEndpoints(int dataFlow, int mask, out IntPtr devices);
  int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  int Activate(ref Guid iid, int clsCtx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
}

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int RegisterControlChangeNotify(IntPtr p);
  int UnregisterControlChangeNotify(IntPtr p);
  int GetChannelCount(out uint n);
  int SetMasterVolumeLevel(float f, ref Guid g);
  int SetMasterVolumeLevelScalar(float f, ref Guid g);
  int GetMasterVolumeLevel(out float f);
  int GetMasterVolumeLevelScalar(out float f);
}

[Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionManager2 {
  int GetAudioSessionControl(IntPtr a, uint b, out IntPtr c);
  int GetSimpleAudioVolume(IntPtr a, uint b, out IntPtr c);
  int GetSessionEnumerator(out IAudioSessionEnumerator e);
}

[Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionEnumerator {
  int GetCount(out int n);
  int GetSession(int i, out IAudioSessionControl2 s);
}

[Guid("BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioSessionControl2 {
  int GetState(out int s);
  int GetDisplayName(out IntPtr s);
  int SetDisplayName(IntPtr s, ref Guid g);
  int GetIconPath(out IntPtr s);
  int SetIconPath(IntPtr s, ref Guid g);
  int GetGroupingParam(out Guid g);
  int SetGroupingParam(ref Guid a, ref Guid b);
  int RegisterAudioSessionNotification(IntPtr p);
  int UnregisterAudioSessionNotification(IntPtr p);
  int GetSessionIdentifier(out IntPtr s);
  int GetSessionInstanceIdentifier(out IntPtr s);
  int GetProcessId(out uint pid);
  int IsSystemSoundsSession();
  int SetDuckingPreference(bool b);
}

[Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface ISimpleAudioVolume {
  int SetMasterVolume(float f, ref Guid g);
  int GetMasterVolume(out float f);
}

public static class AudioCtl {
  const int Render = 0;   // Wiedergabe
  const int Capture = 1;  // Aufnahme (Mikrofon)
  static Guid IidEndpoint = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
  static Guid IidSessionMgr = new Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F");

  static IMMDevice Device(int flow) {
    var en = (IMMDeviceEnumerator)(new MMDeviceEnumeratorCom());
    IMMDevice d;
    Marshal.ThrowExceptionForHR(en.GetDefaultAudioEndpoint(flow, 1, out d));
    return d;
  }

  static float Clamp(float f) { return f < 0f ? 0f : (f > 1f ? 1f : f); }

  static IAudioEndpointVolume Endpoint(int flow) {
    object o;
    Guid g = IidEndpoint;
    Marshal.ThrowExceptionForHR(Device(flow).Activate(ref g, 23, IntPtr.Zero, out o));
    return (IAudioEndpointVolume)o;
  }

  static string ExeName(uint pid) {
    try { return Process.GetProcessById((int)pid).ProcessName.ToLowerInvariant() + ".exe"; }
    catch { return null; }
  }

  static List<IAudioSessionControl2> Sessions() {
    object o;
    Guid g = IidSessionMgr;
    Marshal.ThrowExceptionForHR(Device(Render).Activate(ref g, 23, IntPtr.Zero, out o));
    IAudioSessionEnumerator se;
    Marshal.ThrowExceptionForHR(((IAudioSessionManager2)o).GetSessionEnumerator(out se));
    int n; se.GetCount(out n);
    var list = new List<IAudioSessionControl2>();
    for (int i = 0; i < n; i++) {
      IAudioSessionControl2 c;
      if (se.GetSession(i, out c) == 0) list.Add(c);
    }
    return list;
  }

  static string Normalize(string target) {
    string t = (target ?? "").Trim().ToLowerInvariant();
    if (t == "master" || t == "mic" || t == "system") return t;
    return t.EndsWith(".exe") ? t : t + ".exe";
  }

  static bool Matches(IAudioSessionControl2 c, string t) {
    if (t == "system") return c.IsSystemSoundsSession() == 0;
    uint pid; c.GetProcessId(out pid);
    if (pid == 0) return false;
    return ExeName(pid) == t;
  }

  // Setzt die Lautstärke, gibt die Anzahl getroffener Sessions zurück
  public static int Set(string target, float value) {
    string t = Normalize(target);
    float v = Clamp(value);
    Guid ctx = Guid.Empty;
    if (t == "master") { Marshal.ThrowExceptionForHR(Endpoint(Render).SetMasterVolumeLevelScalar(v, ref ctx)); return 1; }
    if (t == "mic") { Marshal.ThrowExceptionForHR(Endpoint(Capture).SetMasterVolumeLevelScalar(v, ref ctx)); return 1; }
    int hits = 0;
    foreach (var c in Sessions()) {
      if (!Matches(c, t)) continue;
      Guid g = Guid.Empty;
      ((ISimpleAudioVolume)c).SetMasterVolume(v, ref g);
      hits++;
    }
    return hits;
  }

  // Liest die Lautstärke (-1, wenn es keine passende Session gibt)
  public static double Get(string target) {
    string t = Normalize(target);
    float f;
    if (t == "master") { Endpoint(Render).GetMasterVolumeLevelScalar(out f); return f; }
    if (t == "mic") { Endpoint(Capture).GetMasterVolumeLevelScalar(out f); return f; }
    foreach (var c in Sessions()) {
      if (!Matches(c, t)) continue;
      ((ISimpleAudioVolume)c).GetMasterVolume(out f);
      return f;
    }
    return -1;
  }

  // Alle Programme mit Audio-Session (Prozessnamen, ohne Duplikate)
  public static string[] List() {
    var names = new SortedDictionary<string, bool>();
    foreach (var c in Sessions()) {
      uint pid; c.GetProcessId(out pid);
      if (pid == 0) continue;
      string n = ExeName(pid);
      if (n != null) names[n] = true;
    }
    var res = new string[names.Count];
    names.Keys.CopyTo(res, 0);
    return res;
  }
}
"@

Add-Type -TypeDefinition $code

[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

function Send($obj) {
  [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress -Depth 4))
  [Console]::Out.Flush()
}

Send @{ ready = $true }

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }          # stdin geschlossen: App wurde beendet
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  $id = $null
  try {
    $req = $line | ConvertFrom-Json
    $id = $req.id
    switch ($req.cmd) {
      'set'  { $hits = [AudioCtl]::Set([string]$req.target, [single]$req.value); Send @{ id = $id; ok = $true; matched = $hits } }
      'get'  { Send @{ id = $id; value = [AudioCtl]::Get([string]$req.target) } }
      'list' { Send @{ id = $id; sessions = @([AudioCtl]::List()) } }
      default { Send @{ id = $id; error = "Unbekannter Befehl: $($req.cmd)" } }
    }
  } catch {
    Send @{ id = $id; error = $_.Exception.Message }
  }
}
