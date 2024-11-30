#!/usr/bin/env python3
#
# Copyright (C) 2011  Patrick "p2k" Schneider <me@p2k-network.org>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#

import os
import os.path
import re
import shutil
import stat
import sys
from argparse import ArgumentParser
from pathlib import Path
from subprocess import PIPE, run
from typing import List, Optional

# This is ported from the original macdeployqt with modifications


class FrameworkInfo(object):
    def __init__(self):
        self.frameworkDirectory = ""
        self.frameworkName = ""
        self.frameworkPath = ""
        self.binaryDirectory = ""
        self.binaryName = ""
        self.binaryPath = ""
        self.version = ""
        self.installName = ""
        self.deployedInstallName = ""
        self.sourceFilePath = ""
        self.destinationDirectory = ""
        self.sourceResourcesDirectory = ""
        self.sourceVersionContentsDirectory = ""
        self.sourceContentsDirectory = ""
        self.destinationResourcesDirectory = ""
        self.destinationVersionContentsDirectory = ""

    def __eq__(self, other):
        if self.__class__ == other.__class__:
            return self.__dict__ == other.__dict__
        else:
            return False

    def __str__(self):
        return f""" Framework name: {self.frameworkName}
 Framework directory: {self.frameworkDirectory}
 Framework path: {self.frameworkPath}
 Binary name: {self.binaryName}
 Binary directory: {self.binaryDirectory}
 Binary path: {self.binaryPath}
 Version: {self.version}
 Install name: {self.installName}
 Deployed install name: {self.deployedInstallName}
 Source file Path: {self.sourceFilePath}
 Deployed Directory (relative to bundle): {self.destinationDirectory}
"""

    def isDylib(self):
        return self.frameworkName.endswith(".dylib")

    def isQtFramework(self):
        if self.isDylib():
            return self.frameworkName.startswith("libQt")
        else:
            return self.frameworkName.startswith("Qt")

    reOLine = re.compile(
        r"^(.+) \(compatibility version [0-9.]+, current version [0-9.]+\)$"
    )
    bundleFrameworkDirectory = "Contents/Frameworks"
    bundleBinaryDirectory = "Contents/MacOS"

    @classmethod
    def fromLibraryLine(cls, line: str) -> Optional["FrameworkInfo"]:
        # Note: line must be trimmed
        if line == "":
            return None

        # Don't deploy system libraries (exception for libQtuitools and
        # libQtlucene).
        if (
            line.startswith("/System/Library/")
            or line.startswith("@executable_path")
            or (line.startswith("/usr/lib/") and "libQt" not in line)
        ):
            return None

        m = cls.reOLine.match(line)
        if m is None:
            raise RuntimeError(f"Line could not be parsed: {line}")

        path = m.group(1)

        info = cls()
        info.sourceFilePath = path
        info.installName = path

        if path.endswith(".dylib"):
            dirname, filename = os.path.split(path)
            info.frameworkName = filename
            info.frameworkDirectory = dirname
            info.frameworkPath = path

            info.binaryDirectory = dirname
            info.binaryName = filename
            info.binaryPath = path
            info.version = "-"

            info.installName = path
            info.deployedInstallName = (
                f"@executable_path/../Frameworks/{info.binaryName}"
            )
            info.sourceFilePath = path
            info.destinationDirectory = cls.bundleFrameworkDirectory
        else:
            parts = path.split("/")
            i = 0
            # Search for the .framework directory
            for part in parts:
                if part.endswith(".framework"):
                    break
                i += 1
            if i == len(parts):
                raise RuntimeError(
                    f"Could not find .framework or .dylib in line: {line}"
                )

            info.frameworkName = parts[i]
            info.frameworkDirectory = "/".join(parts[:i])
            info.frameworkPath = os.path.join(
                info.frameworkDirectory, info.frameworkName
            )

            info.binaryName = parts[i + 3]
            info.binaryDirectory = "/".join(parts[i + 1 : i + 3])
            info.binaryPath = os.path.join(info.binaryDirectory, info.binaryName)
            info.version = parts[i + 2]

            info.deployedInstallName = f"@executable_path/../Frameworks/{os.path.join(info.frameworkName, info.binaryPath)}"
            info.destinationDirectory = os.path.join(
                cls.bundleFrameworkDirectory, info.frameworkName, info.binaryDirectory
            )

            info.sourceResourcesDirectory = os.path.join(
                info.frameworkPath, "Resources"
            )
            info.sourceContentsDirectory = os.path.join(info.frameworkPath, "Contents")
            info.sourceVersionContentsDirectory = os.path.join(
                info.frameworkPath, "Versions", info.version, "Contents"
            )
            info.destinationResourcesDirectory = os.path.join(
                cls.bundleFrameworkDirectory, info.frameworkName, "Resources"
            )
            info.destinationVersionContentsDirectory = os.path.join(
                cls.bundleFrameworkDirectory,
                info.frameworkName,
                "Versions",
                info.version,
                "Contents",
            )

        return info


