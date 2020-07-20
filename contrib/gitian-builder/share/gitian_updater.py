#!/usr/bin/python

#   Gitian Downloader - download/update and verify a gitian distribution package

#   This library is free software; you can redistribute it and/or
#   modify it under the terms of the GNU Library General Public
#   License as published by the Free Software Foundation; either
#   version 2 of the License, or (at your option) any later version.
#
#   This library is distributed in the hope that it will be useful,
#   but WITHOUT ANY WARRANTY; without even the implied warranty of
#   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
#   Library General Public License for more details.
#
#   You should have received a copy of the GNU Library General Public
#   License along with this library; if not, write to the Free Software
#   Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

import sys, os, subprocess
from os import path
import shutil
import re
import tempfile
import atexit
import urllib2
import argparse
import yaml
import time
from hashlib import sha256
from zipfile import ZipFile
from distutils.version import LooseVersion

"""downloader config sample:

    --- 
    name: foo
    waiting_period: 24
    urls:
    - url: https://foo.org/gitian/foo.zip
      version_url: https://foo.org/gitian/foo.ver
    rss:
    - url: https://foo.org/gitian/foo.rss
      xpath: //item/link/text()
      pattern: foo-(\d+.\d+.\d+)-linux.zip
    signers:
      0A82509767C7D4A5D14DA2301AE1D35043E08E54:
        weight: 40
        name: BlueMatt
        key: bluematt

"""

inject_config_string = "INJECT" + "CONFIG"
injected_config = """INJECTCONFIG"""
have_injected_config = injected_config != inject_config_string

quiet = 0

def check_name_and_version(out_manifest, old_manifest):
    if out_manifest['name'] != old_manifest['name']:
        print>>sys.stderr, "The old directory has a manifest for a different package"
        sys.exit(3)
    if LooseVersion(out_manifest['release']) < LooseVersion(old_manifest['release']):
        if quiet <= 1:
            print>>sys.stderr, "This is a downgrade from version %s to %s"%(old_manifest['release'],out_manifest['release'])
        if not args.force:
            print>>sys.stderr, "Use --force if you really want to downgrade"
            sys.exit(4)
    elif LooseVersion(out_manifest['release']) == LooseVersion(old_manifest['release']):
        if quiet <= 1:
            print>>sys.stderr, "This is a reinstall of version %s"%(old_manifest['release'])
    else:
        if quiet == 0:
            print>>sys.stderr, "Upgrading from version %s to %s"%(old_manifest['release'],out_manifest['release'])

def copy_to_destination(from_path, to_path, out_manifest, old_manifest):
    for root, dirs, files in os.walk(from_path, topdown = True):
        rel = path.relpath(root, from_path)
        if not path.exists(path.join(to_path, rel)):
            os.mkdir(path.normpath(path.join(to_path, rel)))
        for f in files:
            shutil.copy2(path.join(root, f), path.join(to_path, rel, f))

    if old_manifest:
        removed = set(old_manifest['sums'].keys()).difference(out_manifest['sums'].keys())
        for f in removed:
            if path.exists(path.join(to_path, f)):
                os.unlink(path.join(to_path, f))

    f = file(path.join(to_path, '.gitian-manifest'), 'w')
    yaml.dump(out_manifest, f)
    f.close()

def sha256sum(path):
    h = sha256()
    f = open(path)
    while True:
        buf = f.read(10240)
        if buf == "":
            break
        h.update(buf)
    return h.hexdigest()

def sanitize_path(dir_name, name, where):
    if re.search(r'[^/\w.-]', name):
        raise ValueError, "unsanitary path in %s"%(where)
    full_name = path.normpath(path.join(dir_name, name))
    if full_name.find(dir_name + os.sep) != 0:
        raise ValueError, "unsafe path in %s"%(where)

def remove_temp(tdir):
    shutil.rmtree(tdir)

def download(url, dest):
    if quiet == 0:
        print "Downloading from %s"%(url)
    file_name = url.split('/')[-1]
    u = urllib2.urlopen(url)
    f = open(dest, 'wb')
    meta = u.info()
    file_size = int(meta.getheaders("Content-Length")[0])
    if quiet == 0:
        print "Downloading: %s Bytes: %s"%(file_name, file_size)

    file_size_dl = 0
    block_sz = 65536
    while True:
        buffer = u.read(block_sz)
        if not buffer:
            break

        file_size_dl += len(buffer)
        f.write(buffer)
        status = r"%10d  [%3.2f%%]" % (file_size_dl, file_size_dl * 100. / file_size)
        status = status + chr(8)*(len(status)+1)
        if quiet == 0:
            print status,

    if quiet == 0:
        print
    f.close()

