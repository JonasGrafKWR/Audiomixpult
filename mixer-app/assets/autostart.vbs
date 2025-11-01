Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\audiomixpult-control\Audiomixpult Control.exe"
WshShell.Run chr(34) & strPath & chr(34), 0
Set WshShell = Nothing