class ApplicationBundleInfo(object):
    def __init__(self, path: str):
        self.path = path
        # for backwards compatibility reasons, this must remain as BitcoinABC-Qt
        self.binaryPath = os.path.join(path, "Contents", "MacOS", "BitcoinABC-Qt")
        if not os.path.exists(self.binaryPath):
            raise RuntimeError(f"Could not find bundle binary for {path}")
        self.resourcesPath = os.path.join(path, "Contents", "Resources")
        self.pluginPath = os.path.join(path, "Contents", "PlugIns")


class DeploymentInfo(object):
    def __init__(self):
        self.qtPath = None
        self.pluginPath = None
        self.deployedFrameworks = []

    def detectQtPath(self, frameworkDirectory: str):
        parentDir = os.path.dirname(frameworkDirectory)
        if os.path.exists(os.path.join(parentDir, "translations")):
            # Classic layout, e.g. "/usr/local/Trolltech/Qt-4.x.x"
            self.qtPath = parentDir
        else:
            self.qtPath = os.getenv("QTDIR", None)

        if self.qtPath is not None:
            pluginPath = os.path.join(self.qtPath, "plugins")
            if os.path.exists(pluginPath):
                self.pluginPath = pluginPath

    def usesFramework(self, name: str) -> bool:
        for framework in self.deployedFrameworks:
            if framework.endswith(".framework"):
                if framework.startswith(f"{name}."):
                    return True
            elif framework.endswith(".dylib"):
                if framework.startswith(f"lib{name}."):
                    return True
        return False


def getFrameworks(binaryPath: str, verbose: int) -> List[FrameworkInfo]:
    objdump = os.getenv("OBJDUMP", "objdump")
    if verbose:
        print(f"Inspecting with {objdump}: {binaryPath}")
    output = run(
        [objdump, "--macho", "--dylibs-used", binaryPath],
        stdout=PIPE,
        stderr=PIPE,
        text=True,
    )
    if output.returncode != 0:
        sys.stderr.write(output.stderr)
        sys.stderr.flush()
        raise RuntimeError(f"{objdump} failed with return code {output.returncode}")

    lines = output.stdout.split("\n")
    lines.pop(0)  # First line is the inspected binary
    if ".framework" in binaryPath or binaryPath.endswith(".dylib"):
        # Frameworks and dylibs list themselves as a dependency.
        lines.pop(0)

    libraries = []
    for line in lines:
        line = line.replace("@loader_path", os.path.dirname(binaryPath))
        info = FrameworkInfo.fromLibraryLine(line.strip())
        if info is not None:
            if verbose:
                print("Found framework:")
                print(info)
            libraries.append(info)

    return libraries


def runInstallNameTool(action: str, *args):
    installnametoolbin = os.getenv("INSTALLNAMETOOL", "install_name_tool")
    run([installnametoolbin, "-" + action] + list(args), check=True)


def changeInstallName(oldName: str, newName: str, binaryPath: str, verbose: int):
    if verbose:
        print("Using install_name_tool:")
        print(" in", binaryPath)
        print(" change reference", oldName)
        print(" to", newName)
    runInstallNameTool("change", oldName, newName, binaryPath)


def changeIdentification(id_name: str, binaryPath: str, verbose: int):
    if verbose:
        print("Using install_name_tool:")
        print(" change identification in", binaryPath)
        print(" to", id_name)
    runInstallNameTool("id", id_name, binaryPath)


