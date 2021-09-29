$script = <<SCRIPT
#!/bin/bash

set -eu

sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y autoconf2.13 automake build-essential bsdmainutils faketime g++ g++-mingw-w64 git libqt4-dev libtool libz-dev mingw-w64 nsis pciutils pkg-config psmisc subversion unzip zip

echo "ok"

SCRIPT

archs = ["amd64", "i386"]
ubuntu_suites = ["precise", "quantal", "raring", "saucy", "trusty", "xenial", "bionic"]
debian_suites = ["jessie", "stretch"]

if ARGV[0] == "up" and ARGV.length == 1
  puts "Specify a name of the form 'suite-architecture'"
  puts "  ubuntu suites: " + ubuntu_suites.join(', ')
  puts "  debian suites (x86_64 only): " + debian_suites.join(', ')
  puts "  architectures: " + archs.join(', ')
  Process.exit 1
end

# vagrant 1.9.1 (Ubuntu 17.10) compat
if Vagrant::DEFAULT_SERVER_URL =~ /hashicorp/
    Vagrant::DEFAULT_SERVER_URL.replace('https://vagrantcloud.com')
end

Vagrant.configure("2") do |config|
  config.vm.provision "shell", inline: $script
  config.vm.network :forwarded_port, id: "ssh", guest: 22, host: 2223

  debian_suites.each do |suite|
    name = "#{suite}-amd64"
    box = "debian/#{suite}64"

    config.vm.define name do |config|
      config.vm.box = box
      config.vm.provider :virtualbox do |vb|
        vb.name = "Gitian-#{name}"
      end
    end
  end

  ubuntu_suites.each do |suite|
    archs.each do |arch|
      name = "#{suite}-#{arch}"

      config.vm.define name do |config|
        config.vm.box = name
        config.vm.box_url = "https://cloud-images.ubuntu.com/#{suite}/current/#{suite}-server-cloudimg-#{arch}-vagrant.box"
        config.vm.provider :virtualbox do |vb|
          vb.name = "Gitian-#{name}"
        end
      end
    end
  end

  config.vm.provider :virtualbox do |vb|
    vb.memory = 4096
  end
end