def extract(dir_name, zip_path):
    zipfile = ZipFile(zip_path, 'r')
    files = []
    for name in zipfile.namelist():
        sanitize_path(dir_name, name, "zip file")
    zipfile.extractall(dir_name)
    zipfile.close()

    for name in zipfile.namelist():
        if path.isfile(path.join(dir_name, name)):
            files.append(path.normpath(name))
    return files

def get_assertions(gpg_path, temp_dir, unpack_dir, file_names):
    assertions = {"build" : {}}
    sums = {}
    name = None
    release = None
    to_check = {}
    for file_name in file_names:
        sums[file_name] = sha256sum(os.path.join(unpack_dir, file_name))
        to_check[file_name] = 1

    out_manifest = False
    error = False
    optionals = None

    for file_name in file_names:
        if file_name.startswith("gitian"):
            del to_check[file_name]
            if file_name.endswith(".assert"):
                popen = subprocess.Popen([gpg_path, '--status-fd', '1', '--homedir', path.join(temp_dir, 'gpg'), '--verify', os.path.join(unpack_dir, file_name + '.sig'), os.path.join(unpack_dir, file_name)], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                gpgout = popen.communicate()[0]
                retcode = popen.wait()
                if retcode != 0:
                    if quiet <= 1:
                        print>>sys.stderr, 'PGP verify failed for %s' %(file_name)
                    error = True
                    continue
                match = re.search(r'^\[GNUPG:\] VALIDSIG ([A-F0-9]+)', gpgout, re.M)
                assertions['build'][match.group(1)] = 1
                f = file(os.path.join(unpack_dir, file_name), 'r')
                assertion = yaml.load(f, OrderedDictYAMLLoader)
                f.close()
                if assertion['out_manifest']:
                    if out_manifest:
                        if out_manifest != assertion['out_manifest'] or release != assertion['release'] or name != assertion['name'] or optionals != assertion.get('optionals', []):
                            print>>sys.stderr, 'not all out manifests/releases/names/optionals are identical'
                            error = True
                            continue
                    else:
                        out_manifest = assertion['out_manifest']
                        release = assertion['release']
                        name = assertion['name']
                        optionals = assertion.get('optionals', [])

    if out_manifest:
        for line in out_manifest.split("\n"):
            if line != "":
                shasum = line[0:64]
                summed_file = line[66:]
                if not sums.has_key(summed_file):
                    if not summed_file in optionals:
                        print>>sys.stderr, "missing file %s" %(summed_file)
                        error = True
                elif sums[summed_file] != shasum:
                    print>>sys.stderr, "sha256sum mismatch on %s" %(summed_file)
                    error = True
                else:
                    del to_check[summed_file]
        if len(to_check) > 0 and quiet == 0:
            print>>sys.stderr, "Some of the files were not checksummed:"
            for key in to_check:
                print>>sys.stderr, "  ", key
    else:
        print>>sys.stderr, 'No build assertions found'

    manifest = { 'sums' : sums, 'release' : release, 'name': name, 'optionals': optionals }
    return (not error, assertions, manifest)

def import_keys(gpg_path, temp_dir, config):
    gpg_dir = path.join(temp_dir, 'gpg')
    os.mkdir(gpg_dir, 0700)
    signers = config['signers']
    for keyid in signers:
        key_path = path.join('gitian', signers[keyid]['key'] + '-key.pgp')
        popen = subprocess.Popen([gpg_path, '--status-fd', '1', '--homedir', gpg_dir, '--import', path.join(temp_dir, 'unpack', key_path)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        gpgout = popen.communicate(signers[keyid]['key'])[0]
        if popen.wait() != 0:
            print>>sys.stderr, 'Key %s failed to import'%(keyid)
            continue
        expected_keyid = keyid
        if signers[keyid].has_key('keyid'):
            expected_keyid = signers[keyid]['keyid']
        if gpgout.count(expected_keyid) == 0:
            print>>sys.stderr, 'Key file %s did not contain the key %s'%(key_path, keyid)
        if gpgout.count('IMPORT_OK') != 1 and quiet <= 1:
            print>>sys.stderr, 'Key file %s contained more than one key'%(key_path)

def check_assertions(config, assertions):
    total_weight = 0
    signers = config['signers']
    if quiet == 0:
        print 'Signatures from:'
    for key in assertions['build']:
        if not signers.has_key(key):
            if quiet <= 1:
                print>>sys.stderr, 'key %s is not in config, skipping'%(key)
            continue
        if quiet == 0:
            print '    %s : weight %d'%(signers[key]['name'], signers[key]['weight'])
        total_weight += signers[key]['weight']
    if total_weight < config['minimum_weight']:
        print>>sys.stderr, "The total weight of signatures is %d, which is less than the minimum required %d"%(total_weight, config['minimum_weight'])
        return None
    return total_weight


class OrderedDictYAMLLoader(yaml.Loader):
    """
    A YAML loader that loads ordered yaml maps into a dictionary.
    """

    def __init__(self, *args, **kwargs):
        yaml.Loader.__init__(self, *args, **kwargs)

        self.add_constructor(u'!omap', type(self).construct_yaml_map)

    def construct_yaml_map(self, node):
        data = dict()
        yield data
        for mapping in node.value:
            for key, value in mapping.value:
                key = self.construct_object(key)
                value = self.construct_object(value)
                data[key] = value

def run():
    full_prog = sys.argv[0]

    prog = os.path.basename(full_prog)

    parser = argparse.ArgumentParser(description='Download a verify a gitian package')
    parser.add_argument('-u', '--url', metavar='URL', type=str, nargs='+', required=False,
                       help='one or more URLs where the package can be found')
    parser.add_argument('-c', '--config', metavar='CONF', type=str, required=not have_injected_config,
                       help='a configuration file')
    parser.add_argument('-d', '--dest', metavar='DEST', type=str, required=False,
                       help='the destination directory for unpacking')
    parser.add_argument('-q', '--quiet', action='append_const', const=1, default=[], help='be quiet')
    parser.add_argument('-f', '--force', action='store_true', help='force downgrades and such')
    parser.add_argument('-n', '--dryrun', action='store_true', help='do not actually copy to destination')
    parser.add_argument('-m', '--customize', metavar='OUTPUT', type=str, help='generate a customized version of the script with the given config')
    parser.add_argument('-w', '--wait', type=float, metavar='HOURS', help='observe a waiting period or use zero for no waiting')
    parser.add_argument('-g', '--gpg', metavar='GPG', type=str, help='path to GnuPG')
    parser.add_argument('-p', '--post', metavar='COMMAND', type=str, help='Run after a successful install')

    args = parser.parse_args()

    quiet = len(args.quiet)

    if args.config:
        f = file(args.config, 'r')
        if args.customize:
            s = file(full_prog, 'r')
            script = s.read()
            s.close()
            config = f.read()
            script = script.replace(inject_config_string, config)
            s = file(args.customize, 'w')
            s.write(script)
            s.close()
            os.chmod(args.customize, 0750)
            sys.exit(0)

        config = yaml.safe_load(f)
        f.close()
    else:
        config = yaml.safe_load(injected_config)

    dest_path = args.dest

    if not dest_path:
        parser.error('argument -d/--dest is required unless -m is specified')

    if args.wait is not None:
        config['waiting_period'] = args.wait


    gpg_path = args.gpg

    if not gpg_path:
        gpg_path = 'gpg'

    rsses = []

    if args.url:
        urls = [{ 'url' : url, 'version_url' : None} for url in args.url]
    else:
        urls = config.get('urls')
        if not urls:
            parser.error('argument -u/--url is required since config does not specify it')
        if config.has_key('rss'):
            rsses = config['rss']

    # TODO: rss, atom, etc.

    old_manifest = None

    if path.exists(dest_path):
        files = os.listdir(dest_path)
        if path.dirname(full_prog) == dest_path:
            files.remove(prog)

        if not files.count('.gitian-manifest') and len(files) > 0:
            print>>sys.stderr, "destination already exists, no .gitian-manifest and directory not empty. Please empty destination."
            sys.exit(1)
        f = file(os.path.join(dest_path,'.gitian-manifest'), 'r')
        old_manifest = yaml.load(f, OrderedDictYAMLLoader)
        f.close()

    if config.get('waiting_period', 0) > 0:
        waiting_file = path.join(dest_path, '.gitian-waiting')
        if path.exists(waiting_file):
            f = file(waiting_file, 'r')
            waiting = yaml.load(f)
            f.close()
            wait_start = waiting['time']
            out_manifest = waiting['out_manifest']
            waiting_path = waiting['waiting_path']
            wait_time = wait_start + config['waiting_period'] * 3600 - time.time()
            if wait_time > 0:
                print>>sys.stderr, "Waiting another %.2f hours before applying update in %s"%(wait_time / 3600, waiting_path)
                sys.exit(100)
            os.remove(waiting_file)
            if args.dryrun:
                print>>sys.stderr, "Dry run, not copying"
            else:
                copy_to_destination(path.join(waiting_path, 'unpack'), dest_path, out_manifest, old_manifest)
                if args.post:
                    os.system(args.post)
                if quiet == 0:
                    print>>sys.stderr, "Copied from waiting area to destination"
            shutil.rmtree(waiting_path)
            sys.exit(0)

    temp_dir = tempfile.mkdtemp('', prog)

    atexit.register(remove_temp, temp_dir)

    package_file = path.join(temp_dir, 'package')

    downloaded = False
    checked = False

    if rsses:
        import libxml2
        for rss in rsses:
            try:
                feed = libxml2.parseDoc(urllib2.urlopen(rss['url']).read())
                url = None
                release = None

                # Find the first matching node
                for node in feed.xpathEval(rss['xpath']):
                    m = re.search(rss['pattern'], str(node))
                    if m:
                        if len(m.groups()) > 0:
                            release = m.group(1)
                        url = str(node)
                        break

                # Make sure it's a new release
                if old_manifest and release == old_manifest['release'] and not args.force:
                    checked = True
                else:
                    try:
                        download(url, package_file)
                        downloaded = True
                        break
                    except:
                        print>>sys.stderr, "could not download from %s, trying next rss"%(url)
                        pass
            except:
                print>>sys.stderr, "could read not from rss %s"%(rss)
                pass

    if not downloaded:
        for url in urls:
            try:
                release = None
                if url['version_url']:
                    f = urllib2.urlopen(url['version_url'])
                    release = f.read(100).strip()
                    f.close()
                if old_manifest and release == old_manifest['release'] and not args.force:
                    checked = True
                else:
                    download(url['url'], package_file)
                    downloaded = True
            except:
                print>>sys.stderr, "could not download from %s, trying next url"%(url)
                raise

    if not downloaded:
        if checked:
            if quiet == 0:
                print>>sys.stderr, "same release, not downloading"
        else:
            print>>sys.stderr, "out of places to try downloading from, try later"
        sys.exit(2)

    unpack_dir = path.join(temp_dir, 'unpack')
    files = extract(unpack_dir, package_file)

    import_keys(gpg_path, temp_dir, config)

    (success, assertions, out_manifest) = get_assertions(gpg_path, temp_dir, unpack_dir, files)

    if old_manifest:
        check_name_and_version(out_manifest, old_manifest)

    if not success and quiet <= 1:
        print>>sys.stderr, "There were errors getting assertions"

    total_weight = check_assertions(config, assertions)
    if total_weight is None:
        print>>sys.stderr, "There were errors checking assertions, build is untrusted, aborting"
        sys.exit(5)

    if quiet == 0:
        print>>sys.stderr, "Successful with signature weight %d"%(total_weight)

    if config.get('waiting_period', 0) > 0 and path.exists(dest_path):
        waiting_path = tempfile.mkdtemp('', prog)
        shutil.copytree(unpack_dir, path.join(waiting_path, 'unpack'))
        f = file(path.join(dest_path, '.gitian-waiting'), 'w')
        yaml.dump({'time': time.time(), 'out_manifest': out_manifest, 'waiting_path': waiting_path}, f)
        f.close()
        if quiet == 0:
            print>>sys.stderr, "Started waiting period"
    else:
        if args.dryrun:
            print>>sys.stderr, "Dry run, not copying"
        else:
            copy_to_destination(unpack_dir, dest_path, out_manifest, old_manifest)


    if args.post:
        os.system(args.post)


if __name__ == '__main__':
    run()