def runStrip(binaryPath: str, verbose: int):
    stripbin = os.getenv("STRIP", "strip")
    if verbose:
        print("Using strip:")
        print(" stripped", binaryPath)
    run([stripbin, "-x", binaryPath], check=True)


def copyFramework(framework: FrameworkInfo, path: str, verbose: int) -> Optional[str]:
    if framework.sourceFilePath.startswith("Qt"):
        # standard place for Nokia Qt installer's frameworks
        fromPath = f"/Library/Frameworks/{framework.sourceFilePath}"
    else:
        fromPath = framework.sourceFilePath
    toDir = os.path.join(path, framework.destinationDirectory)
    toPath = os.path.join(toDir, framework.binaryName)

    if not os.path.exists(fromPath):
        raise RuntimeError(f"No file at {fromPath}")

    if os.path.exists(toPath):
        return None  # Already there

    if not os.path.exists(toDir):
        os.makedirs(toDir)

    shutil.copy2(fromPath, toPath)
    if verbose:
        print("Copied:", fromPath)
        print(" to:", toPath)

    permissions = os.stat(toPath)
    if not permissions.st_mode & stat.S_IWRITE:
        os.chmod(toPath, permissions.st_mode | stat.S_IWRITE)

    if not framework.isDylib():  # Copy resources for real frameworks
        linkfrom = os.path.join(
            path,
            "Contents",
            "Frameworks",
            framework.frameworkName,
            "Versions",
            "Current",
        )
        linkto = framework.version
        if not os.path.exists(linkfrom):
            os.symlink(linkto, linkfrom)
            print("Linked:", linkfrom, "->", linkto)
        fromResourcesDir = framework.sourceResourcesDirectory
        if os.path.exists(fromResourcesDir):
            toResourcesDir = os.path.join(path, framework.destinationResourcesDirectory)
            shutil.copytree(fromResourcesDir, toResourcesDir, symlinks=True)
            if verbose:
                print("Copied resources:", fromResourcesDir)
                print(" to:", toResourcesDir)
        fromContentsDir = framework.sourceVersionContentsDirectory
        if not os.path.exists(fromContentsDir):
            fromContentsDir = framework.sourceContentsDirectory
        if os.path.exists(fromContentsDir):
            toContentsDir = os.path.join(
                path, framework.destinationVersionContentsDirectory
            )
            shutil.copytree(fromContentsDir, toContentsDir, symlinks=True)
            if verbose:
                print("Copied Contents:", fromContentsDir)
                print(" to:", toContentsDir)
    # Copy qt_menu.nib (applies to non-framework layout)
    elif framework.frameworkName.startswith("libQtGui"):
        qtMenuNibSourcePath = os.path.join(
            framework.frameworkDirectory, "Resources", "qt_menu.nib"
        )
        qtMenuNibDestinationPath = os.path.join(
            path, "Contents", "Resources", "qt_menu.nib"
        )
        if os.path.exists(qtMenuNibSourcePath) and not os.path.exists(
            qtMenuNibDestinationPath
        ):
            shutil.copytree(
                qtMenuNibSourcePath, qtMenuNibDestinationPath, symlinks=True
            )
            if verbose:
                print("Copied for libQtGui:", qtMenuNibSourcePath)
                print(" to:", qtMenuNibDestinationPath)

    return toPath


def deployFrameworks(
    frameworks: List[FrameworkInfo],
    bundlePath: str,
    binaryPath: str,
    strip: bool,
    verbose: int,
    deploymentInfo: Optional[DeploymentInfo] = None,
) -> DeploymentInfo:
    if deploymentInfo is None:
        deploymentInfo = DeploymentInfo()

    while len(frameworks) > 0:
        framework = frameworks.pop(0)
        deploymentInfo.deployedFrameworks.append(framework.frameworkName)

        print("Processing", framework.frameworkName, "...")

        # Get the Qt path from one of the Qt frameworks
        if deploymentInfo.qtPath is None and framework.isQtFramework():
            deploymentInfo.detectQtPath(framework.frameworkDirectory)

        if framework.installName.startswith(
            "@executable_path"
        ) or framework.installName.startswith(bundlePath):
            print(framework.frameworkName, "already deployed, skipping.")
            continue

        # install_name_tool the new id into the binary
        changeInstallName(
            framework.installName, framework.deployedInstallName, binaryPath, verbose
        )

        # Copy framework to app bundle.
        deployedBinaryPath = copyFramework(framework, bundlePath, verbose)
        # Skip the rest if already was deployed.
        if deployedBinaryPath is None:
            continue

        if strip:
            runStrip(deployedBinaryPath, verbose)

        # install_name_tool it a new id.
        changeIdentification(framework.deployedInstallName, deployedBinaryPath, verbose)
        # Check for framework dependencies
        dependencies = getFrameworks(deployedBinaryPath, verbose)

        for dependency in dependencies:
            changeInstallName(
                dependency.installName,
                dependency.deployedInstallName,
                deployedBinaryPath,
                verbose,
            )

            # Deploy framework if necessary.
            if (
                dependency.frameworkName not in deploymentInfo.deployedFrameworks
                and dependency not in frameworks
            ):
                frameworks.append(dependency)

    return deploymentInfo


