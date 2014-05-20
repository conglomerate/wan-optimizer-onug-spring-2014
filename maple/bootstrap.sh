#!/usr/bin/env bash
sudo apt-get update
sudo apt-get install -y python-software-properties
sudo add-apt-repository -y ppa:webupd8team/java
sudo add-apt-repository -y ppa:chris-lea/node.js
sudo apt-get update
echo debconf shared/accepted-oracle-license-v1-1 select true | sudo debconf-set-selections
echo debconf shared/accepted-oracle-license-v1-1 seen true | sudo debconf-set-selections
sudo apt-get install -y oracle-java7-installer
sudo cp /vagrant/java-x86-64.conf /etc/ld.so.conf.d/
sudo ldconfig
sudo apt-get install -y libsqlite3-dev
sudo apt-get install -y ia32-libs
sudo apt-get install -y nodejs
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo /etc/init.d/mongod start
sudo apt-get install -y git
printf "\nHost github.com\n\tStrictHostKeyChecking no\n\tUserKnownHostsFile=/dev/null\n" | sudo tee -a /etc/ssh/ssh_config
git clone git@github.com:lmammino/cube-daemons.git && cd cube-daemons && sudo ./install.sh
sudo apt-get install -y ant
cd /vagrant/aksusbd-2.2.1-i386 && sudo ./dinst
mkdir -p /home/vagrant/.maple
cp -r /vagrant/web /home/vagrant/.maple/
cp -r /vagrant/lib /home/vagrant/.maple/
cp -r /vagrant/javadocs /home/vagrant/.maple/
sudo chown -R vagrant:vagrant /home/vagrant/.maple
sudo chown -R vagrant:vagrant /home/vagrant/cube-daemons
printf "\nPATH=/home/vagrant/.maple/lib:$PATH\n" >> /home/vagrant/.profile

