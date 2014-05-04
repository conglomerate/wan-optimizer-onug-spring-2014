#!/usr/bin/python
import re
import sys

# Mininet imports
from mininet.log import lg, info, error, debug, output
from mininet.util import quietRun
from mininet.node import  Host, OVSSwitch, RemoteController
from mininet.cli import CLI
from mininet.net import Mininet

def start(ip="127.0.0.1",port=6633):

    ctrlr = lambda n: RemoteController(n, 
                                       defaultIP=ip,
                                       port=port, 
                                       inNamespace=False)
    net = Mininet(switch=OVSSwitch, controller=ctrlr)
    c1 = net.addController('c1')

    ####### End of static Mininet prologue ######

    eth1, ip1 = '00:00:00:00:00:01', '192.168.0.1'
    eth2, ip2 = '00:00:00:00:00:02', '192.168.0.2'
    eth3, ip3 = '00:00:00:00:00:03', '192.168.0.3'
    eth4, ip4 = '00:00:00:00:00:04', '192.168.0.4'
    eth5, ip5 = '00:00:00:00:00:05', '192.168.0.5'
    eth6, ip6 = '00:00:00:00:00:06', '192.168.0.6'
    eth7, ip7 = '00:00:00:00:00:07', '192.168.0.7'
    eth8, ip8 = '00:00:00:00:00:08', '192.168.0.8'

    h1 = net.addHost('h1', mac=eth1, ip=ip1)
    h2 = net.addHost('h2', mac=eth2, ip=ip2)
    h3 = net.addHost('h3', mac=eth3, ip=ip3)
    h4 = net.addHost('h4', mac=eth4, ip=ip4)
    h5 = net.addHost('h5', mac=eth5, ip=ip5)
    h6 = net.addHost('h6', mac=eth6, ip=ip6)
    h7 = net.addHost('h7', mac=eth7, ip=ip7)
    h8 = net.addHost('h8', mac=eth8, ip=ip8)

    s1 = net.addSwitch('s1')
    pe1 = net.addSwitch('pe1')

    net.addLink(h1, s1, 0, 2)
    net.addLink(h2, s1, 0, 3)
    net.addLink(s1, pe1, 1, 1)

    s2 = net.addSwitch('s2')
    pe2 = net.addSwitch('pe2')

    net.addLink(h3, s2, 0, 2)
    net.addLink(h4, s2, 0, 3)
    net.addLink(s2, pe2, 1, 1)

    s3 = net.addSwitch('s3')
    pe3 = net.addSwitch('pe3')

    net.addLink(h5, s3, 0, 2)
    net.addLink(h6, s3, 0, 3)
    net.addLink(h7, s3, 0, 4)
    net.addLink(h8, s3, 0, 5)
    net.addLink(s3, pe3, 1, 1)

    net.addLink(pe1, pe3, 2, 2)

    net.addLink(pe2, pe3, 2, 4)

    ###### Start of static Mininet epilogue ######
    # Set up logging etc.
    lg.setLogLevel('info')
    lg.setLogLevel('output')

    # Start the network and prime other ARP caches
    net.start()

    # Enter CLI mode
    output("Network ready\n")
    output("Press Ctrl-d or type exit to quit\n")
    CLI(net)
    net.stop()

start()