def deployFrameworksForAppBundle(
    applicationBundle: ApplicationBundleInfo, strip: bool, verbose: int
) -> DeploymentInfo:
    frameworks = getFrameworks(applicationBundle.binaryPath, verbose)
    if len(frameworks) == 0:
        print(
            "Warning: Could not find any external frameworks to deploy in"
            f" {applicationBundle.path}."
        )
        return DeploymentInfo()
    else:
        return deployFrameworks(
            frameworks,
            applicationBundle.path,
            applicationBundle.binaryPath,
            strip,
            verbose,
        )


def deployPlugins(
    appBundleInfo: ApplicationBundleInfo,
    deploymentInfo: DeploymentInfo,
    strip: bool,
    verbose: int,
):
    # Lookup available plugins, exclude unneeded
    plugins = []
    if deploymentInfo.pluginPath is None:
        return
    for dirpath, dirnames, filenames in os.walk(deploymentInfo.pluginPath):
        pluginDirectory = os.path.relpath(dirpath, deploymentInfo.pluginPath)
        if pluginDirectory == "designer":
            # Skip designer plugins
            continue
        elif pluginDirectory == "printsupport":
            # Skip printsupport plugins
            continue
        elif pluginDirectory == "imageformats":
            # Skip imageformats plugins
            continue
        elif pluginDirectory == "sqldrivers":
            # Deploy the sql plugins only if QtSql is in use
            if not deploymentInfo.usesFramework("QtSql"):
                continue
        elif pluginDirectory == "script":
            # Deploy the script plugins only if QtScript is in use
            if not deploymentInfo.usesFramework("QtScript"):
                continue
        elif pluginDirectory == "qmltooling" or pluginDirectory == "qml1tooling":
            # Deploy the qml plugins only if QtDeclarative is in use
            if not deploymentInfo.usesFramework("QtDeclarative"):
                continue
        elif pluginDirectory == "bearer":
            # Deploy the bearer plugins only if QtNetwork is in use
            if not deploymentInfo.usesFramework("QtNetwork"):
                continue
        elif pluginDirectory == "position":
            # Deploy the position plugins only if QtPositioning is in use
            if not deploymentInfo.usesFramework("QtPositioning"):
                continue
        elif pluginDirectory == "sensors" or pluginDirectory == "sensorgestures":
            # Deploy the sensor plugins only if QtSensors is in use
            if not deploymentInfo.usesFramework("QtSensors"):
                continue
        elif pluginDirectory == "audio" or pluginDirectory == "playlistformats":
            # Deploy the audio plugins only if QtMultimedia is in use
            if not deploymentInfo.usesFramework("QtMultimedia"):
                continue
        elif pluginDirectory == "mediaservice":
            # Deploy the mediaservice plugins only if QtMultimediaWidgets is in
            # use
            if not deploymentInfo.usesFramework("QtMultimediaWidgets"):
                continue
        elif pluginDirectory == "canbus":
            # Deploy the canbus plugins only if QtSerialBus is in use
            if not deploymentInfo.usesFramework("QtSerialBus"):
                continue
        elif pluginDirectory == "webview":
            # Deploy the webview plugins only if QtWebView is in use
            if not deploymentInfo.usesFramework("QtWebView"):
                continue
        elif pluginDirectory == "gamepads":
            # Deploy the webview plugins only if QtGamepad is in use
            if not deploymentInfo.usesFramework("QtGamepad"):
                continue
        elif pluginDirectory == "geoservices":
            # Deploy the webview plugins only if QtLocation is in use
            if not deploymentInfo.usesFramework("QtLocation"):
                continue
        elif pluginDirectory == "texttospeech":
            # Deploy the texttospeech plugins only if QtTextToSpeech is in use
            if not deploymentInfo.usesFramework("QtTextToSpeech"):
                continue
        elif pluginDirectory == "virtualkeyboard":
            # Deploy the virtualkeyboard plugins only if QtVirtualKeyboard is
            # in use
            if not deploymentInfo.usesFramework("QtVirtualKeyboard"):
                continue
        elif pluginDirectory == "sceneparsers":
            # Deploy the virtualkeyboard plugins only if Qt3DCore is in use
            if not deploymentInfo.usesFramework("Qt3DCore"):
                continue
        elif pluginDirectory == "renderplugins":
            # Deploy the renderplugins plugins only if Qt3DCore is in use
            if not deploymentInfo.usesFramework("Qt3DCore"):
                continue
        elif pluginDirectory == "geometryloaders":
            # Deploy the geometryloaders plugins only if Qt3DCore is in use
            if not deploymentInfo.usesFramework("Qt3DCore"):
                continue

        for pluginName in filenames:
            pluginPath = os.path.join(pluginDirectory, pluginName)
            if pluginName.endswith("_debug.dylib"):
                # Skip debug plugins
                continue
            elif (
                pluginPath == "imageformats/libqsvg.dylib"
                or pluginPath == "iconengines/libqsvgicon.dylib"
            ):
                # Deploy the svg plugins only if QtSvg is in use
                if not deploymentInfo.usesFramework("QtSvg"):
                    continue
            elif pluginPath == "accessible/libqtaccessiblecompatwidgets.dylib":
                # Deploy accessibility for Qt3Support only if the Qt3Support is
                # in use
                if not deploymentInfo.usesFramework("Qt3Support"):
                    continue
            elif pluginPath == "graphicssystems/libqglgraphicssystem.dylib":
                # Deploy the opengl graphicssystem plugin only if QtOpenGL is
                # in use
                if not deploymentInfo.usesFramework("QtOpenGL"):
                    continue
            elif pluginPath == "accessible/libqtaccessiblequick.dylib":
                # Deploy the accessible qtquick plugin only if QtQuick is in
                # use
                if not deploymentInfo.usesFramework("QtQuick"):
                    continue
            elif pluginPath == "platforminputcontexts/libqtvirtualkeyboardplugin.dylib":
                # Deploy the virtualkeyboardplugin plugin only if
                # QtVirtualKeyboard is in use
                if not deploymentInfo.usesFramework("QtVirtualKeyboard"):
                    continue

            plugins.append((pluginDirectory, pluginName))

    for pluginDirectory, pluginName in plugins:
        print("Processing plugin", os.path.join(pluginDirectory, pluginName), "...")

        sourcePath = os.path.join(
            deploymentInfo.pluginPath, pluginDirectory, pluginName
        )
        destinationDirectory = os.path.join(appBundleInfo.pluginPath, pluginDirectory)
        if not os.path.exists(destinationDirectory):
            os.makedirs(destinationDirectory)

        destinationPath = os.path.join(destinationDirectory, pluginName)
        shutil.copy2(sourcePath, destinationPath)
        if verbose:
            print("Copied:", sourcePath)
            print(" to:", destinationPath)

        if strip:
            runStrip(destinationPath, verbose)

        dependencies = getFrameworks(destinationPath, verbose)

        for dependency in dependencies:
            changeInstallName(
                dependency.installName,
                dependency.deployedInstallName,
                destinationPath,
                verbose,
            )

            # Deploy framework if necessary.
            if dependency.frameworkName not in deploymentInfo.deployedFrameworks:
                deployFrameworks(
                    [dependency],
                    appBundleInfo.path,
                    destinationPath,
                    strip,
                    verbose,
                    deploymentInfo,
                )


