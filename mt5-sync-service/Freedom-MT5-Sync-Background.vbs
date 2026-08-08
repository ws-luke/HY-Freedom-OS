Option Explicit

Dim shell, fso, serviceDir, pythonw, command, exitCode
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

serviceDir = fso.GetParentFolderName(WScript.ScriptFullName)
pythonw = fso.BuildPath(serviceDir, ".venv\Scripts\pythonw.exe")

If Not fso.FileExists(pythonw) Then
  WScript.Quit 2
End If

command = Chr(34) & pythonw & Chr(34) & _
  " -m uvicorn app:app --app-dir " & Chr(34) & serviceDir & Chr(34) & _
  " --host 127.0.0.1 --port 8765"

' This tiny hidden supervisor intentionally waits for the Agent. If Python exits
' unexpectedly it restarts after five seconds. Windows login launches this VBS
' through the user's Startup folder, so no Administrator privilege is required.
Do
  exitCode = shell.Run(command, 0, True)
  WScript.Sleep 5000
Loop

