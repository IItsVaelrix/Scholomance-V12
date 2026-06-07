[Setup]
AppName=ScholoCandy
AppVersion=1.0.0
AppPublisher=Scholomance
DefaultDirName={pf}\Common Files\VST3\scholo_candy.vst3
DefaultGroupName=ScholoCandy
OutputDir=target\installer
OutputBaseFilename=ScholoCandy_Installer
Compression=lzma
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
DisableProgramGroupPage=yes

[Dirs]
Name: "{pf}\Common Files\VST3"
Name: "{pf}\Common Files\CLAP"

[Files]
; Copy the VST3 bundle
Source: "target\bundled\scholo_candy.vst3\*"; DestDir: "{pf}\Common Files\VST3\scholo_candy.vst3"; Flags: ignoreversion recursesubdirs createallsubdirs
; Copy the CLAP bundle
Source: "target\bundled\scholo_candy.clap\*"; DestDir: "{pf}\Common Files\CLAP\scholo_candy.clap"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
; Optional: Add commands to run after installation

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    Log('ScholoCandy installation complete.');
  end;
end;