ap = ArgumentParser(
    description="""Improved version of macdeployqt.

Outputs a ready-to-deploy app in a folder "dist" and optionally wraps it in a .zip file.
Note, that the "dist" folder will be deleted before deploying on each run.

Optionally, Qt translation files (.qm) can be added to the bundle."""
)

ap.add_argument(
    "app_bundle",
    nargs=1,
    metavar="app-bundle",
    help="application bundle to be deployed",
)
ap.add_argument(
    "appname", nargs=1, metavar="appname", help="name of the app being deployed"
)
ap.add_argument(
    "-verbose",
    nargs="?",
    const=True,
    help="Output additional debugging information",
)
ap.add_argument(
    "-no-plugins",
    dest="plugins",
    action="store_false",
    default=True,
    help="skip plugin deployment",
)
ap.add_argument(
    "-no-strip",
    dest="strip",
    action="store_false",
    default=True,
    help="don't run 'strip' on the binaries",
)
ap.add_argument(
    "-sign",
    dest="sign",
    action="store_true",
    default=False,
    help="sign .app bundle with codesign tool",
)
ap.add_argument(
    "-translations-dir",
    nargs=1,
    metavar="path",
    default=None,
    help=(
        "Path to Qt's translations. Base translations will automatically be added to"
        " the bundle's resources."
    ),
)
ap.add_argument(
    "-zip",
    nargs="?",
    const="",
    metavar="zip",
    help="create a .zip containing the app bundle",
)

config = ap.parse_args()

verbose = config.verbose

# ------------------------------------------------

app_bundle = config.app_bundle[0]
appname = config.appname[0]

if not os.path.exists(app_bundle):
    sys.stderr.write(f'Error: Could not find app bundle "{app_bundle}"\n')
    sys.exit(1)

# ------------------------------------------------

if os.path.exists("dist"):
    print("+ Removing existing dist folder +")
    shutil.rmtree("dist")

if os.path.exists(appname + ".zip"):
    print("+ Removing existing .zip +")
    os.unlink(appname + ".zip")

# ------------------------------------------------

target = os.path.join("dist", "BitcoinABC-Qt.app")

print("+ Copying source bundle +")
if verbose:
    print(app_bundle, "->", target)

os.mkdir("dist")
shutil.copytree(app_bundle, target, symlinks=True)

applicationBundle = ApplicationBundleInfo(target)

# ------------------------------------------------

print("+ Deploying frameworks +")

try:
    deploymentInfo = deployFrameworksForAppBundle(
        applicationBundle, config.strip, verbose
    )
    if deploymentInfo.qtPath is None:
        deploymentInfo.qtPath = os.getenv("QTDIR", None)
        if deploymentInfo.qtPath is None:
            sys.stderr.write(
                "Warning: Could not detect Qt's path, skipping plugin deployment!\n"
            )
            config.plugins = False
except RuntimeError as e:
    sys.stderr.write(f"Error: {str(e)}\n")
    sys.exit(1)

# ------------------------------------------------

if config.plugins:
    print("+ Deploying plugins +")

    try:
        deployPlugins(applicationBundle, deploymentInfo, config.strip, verbose)
    except RuntimeError as e:
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.exit(1)

# ------------------------------------------------

if config.translations_dir:
    if not Path(config.translations_dir[0]).exists():
        sys.stderr.write(
            f'Error: Could not find translation dir "{config.translations_dir[0]}"\n'
        )
        sys.exit(1)

print("+ Adding Qt translations +")

translations = Path(config.translations_dir[0])

regex = re.compile("qt_[a-z]*(.qm|_[A-Z]*.qm)")

lang_files = [x for x in translations.iterdir() if regex.match(x.name)]

for file in lang_files:
    if verbose:
        print(
            file.as_posix(),
            "->",
            os.path.join(applicationBundle.resourcesPath, file.name),
        )
    shutil.copy2(
        file.as_posix(), os.path.join(applicationBundle.resourcesPath, file.name)
    )

# ------------------------------------------------

print("+ Installing qt.conf +")

qt_conf = """[Paths]
Translations=Resources
Plugins=PlugIns
"""

with open(os.path.join(applicationBundle.resourcesPath, "qt.conf"), "wb") as f:
    f.write(qt_conf.encode())

# ------------------------------------------------

if config.zip is not None:
    shutil.make_archive(
        f"{appname}", format="zip", root_dir="dist", base_dir="Bitcoin-Qt.app"
    )

# ------------------------------------------------

print("+ Done +")

sys.exit(0)
